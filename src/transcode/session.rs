use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use anyhow::{Context, Result, anyhow, bail};
use futures_util::StreamExt;
use tokio::sync::watch;
use tokio_util::sync::CancellationToken;

use super::encoder::EncoderSetup;
pub use super::pipeline::MEDIA_PLAYLIST;
use super::pipeline::{self, Hls, Job, Outcome};
use super::profile::{AudioTrack, Codec, Quality};
use crate::mirakc::ChannelInfo;

/// プレイヤーの再生開始時にバッファ不足で止まらないよう、2 セグメント揃ってから返す。
const READY_SEGMENTS: usize = 2;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct LiveKey {
    pub service_id: u64,
    pub codec: Codec,
    pub quality: Quality,
    pub audio: AudioTrack,
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

    pub fn viewers(&self) -> Vec<String> {
        self.viewers.lock().unwrap().keys().cloned().collect()
    }

    pub fn leave_and_check_empty(&self, viewer: &str) -> bool {
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

    let job = Job {
        setup,
        codec: session.key.codec,
        quality: session.key.quality,
        audio: session.key.audio,
        dir: &session.dir,
        hls: Hls::Live,
    };
    let input = stream
        .bytes_stream()
        .map(|chunk| chunk.context("failed to read the tuner stream"));
    let run = pipeline::run(&job, input, session.cancel.cancelled());
    tokio::pin!(run);
    let ready = watch_ready(session);
    tokio::pin!(ready);
    let mut is_ready = false;
    loop {
        tokio::select! {
            outcome = &mut run => return match outcome? {
                Outcome::Cancelled => Ok(()),
                Outcome::Finished => Err(anyhow!("the tuner stream ended")),
            },
            () = &mut ready, if !is_ready => is_ready = true,
        }
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
