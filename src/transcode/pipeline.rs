use std::collections::VecDeque;
use std::path::Path;
use std::process::Stdio;
use std::sync::{Arc, Mutex};

use anyhow::{Context, Result, anyhow};
use bytes::Bytes;
use futures_util::{Stream, StreamExt};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};

use super::captions::ID3_PID;
use super::encoder::{EncoderSetup, SEGMENT_SECONDS};
use super::input::InputRewriter;
use super::profile::{AudioTrack, Codec, Quality};

pub const MEDIA_PLAYLIST: &str = "media.m3u8";
/// 録画もライブと同じく master から再生させる。Media3（TV アプリ）は master に CODECS が無いと、ID3 のトラックを用意しない。
pub const MASTER_PLAYLIST: &str = "master.m3u8";
const STDERR_TAIL_LINES: usize = 20;
/// 12 秒あれば一時的な回線の詰まりでも、プレイヤーが要求するセグメントが消えない。
const LIVE_PLAYLIST_SEGMENTS: u32 = 12;
/// 録画を 1 秒ごとに切ると 1 時間で 3600 ファイルになる。キーフレームは 1 秒ごとなので、4 秒ずつまとめて切る。
const RECORDING_SEGMENT_SECONDS: u32 = 4;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Hls {
    /// 古いセグメントを消しながら、直近の分だけをプレイリストに残す。
    Live,
    /// すべてのセグメントを残し、書き終えたらプレイリストを閉じる。
    Recording,
}

pub struct Job<'a> {
    pub setup: &'a EncoderSetup,
    pub codec: Codec,
    pub quality: Quality,
    pub audio: AudioTrack,
    pub dir: &'a Path,
    pub hls: Hls,
}

pub enum Outcome {
    /// 入力を最後まで変換し終えた。
    Finished,
    Cancelled,
}

/// 変換した 1 本のメディアプレイリストだけを並べた master プレイリスト。
pub fn master_playlist(codec: Codec, quality: Quality, media_uri: &str) -> String {
    let spec = quality.spec(codec);
    let bandwidth = (spec.video_kbps * 3 / 2 + spec.audio_kbps) * 1000;
    format!(
        "#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-INDEPENDENT-SEGMENTS\n\
         #EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={}x{},CODECS=\"{},mp4a.40.2\"\n{media_uri}\n",
        spec.width, spec.height, spec.codecs,
    )
}

/// 放送の TS を字幕入りの HLS に変換し、`job.dir` に書き出す。
pub async fn run<S>(job: &Job<'_>, input: S, cancel: impl Future<Output = ()>) -> Result<Outcome>
where
    S: Stream<Item = Result<Bytes>> + Send + Unpin + 'static,
{
    let mut child = spawn_ffmpeg(job)?;
    let mut stdin = child.stdin.take().context("ffmpeg stdin is unavailable")?;
    let tail = Arc::new(Mutex::new(VecDeque::with_capacity(STDERR_TAIL_LINES)));
    let stderr = child.stderr.take().context("ffmpeg stderr is unavailable")?;
    let mut stderr_tasks = vec![tokio::spawn(collect_stderr(stderr, tail.clone()))];

    let mut remux = if job.setup.encoder.needs_remux(job.codec) {
        let stdout = child.stdout.take().context("ffmpeg stdout is unavailable")?;
        let mut remux = spawn_remux(job, stdout.try_into()?)?;
        let stderr = remux.stderr.take().context("ffmpeg stderr is unavailable")?;
        stderr_tasks.push(tokio::spawn(collect_stderr(stderr, tail.clone())));
        Some(remux)
    } else {
        None
    };

    let mut rewriter = InputRewriter::new(job.audio);
    let mut input = input;
    // 入力を読み終えると stdin を閉じ、ffmpeg に終わりを伝える。
    let mut pipe_task = tokio::spawn(async move {
        let mut rewritten = Vec::new();
        while let Some(chunk) = input.next().await {
            let chunk = chunk?;
            rewritten.clear();
            rewriter.push(&chunk, &mut rewritten);
            stdin.write_all(&rewritten).await.context("failed to write to ffmpeg")?;
        }
        anyhow::Ok(())
    });

    tokio::pin!(cancel);
    let mut input_done = false;
    let mut encoder_done = false;
    let result = loop {
        tokio::select! {
            () = &mut cancel => break Ok(Outcome::Cancelled),
            r = &mut pipe_task, if !input_done => match r {
                Ok(Ok(())) => input_done = true,
                Ok(Err(e)) => break Err(e),
                Err(e) => break Err(anyhow!("stream pipe task failed: {e}")),
            },
            status = child.wait(), if !encoder_done => {
                if !(input_done && status.as_ref().is_ok_and(std::process::ExitStatus::success)) {
                    break Err(exit_error(status));
                }
                encoder_done = true;
                if remux.is_none() {
                    break Ok(Outcome::Finished);
                }
            },
            status = wait_optional(remux.as_mut()) => {
                if !(encoder_done && status.as_ref().is_ok_and(std::process::ExitStatus::success)) {
                    break Err(exit_error(status));
                }
                break Ok(Outcome::Finished);
            },
        }
    };

    pipe_task.abort();
    stop_child(&mut child).await;
    if let Some(remux) = remux.as_mut() {
        stop_child(remux).await;
    }
    for task in stderr_tasks {
        task.abort();
    }

    result.map_err(|e| {
        let tail = tail.lock().unwrap();
        if tail.is_empty() {
            e
        } else {
            e.context(tail.iter().cloned().collect::<Vec<_>>().join("\n"))
        }
    })
}

fn spawn_ffmpeg(job: &Job<'_>) -> Result<Child> {
    let spec = job.quality.spec(job.codec);
    let setup = job.setup;
    let mut cmd = Command::new(&setup.ffmpeg);
    cmd.current_dir(job.dir)
        .args(["-hide_banner", "-loglevel", "warning", "-nostats"])
        .args(setup.encoder.global_args())
        // 放送 TS のデータカルーセルはほとんどパケットが来ず、解析は probesize を使い切るまで終わらない。
        // 1MB を下回ると映像のパラメーターを取りこぼすことがある。
        .args([
            "-fflags",
            "+discardcorrupt+genpts",
            "-analyzeduration",
            "500000",
            "-probesize",
            "1000000",
        ])
        .args(["-f", "mpegts", "-i", "pipe:0"])
        .args([
            "-map",
            "0:v:0",
            "-map",
            "0:a:0?",
            "-map",
            &format!("0:i:{ID3_PID:#x}?"),
            "-sn",
        ])
        .args(setup.encoder.video_args(job.codec, job.quality))
        // 放送の音声は番組の切り替わりでチャンネル数や途切れが生じるため、ステレオに揃えて隙間を埋める。
        .args(["-af", "aresample=async=1", "-c:a", "aac", "-ac", "2", "-ar", "48000"])
        // 字幕の ID3 はそのまま通し、fMP4 では emsg に入れさせる。
        .args(["-c:d", "copy"])
        .args(["-b:a", &format!("{}k", spec.audio_kbps)])
        .args(["-max_muxing_queue_size", "1024"])
        .stdin(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    if setup.encoder.needs_remux(job.codec) {
        // mpegts は可変フレームレートを許すため、hls と違って最初の映像フレームが複製されず、映像が音声より遅れて始まる。
        // その差は fMP4 の edit list になるが、ブラウザーは無視するので映像が先行して再生される。
        cmd.args(["-fps_mode", "cfr", "-f", "mpegts", "pipe:1"])
            .stdout(Stdio::piped());
    } else {
        cmd.args(hls_args(job)).stdout(Stdio::null());
    }
    cmd.spawn()
        .with_context(|| format!("failed to spawn {}", setup.ffmpeg.display()))
}

fn spawn_remux(job: &Job<'_>, input: Stdio) -> Result<Child> {
    let mut cmd = Command::new(&job.setup.ffmpeg);
    cmd.current_dir(job.dir)
        .args(["-hide_banner", "-loglevel", "warning", "-nostats"])
        // 放送のキーフレームが届くまで映像は出力されないため、0.5 秒では映像の解像度を取りこぼす。
        // 既定の 5 秒では配信開始が 1.5 秒ほど遅れる。
        .args(["-analyzeduration", "2000000", "-f", "mpegts", "-i", "pipe:0"])
        .args(["-map", "0", "-c", "copy", "-bsf:a", "aac_adtstoasc"])
        .args(hls_args(job))
        .stdin(input)
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    cmd.spawn()
        .with_context(|| format!("failed to spawn {}", job.setup.ffmpeg.display()))
}

fn hls_args(job: &Job<'_>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    if job.codec == Codec::Hevc {
        // Safari は hev1 タグの HEVC を再生できない。
        out.extend(["-tag:v", "hvc1"].map(str::to_owned));
    }
    let (segment_seconds, hls_options) = match job.hls {
        Hls::Live => (
            SEGMENT_SECONDS,
            vec![
                "-hls_list_size".to_owned(),
                LIVE_PLAYLIST_SEGMENTS.to_string(),
                "-hls_flags".to_owned(),
                "delete_segments+independent_segments".to_owned(),
            ],
        ),
        // event は書いた分のプレイリストを都度書き出し、最後に終わりの印を付ける。
        Hls::Recording => (
            RECORDING_SEGMENT_SECONDS,
            vec![
                "-hls_list_size".to_owned(),
                "0".to_owned(),
                "-hls_playlist_type".to_owned(),
                "event".to_owned(),
                "-hls_flags".to_owned(),
                "independent_segments".to_owned(),
            ],
        ),
    };
    out.extend([
        "-f".to_owned(),
        "hls".to_owned(),
        "-hls_time".to_owned(),
        segment_seconds.to_string(),
    ]);
    out.extend(hls_options);
    out.extend(
        [
            "-hls_segment_type",
            "fmp4",
            "-hls_fmp4_init_filename",
            "init.mp4",
            "-hls_segment_filename",
            "seg_%06d.m4s",
            MEDIA_PLAYLIST,
        ]
        .map(str::to_owned),
    );
    out
}

async fn wait_optional(child: Option<&mut Child>) -> std::io::Result<std::process::ExitStatus> {
    match child {
        Some(child) => child.wait().await,
        None => std::future::pending().await,
    }
}

fn exit_error(status: std::io::Result<std::process::ExitStatus>) -> anyhow::Error {
    anyhow!(
        "ffmpeg exited with {}",
        status.map_or_else(|e| e.to_string(), |s| s.to_string())
    )
}

async fn stop_child(child: &mut Child) {
    if let Err(e) = child.kill().await {
        tracing::debug!("failed to kill ffmpeg: {e}");
    }
}

async fn collect_stderr(stderr: tokio::process::ChildStderr, tail: Arc<Mutex<VecDeque<String>>>) {
    let mut lines = BufReader::new(stderr).lines();
    while let Ok(Some(line)) = lines.next_line().await {
        tracing::debug!(target: "ffmpeg", "{line}");
        let mut tail = tail.lock().unwrap();
        if tail.len() == STDERR_TAIL_LINES {
            tail.pop_front();
        }
        tail.push_back(line);
    }
}
