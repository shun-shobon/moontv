use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use anyhow::{Result, anyhow};

use super::encoder::EncoderSetup;
use super::session::{self, LiveKey, LiveSession};
use crate::catalog::Catalog;
use crate::mirakc::{ChannelInfo, MirakcClient, OpenStreamError};

/// プレイヤーはセグメント長(1秒)ごとにプレイリストを取りに来るので、これだけ途絶えたら視聴終了とみなす。
const VIEWER_TIMEOUT: Duration = Duration::from_secs(20);
/// 他チャンネルのセッションを止めた後、mirakc がチューナーを解放するまで待つ上限。
const TUNER_RELEASE_WAIT: Duration = Duration::from_secs(8);
const TUNER_RETRY_INTERVAL: Duration = Duration::from_millis(50);
/// チューナーを譲らされた視聴者のプレイヤーが、再生の中断を検知して理由を問い合わせるまでの猶予。
const EVICTION_NOTICE_TTL: Duration = Duration::from_secs(60);

pub struct SessionManager {
    sessions: Mutex<HashMap<LiveKey, Arc<LiveSession>>>,
    root: PathBuf,
    setup: EncoderSetup,
    mirakc: MirakcClient,
    catalog: Arc<Catalog>,
    next_id: AtomicU64,
    evictions: Mutex<HashMap<String, (LiveKey, Instant)>>,
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
            // 再起動前のプレイヤーが新しいセッションの ID と偶然一致しないよう、起動時刻から振る。
            next_id: AtomicU64::new(
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map_or(0, |d| u64::try_from(d.as_millis()).unwrap_or(u64::MAX)),
            ),
            evictions: Mutex::new(HashMap::new()),
        }
    }

    pub const fn setup(&self) -> &EncoderSetup {
        &self.setup
    }

    pub async fn acquire(self: &Arc<Self>, key: LiveKey, viewer: &str) -> Result<Arc<LiveSession>, AcquireError> {
        self.evictions.lock().unwrap().remove(viewer);
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
                "{}-{}-{}-{}-{id}",
                key.service_id,
                key.codec.label(),
                key.quality.label(),
                key.audio.label()
            ));
            let session = Arc::new(LiveSession::new(id, key, channel, dir));
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

    fn get(&self, key: LiveKey, viewer: &str) -> Option<Arc<LiveSession>> {
        let session = self.sessions.lock().unwrap().get(&key).filter(|s| s.is_live())?.clone();
        session.touch(viewer);
        Some(session)
    }

    /// 同じキーで作り直されたセッションの断片を古いプレイヤーに渡すと、`init.mp4` が食い違ってデコードに失敗する。
    pub fn get_by_id(&self, key: LiveKey, id: u64, viewer: &str) -> Option<Arc<LiveSession>> {
        let session = self
            .sessions
            .lock()
            .unwrap()
            .get(&key)
            .filter(|s| s.id == id && s.is_live())?
            .clone();
        session.touch(viewer);
        Some(session)
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
        let mut waited = false;
        loop {
            match self.mirakc.open_stream(session.key.service_id).await {
                Ok(stream) => return Ok(stream),
                Err(OpenStreamError::Other(e)) => return Err(e),
                Err(OpenStreamError::TunerUnavailable) => {
                    if session.is_cancelled() {
                        return Err(anyhow!("cancelled"));
                    }
                    if !waited {
                        let releasing = self.release_tuner(session).await?;
                        if releasing.is_empty() {
                            return Err(anyhow!("no tuner is available"));
                        }
                        waited = true;
                        let all_finished = futures_util::future::join_all(releasing.iter().map(|s| s.wait_finished()));
                        let _ = tokio::time::timeout_at(deadline, all_finished).await;
                        continue;
                    }
                    if tokio::time::Instant::now() >= deadline {
                        return Err(anyhow!("no tuner is available"));
                    }
                    // セッションが終わっても、mirakc が切断に気づいてチューナーを手放すまで数ミリ秒かかる。
                    tokio::time::sleep(TUNER_RETRY_INTERVAL).await;
                }
            }
        }
    }

    /// 解放を待つべきセッションを返す。
    /// 終了処理中のものがあればそれを待つ。チャンネルを切り替えた直後に、切り替え前の配信を理由に別の視聴を止めないため。
    /// 無ければ、最後に選ばれたのが一番古いチャンネルの配信を止めて、要求したチャンネルに譲る。
    async fn release_tuner(&self, current: &LiveSession) -> Result<Vec<Arc<LiveSession>>> {
        let types = self.shared_channel_types(&current.channel.channel_type).await?;
        let sessions = self.sessions.lock().unwrap();
        let candidates: Vec<_> = sessions
            .values()
            .filter(|s| s.channel != current.channel && types.contains(&s.channel.channel_type))
            .cloned()
            .collect();
        drop(sessions);

        let finishing: Vec<_> = candidates.iter().filter(|s| s.is_cancelled()).cloned().collect();
        if !finishing.is_empty() {
            return Ok(finishing);
        }

        // ID は作成順に振るので、チャンネル内で最大の ID がそのチャンネルを最後に選んだ時期を表す。
        let mut last_chosen: HashMap<&ChannelInfo, u64> = HashMap::new();
        for session in &candidates {
            let id = last_chosen.entry(&session.channel).or_default();
            *id = (*id).max(session.id);
        }
        let Some(channel) = last_chosen
            .into_iter()
            .min_by_key(|&(_, id)| id)
            .map(|(c, _)| c.clone())
        else {
            return Ok(Vec::new());
        };
        // mirakc は同じチャンネルの配信を1つのチューナーで受けるので、そのチャンネルの配信を全部止めないと空かない。
        let victims: Vec<_> = candidates.into_iter().filter(|s| s.channel == channel).collect();
        for session in &victims {
            tracing::info!(key = ?session.key, "stopping session to free a tuner");
            let now = Instant::now();
            self.evictions
                .lock()
                .unwrap()
                .extend(session.viewers().into_iter().map(|v| (v, (session.key, now))));
            session.stop();
        }
        Ok(victims)
    }

    /// 要求したチャンネルを受信できるチューナーで受けている種類を返す。それ以外の配信を止めてもチューナーは空かない。
    async fn shared_channel_types(&self, channel_type: &str) -> Result<HashSet<String>> {
        let tuners = self.mirakc.tuners().await?;
        Ok(tuners
            .into_iter()
            .filter(|t| t.types.iter().any(|ty| ty == channel_type))
            .flat_map(|t| t.types)
            .collect())
    }

    /// チューナーを譲ったために止めた配信の視聴者なら true を返す。
    pub fn was_evicted(&self, key: LiveKey, viewer: &str) -> bool {
        self.evictions
            .lock()
            .unwrap()
            .get(viewer)
            .is_some_and(|(evicted, _)| *evicted == key)
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
                manager
                    .evictions
                    .lock()
                    .unwrap()
                    .retain(|_, (_, at)| at.elapsed() < EVICTION_NOTICE_TTL);
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
