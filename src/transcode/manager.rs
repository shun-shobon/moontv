use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use anyhow::{Result, anyhow};

use super::encoder::EncoderSetup;
use super::session::{self, LiveKey, LiveSession};
use crate::catalog::Catalog;
use crate::mirakc::{MirakcClient, OpenStreamError};

/// プレイヤーはセグメント長(1秒)ごとにプレイリストを取りに来るので、これだけ途絶えたら視聴終了とみなす。
const VIEWER_TIMEOUT: Duration = Duration::from_secs(20);
/// 他チャンネルのセッションを止めた後、mirakc がチューナーを解放するまで待つ上限。
const TUNER_RELEASE_WAIT: Duration = Duration::from_secs(8);

pub struct SessionManager {
    sessions: Mutex<HashMap<LiveKey, Arc<LiveSession>>>,
    root: PathBuf,
    setup: EncoderSetup,
    mirakc: MirakcClient,
    catalog: Arc<Catalog>,
    next_id: AtomicU64,
}

pub enum AcquireError {
    UnknownService,
    Other(anyhow::Error),
}

impl SessionManager {
    pub fn new(root: PathBuf, setup: EncoderSetup, mirakc: MirakcClient, catalog: Arc<Catalog>) -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            root,
            setup,
            mirakc,
            catalog,
            next_id: AtomicU64::new(0),
        }
    }

    pub fn setup(&self) -> &EncoderSetup {
        &self.setup
    }

    pub async fn acquire(self: &Arc<Self>, key: LiveKey, viewer: &str) -> Result<Arc<LiveSession>, AcquireError> {
        if let Some(session) = self.get(key, viewer) {
            return Ok(session);
        }

        let channel = self
            .catalog
            .service_channel(key.service_id)
            .await
            .map_err(AcquireError::Other)?
            .ok_or(AcquireError::UnknownService)?;

        let session = {
            let mut sessions = self.sessions.lock().unwrap();
            // チャンネル情報の取得中に他のリクエストが同じセッションを作っている場合がある。
            if let Some(existing) = sessions.get(&key).filter(|s| s.is_live()) {
                existing.touch(viewer);
                return Ok(existing.clone());
            }
            let id = self.next_id.fetch_add(1, Ordering::Relaxed);
            let dir = self.root.join(format!(
                "{}-{}-{}-{id}",
                key.service_id,
                key.codec.label(),
                key.quality.label()
            ));
            let session = Arc::new(LiveSession::new(key, channel, dir));
            session.touch(viewer);
            sessions.insert(key, session.clone());
            session
        };

        tracing::info!(?key, "starting live session");
        let manager = self.clone();
        let task_session = session.clone();
        tokio::spawn(async move {
            match manager.open_stream(&task_session).await {
                Ok(stream) => session::run(task_session.clone(), manager.setup.clone(), stream).await,
                Err(e) => {
                    tracing::warn!(?key, "failed to open stream: {e:#}");
                    task_session.finish(format!("{e:#}"));
                }
            }
            manager.remove(&task_session);
            tracing::info!(?key, "live session finished");
        });

        Ok(session)
    }

    pub fn get(&self, key: LiveKey, viewer: &str) -> Option<Arc<LiveSession>> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(&key).filter(|s| s.is_live())?;
        session.touch(viewer);
        Some(session.clone())
    }

    pub fn leave(&self, key: LiveKey, viewer: &str) {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(&key)
            && session.leave(viewer)
        {
            session.stop();
        }
    }

    async fn open_stream(&self, session: &LiveSession) -> Result<reqwest::Response> {
        let deadline = tokio::time::Instant::now() + TUNER_RELEASE_WAIT;
        let mut evicted = false;
        loop {
            match self.mirakc.open_stream(session.key.service_id).await {
                Ok(stream) => return Ok(stream),
                Err(OpenStreamError::Other(e)) => return Err(e),
                Err(OpenStreamError::TunerUnavailable) => {
                    if session.is_cancelled() {
                        return Err(anyhow!("cancelled"));
                    }
                    // チューナーが足りないときは、最後に要求された視聴を優先して他チャンネルを止める。
                    if !evicted {
                        evicted = self.evict_other_channels(session);
                    }
                    if !evicted || tokio::time::Instant::now() >= deadline {
                        return Err(anyhow!("no tuner is available"));
                    }
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
            }
        }
    }

    fn evict_other_channels(&self, current: &LiveSession) -> bool {
        let sessions = self.sessions.lock().unwrap();
        let mut evicted = false;
        for session in sessions.values().filter(|s| s.channel != current.channel) {
            tracing::info!(key = ?session.key, "stopping session to free a tuner");
            session.stop();
            evicted = true;
        }
        evicted
    }

    fn remove(&self, session: &Arc<LiveSession>) {
        let mut sessions = self.sessions.lock().unwrap();
        if sessions.get(&session.key).is_some_and(|s| Arc::ptr_eq(s, session)) {
            sessions.remove(&session.key);
        }
    }

    pub fn spawn_reaper(self: &Arc<Self>) {
        let manager = Arc::downgrade(self);
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(5));
            loop {
                interval.tick().await;
                let Some(manager) = manager.upgrade() else { return };
                let sessions = manager.sessions.lock().unwrap();
                for session in sessions.values().filter(|s| s.expire_viewers(VIEWER_TIMEOUT)) {
                    tracing::info!(key = ?session.key, "stopping idle session");
                    session.stop();
                }
            }
        });
    }

    pub async fn shutdown(&self) {
        let sessions: Vec<_> = self.sessions.lock().unwrap().values().cloned().collect();
        for session in &sessions {
            session.stop();
        }
        let all_finished = futures_util::future::join_all(sessions.iter().map(|s| s.wait_finished()));
        if tokio::time::timeout(Duration::from_secs(5), all_finished)
            .await
            .is_err()
        {
            tracing::warn!("timed out waiting for sessions to stop");
        }
    }
}
