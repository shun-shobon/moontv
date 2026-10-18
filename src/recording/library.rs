use std::collections::{BTreeMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use anyhow::{Context, Result, bail};
use bytes::Bytes;
use serde::{Deserialize, Serialize};
use tokio::io::AsyncReadExt;
use tokio::sync::mpsc;

use crate::catalog::{self, ProgramDto};
use crate::mirakc::{Program, RecordingSchedule, ScheduleState};
use crate::transcode::encoder::EncoderSetup;
use crate::transcode::pipeline::{self, Hls, Job, MEDIA_PLAYLIST};
use crate::transcode::profile::{AudioTrack, Codec, Quality};

const META_FILE: &str = "meta.json";
const MEDIA_DIR: &str = "media";
const READ_CHUNK: usize = 1 << 20;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RecordingState {
    Recording,
    Converting,
    Ready,
    Failed,
}

/// 番組情報は録画が始まった時点で控える。mirakc は終わった予約をいずれ消し、録画を途中で止めた予約はすぐ消すため。
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Meta {
    program: Program,
    /// mirakc の `recording.basedir` からの相対パス。
    content_path: PathBuf,
    state: RecordingState,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    duration_ms: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingDto {
    pub program: ProgramDto,
    pub state: RecordingState,
    pub error: Option<String>,
    pub duration_ms: Option<u64>,
}

pub enum DeleteError {
    NotFound,
    /// 録画中・変換中のものは、書き込みの途中でファイルを消すことになるので消させない。
    Busy,
    Other(anyhow::Error),
}

/// mirakc が録画した TS を HLS に変換して保存し、一覧を管理する。
pub struct Library {
    dir: PathBuf,
    source_dir: PathBuf,
    setup: EncoderSetup,
    entries: Mutex<BTreeMap<u64, Meta>>,
    queue: mpsc::UnboundedSender<u64>,
}

impl Library {
    pub async fn open(dir: PathBuf, source_dir: PathBuf, setup: EncoderSetup) -> Result<Arc<Self>> {
        tokio::fs::create_dir_all(&dir)
            .await
            .with_context(|| format!("failed to create {}", dir.display()))?;
        let entries = load(&dir).await?;
        let (queue, rx) = mpsc::unbounded_channel();
        let library = Arc::new(Self {
            dir,
            source_dir,
            setup,
            entries: Mutex::new(entries),
            queue,
        });
        // 変換の途中で止まったものはやり直す。
        let unfinished: Vec<_> = library
            .entries
            .lock()
            .unwrap()
            .iter()
            .filter(|(_, m)| m.state == RecordingState::Converting)
            .map(|(&id, _)| id)
            .collect();
        for id in unfinished {
            library.enqueue(id);
        }
        tokio::spawn(library.clone().convert_all(rx));
        Ok(library)
    }

    pub fn list(&self) -> Vec<RecordingDto> {
        let entries = self.entries.lock().unwrap();
        let mut list: Vec<_> = entries
            .values()
            .map(|m| RecordingDto {
                program: catalog::to_dto(&m.program),
                state: m.state,
                error: m.error.clone(),
                duration_ms: m.duration_ms,
            })
            .collect();
        drop(entries);
        list.sort_by_key(|r| std::cmp::Reverse(r.program.start_at));
        list
    }

    pub async fn record_started(&self, schedule: RecordingSchedule) {
        let id = schedule.program.id;
        let meta = Meta {
            program: schedule.program,
            content_path: schedule.options.content_path,
            state: RecordingState::Recording,
            error: None,
            duration_ms: None,
        };
        {
            let mut entries = self.entries.lock().unwrap();
            if entries.contains_key(&id) {
                return;
            }
            entries.insert(id, meta.clone());
        }
        tracing::info!(program_id = id, "recording started");
        self.save(id, &meta).await;
    }

    /// moontv が録画の開始を見逃していたときは、mirakc に残っている予約から番組情報を得る。
    pub async fn record_stopped(&self, id: u64, schedule: Option<RecordingSchedule>) {
        let known = self.entries.lock().unwrap().get(&id).cloned();
        let mut meta = match (known, schedule) {
            (Some(meta), _) if meta.state != RecordingState::Recording => return,
            (Some(meta), _) => meta,
            (None, Some(schedule)) => Meta {
                program: schedule.program,
                content_path: schedule.options.content_path,
                state: RecordingState::Recording,
                error: None,
                duration_ms: None,
            },
            (None, None) => {
                tracing::warn!(program_id = id, "recording stopped but its program is unknown");
                return;
            }
        };
        if tokio::fs::try_exists(self.source_dir.join(&meta.content_path))
            .await
            .unwrap_or(false)
        {
            meta.state = RecordingState::Converting;
        } else {
            meta.state = RecordingState::Failed;
            meta.error = Some("the recorded file is missing".to_owned());
        }
        tracing::info!(program_id = id, state = ?meta.state, "recording stopped");
        self.entries.lock().unwrap().insert(id, meta.clone());
        self.save(id, &meta).await;
        if meta.state == RecordingState::Converting {
            self.enqueue(id);
        }
    }

    /// mirakc の予約と突き合わせ、moontv が止まっていた間の録画の開始・終了を取り込む。
    pub async fn reconcile(&self, schedules: Vec<RecordingSchedule>) {
        let recording: HashSet<u64> = schedules
            .iter()
            .filter(|s| s.state == ScheduleState::Recording)
            .map(|s| s.program.id)
            .collect();
        let stale: Vec<u64> = self
            .entries
            .lock()
            .unwrap()
            .iter()
            .filter(|(id, m)| m.state == RecordingState::Recording && !recording.contains(id))
            .map(|(&id, _)| id)
            .collect();
        for schedule in schedules {
            match schedule.state {
                ScheduleState::Recording => self.record_started(schedule).await,
                // 録画ファイルが無いものは、一覧から削除した録画か、録画を始められなかった予約なので取り込まない。
                ScheduleState::Finished | ScheduleState::Failed => {
                    let id = schedule.program.id;
                    let known = self.entries.lock().unwrap().contains_key(&id);
                    let source = self.source_dir.join(&schedule.options.content_path);
                    if !known && tokio::fs::try_exists(&source).await.unwrap_or(false) {
                        self.record_stopped(id, Some(schedule)).await;
                    }
                }
                ScheduleState::Scheduled | ScheduleState::Tracking | ScheduleState::Rescheduling => {}
            }
        }
        for id in stale {
            self.record_stopped(id, None).await;
        }
    }

    pub async fn delete(&self, id: u64) -> Result<(), DeleteError> {
        let meta = {
            let mut entries = self.entries.lock().unwrap();
            match entries.get(&id).map(|m| m.state) {
                None => return Err(DeleteError::NotFound),
                Some(RecordingState::Recording | RecordingState::Converting) => return Err(DeleteError::Busy),
                Some(RecordingState::Ready | RecordingState::Failed) => entries.remove(&id).unwrap(),
            }
        };
        tracing::info!(program_id = id, "deleting recording");
        remove_file_if_exists(&self.source_dir.join(&meta.content_path))
            .await
            .map_err(DeleteError::Other)?;
        tokio::fs::remove_dir_all(self.dir.join(id.to_string()))
            .await
            .context("failed to remove the recording directory")
            .map_err(DeleteError::Other)
    }

    fn enqueue(&self, id: u64) {
        // 受け手は Library が生きている間ずっと動いているので、送れないことはない。
        let _ = self.queue.send(id);
    }

    async fn convert_all(self: Arc<Self>, mut rx: mpsc::UnboundedReceiver<u64>) {
        while let Some(id) = rx.recv().await {
            let Some(meta) = self.entries.lock().unwrap().get(&id).cloned() else {
                continue;
            };
            tracing::info!(program_id = id, "converting recording");
            let source = self.source_dir.join(&meta.content_path);
            let result = self.convert(id, &source).await;
            let mut meta = meta;
            match result {
                Ok(duration_ms) => {
                    meta.state = RecordingState::Ready;
                    meta.duration_ms = Some(duration_ms);
                    tracing::info!(program_id = id, "converted recording");
                    if let Err(e) = remove_file_if_exists(&source).await {
                        tracing::warn!(program_id = id, "failed to remove the recorded file: {e:#}");
                    }
                }
                Err(e) => {
                    tracing::warn!(program_id = id, "failed to convert recording: {e:#}");
                    meta.state = RecordingState::Failed;
                    meta.error = Some(format!("{e:#}"));
                }
            }
            self.entries.lock().unwrap().insert(id, meta.clone());
            self.save(id, &meta).await;
        }
    }

    /// 変換した長さをミリ秒で返す。
    async fn convert(&self, id: u64, source: &Path) -> Result<u64> {
        let media = self.dir.join(id.to_string()).join(MEDIA_DIR);
        if tokio::fs::try_exists(&media).await.unwrap_or(false) {
            tokio::fs::remove_dir_all(&media)
                .await
                .context("failed to clear the previous output")?;
        }
        tokio::fs::create_dir_all(&media)
            .await
            .context("failed to create the output directory")?;
        let file = tokio::fs::File::open(source)
            .await
            .with_context(|| format!("failed to open {}", source.display()))?;
        let job = Job {
            setup: &self.setup,
            codec: recording_codec(&self.setup),
            quality: Quality::P1080,
            audio: AudioTrack::Main,
            dir: &media,
            hls: Hls::Recording,
        };
        pipeline::run(&job, read_chunks(file), std::future::pending()).await?;
        let playlist = tokio::fs::read_to_string(media.join(MEDIA_PLAYLIST))
            .await
            .context("failed to read the converted playlist")?;
        Ok(playlist_duration_ms(&playlist))
    }

    async fn save(&self, id: u64, meta: &Meta) {
        if let Err(e) = write_meta(&self.dir.join(id.to_string()), meta).await {
            tracing::warn!(program_id = id, "failed to save recording metadata: {e:#}");
        }
    }
}

/// 録画は端末を問わず再生できるよう 1 種類だけ作る。HEVC は同じ画質で H.264 の 6 割ほどの容量で済む。
fn recording_codec(setup: &EncoderSetup) -> Codec {
    if setup.codecs.contains(&Codec::Hevc) {
        Codec::Hevc
    } else {
        Codec::H264
    }
}

fn read_chunks(file: tokio::fs::File) -> impl futures_util::Stream<Item = Result<Bytes>> + Send + Unpin + 'static {
    Box::pin(futures_util::stream::try_unfold(file, |mut file| async move {
        let mut buf = vec![0; READ_CHUNK];
        let n = file.read(&mut buf).await.context("failed to read the recorded file")?;
        if n == 0 {
            return Ok(None);
        }
        buf.truncate(n);
        Ok(Some((Bytes::from(buf), file)))
    }))
}

fn playlist_duration_ms(playlist: &str) -> u64 {
    let seconds: f64 = playlist
        .lines()
        .filter_map(|line| line.strip_prefix("#EXTINF:"))
        .filter_map(|rest| rest.split(',').next()?.parse::<f64>().ok())
        .sum();
    // 再生時間の表示に使うだけなので、ミリ秒未満の切り捨てと f64 の精度で困らない。
    #[expect(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let ms = (seconds * 1000.0).round() as u64;
    ms
}

async fn load(dir: &Path) -> Result<BTreeMap<u64, Meta>> {
    let mut entries = BTreeMap::new();
    let mut read_dir = tokio::fs::read_dir(dir)
        .await
        .with_context(|| format!("failed to read {}", dir.display()))?;
    while let Some(entry) = read_dir.next_entry().await? {
        let Some(id) = entry.file_name().to_str().and_then(|name| name.parse::<u64>().ok()) else {
            continue;
        };
        match read_meta(&entry.path()).await {
            Ok(meta) => {
                entries.insert(id, meta);
            }
            Err(e) => tracing::warn!(path = %entry.path().display(), "skipping recording: {e:#}"),
        }
    }
    Ok(entries)
}

async fn read_meta(dir: &Path) -> Result<Meta> {
    let text = tokio::fs::read_to_string(dir.join(META_FILE)).await?;
    Ok(serde_json::from_str(&text)?)
}

/// 書きかけの meta.json を読まないよう、別名で書いてから置き換える。
async fn write_meta(dir: &Path, meta: &Meta) -> Result<()> {
    tokio::fs::create_dir_all(dir).await?;
    let tmp = dir.join(format!("{META_FILE}.tmp"));
    tokio::fs::write(&tmp, serde_json::to_vec_pretty(meta)?).await?;
    tokio::fs::rename(&tmp, dir.join(META_FILE)).await?;
    Ok(())
}

async fn remove_file_if_exists(path: &Path) -> Result<()> {
    match tokio::fs::remove_file(path).await {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => bail!("failed to remove {}: {e}", path.display()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sums_segment_durations() {
        let playlist = "#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXTINF:4.004000,\nseg_000000.m4s\n#EXTINF:1.501500,\nseg_000001.m4s\n#EXT-X-ENDLIST\n";
        assert_eq!(playlist_duration_ms(playlist), 5506);
    }
}
