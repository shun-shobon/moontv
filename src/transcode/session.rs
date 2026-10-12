use std::collections::{HashMap, VecDeque};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use anyhow::{Context, Result, anyhow, bail};
use futures_util::StreamExt;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::watch;
use tokio_util::sync::CancellationToken;

use super::encoder::{EncoderSetup, SEGMENT_SECONDS};
use super::profile::{Codec, Quality};
use crate::mirakc::ChannelInfo;

/// プレイヤーの再生開始時にバッファ不足で止まらないよう、2 セグメント揃ってから返す。
const READY_SEGMENTS: usize = 2;
/// 12 秒あれば一時的な回線の詰まりでも、プレイヤーが要求するセグメントが消えない。
const PLAYLIST_SEGMENTS: u32 = 12;
const STDERR_TAIL_LINES: usize = 20;

pub const MEDIA_PLAYLIST: &str = "media.m3u8";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct LiveKey {
    pub service_id: u64,
    pub codec: Codec,
    pub quality: Quality,
}

#[derive(Debug, Clone)]
pub enum State {
    Starting,
    Ready,
    Finished(String),
}

pub struct LiveSession {
    pub id: u64,
    pub key: LiveKey,
    pub channel: ChannelInfo,
    pub dir: PathBuf,
    state: watch::Sender<State>,
    viewers: Mutex<HashMap<String, Instant>>,
    cancel: CancellationToken,
}

impl LiveSession {
    pub fn new(id: u64, key: LiveKey, channel: ChannelInfo, dir: PathBuf) -> Self {
        Self {
            id,
            key,
            channel,
            dir,
            state: watch::Sender::new(State::Starting),
            viewers: Mutex::new(HashMap::new()),
            cancel: CancellationToken::new(),
        }
    }

    pub fn touch(&self, viewer: &str) {
        let mut viewers = self.viewers.lock().unwrap();
        viewers.insert(viewer.to_owned(), Instant::now());
    }

    /// 視聴者が残っていなければ true を返す。
    pub fn leave(&self, viewer: &str) -> bool {
        let mut viewers = self.viewers.lock().unwrap();
        viewers.remove(viewer);
        viewers.is_empty()
    }

    pub fn expire_viewers(&self, timeout: Duration) -> bool {
        let mut viewers = self.viewers.lock().unwrap();
        viewers.retain(|_, seen| seen.elapsed() < timeout);
        viewers.is_empty()
    }

    /// 停止要求を受けたセッションは終了処理中でも再利用しない。直後の再要求を新しいセッションで受けるため。
    pub fn is_live(&self) -> bool {
        !self.cancel.is_cancelled() && !matches!(*self.state.borrow(), State::Finished(_))
    }

    pub fn stop(&self) {
        self.cancel.cancel();
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancel.is_cancelled()
    }

    pub async fn wait_finished(&self) {
        let mut rx = self.state.subscribe();
        // 送信側は self が持っているので、ここでチャネルが閉じることはない。
        let _ = rx.wait_for(|s| matches!(s, State::Finished(_))).await;
    }

    pub async fn wait_ready(&self, timeout: Duration) -> Result<()> {
        let mut rx = self.state.subscribe();
        let wait = rx.wait_for(|s| !matches!(s, State::Starting));
        let state = tokio::time::timeout(timeout, wait)
            .await
            .map_err(|_| anyhow!("timed out waiting for the stream to start"))?
            .map_err(|_| anyhow!("session dropped"))?
            .clone();
        match state {
            State::Ready => Ok(()),
            State::Finished(reason) => bail!("{reason}"),
            State::Starting => unreachable!(),
        }
    }

    pub fn finish(&self, reason: String) {
        self.state.send_replace(State::Finished(reason));
    }
}

pub async fn run(session: Arc<LiveSession>, setup: EncoderSetup, stream: reqwest::Response) {
    let reason = match transcode(&session, &setup, stream).await {
        Ok(()) => "stopped".to_owned(),
        Err(e) => {
            tracing::warn!(key = ?session.key, "transcode failed: {e:#}");
            format!("{e:#}")
        }
    };
    session.finish(reason);
    if let Err(e) = tokio::fs::remove_dir_all(&session.dir).await {
        tracing::warn!(dir = %session.dir.display(), "failed to remove session directory: {e}");
    }
}

async fn transcode(session: &LiveSession, setup: &EncoderSetup, stream: reqwest::Response) -> Result<()> {
    tokio::fs::create_dir_all(&session.dir)
        .await
        .context("failed to create session directory")?;

    let mut child = spawn_ffmpeg(session, setup)?;
    let mut stdin = child.stdin.take().context("ffmpeg stdin is unavailable")?;
    let stderr = child.stderr.take().context("ffmpeg stderr is unavailable")?;

    let tail = Arc::new(Mutex::new(VecDeque::with_capacity(STDERR_TAIL_LINES)));
    let stderr_task = tokio::spawn(collect_stderr(stderr, tail.clone()));

    let mut pipe_task = tokio::spawn(async move {
        let mut body = stream.bytes_stream();
        while let Some(chunk) = body.next().await {
            let chunk = chunk.context("failed to read the tuner stream")?;
            stdin.write_all(&chunk).await.context("failed to write to ffmpeg")?;
        }
        anyhow::Ok(())
    });

    let ready = watch_ready(session);
    tokio::pin!(ready);
    let mut is_ready = false;
    let result = loop {
        tokio::select! {
            () = session.cancel.cancelled() => break Ok(()),
            r = &mut pipe_task => break match r {
                Ok(Ok(())) => Err(anyhow!("the tuner stream ended")),
                Ok(Err(e)) => Err(e),
                Err(e) => Err(anyhow!("stream pipe task failed: {e}")),
            },
            status = child.wait() => break Err(anyhow!(
                "ffmpeg exited with {}",
                status.map_or_else(|e| e.to_string(), |s| s.to_string())
            )),
            () = &mut ready, if !is_ready => is_ready = true,
        }
    };

    pipe_task.abort();
    stop_child(&mut child).await;
    stderr_task.abort();

    result.map_err(|e| {
        let tail = tail.lock().unwrap();
        if tail.is_empty() {
            e
        } else {
            e.context(tail.iter().cloned().collect::<Vec<_>>().join("\n"))
        }
    })
}

fn spawn_ffmpeg(session: &LiveSession, setup: &EncoderSetup) -> Result<Child> {
    let spec = session.key.quality.spec(session.key.codec);
    let mut cmd = Command::new(&setup.ffmpeg);
    cmd.current_dir(&session.dir)
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
        .args(["-map", "0:v:0", "-map", "0:a:0?", "-sn", "-dn"])
        .args(setup.encoder.video_args(session.key.codec, session.key.quality))
        // 放送の音声は番組の切り替わりでチャンネル数や途切れが生じるため、ステレオに揃えて隙間を埋める。
        .args(["-af", "aresample=async=1", "-c:a", "aac", "-ac", "2", "-ar", "48000"])
        .args(["-b:a", &format!("{}k", spec.audio_kbps)])
        .args(["-max_muxing_queue_size", "1024"])
        .args(["-f", "hls", "-hls_time", &SEGMENT_SECONDS.to_string()])
        .args(["-hls_list_size", &PLAYLIST_SEGMENTS.to_string()])
        .args(["-hls_flags", "delete_segments+independent_segments"])
        .args(["-hls_segment_type", "fmp4", "-hls_fmp4_init_filename", "init.mp4"])
        .args(["-hls_segment_filename", "seg_%06d.m4s", MEDIA_PLAYLIST])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    cmd.spawn()
        .with_context(|| format!("failed to spawn {}", setup.ffmpeg.display()))
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

async fn watch_ready(session: &LiveSession) {
    let playlist = session.dir.join(MEDIA_PLAYLIST);
    loop {
        if let Ok(text) = tokio::fs::read_to_string(&playlist).await
            && text.matches("#EXTINF").count() >= READY_SEGMENTS
        {
            session.state.send_replace(State::Ready);
            return;
        }
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
}
