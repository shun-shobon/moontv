use std::time::Duration;

use anyhow::{Context, Result, bail};
use reqwest::{StatusCode, Url};
use serde::{Deserialize, Serialize};

const STREAM_OPEN_TIMEOUT: Duration = Duration::from_secs(15);
const USER_AGENT: &str = concat!("moontv/", env!("CARGO_PKG_VERSION"));
/// mirakc はチューナーの利用者を接続元と User-Agent でしか示さないので、どの配信かを User-Agent に入れて見分ける。
const SESSION_AGENT_PREFIX: &str = concat!("moontv/", env!("CARGO_PKG_VERSION"), " session/");

#[derive(Clone)]
pub struct MirakcClient {
    http: reqwest::Client,
    base: Url,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[expect(clippy::struct_field_names, reason = "mirakc の serviceId と揃える")]
pub struct Service {
    pub id: u64,
    pub service_id: u16,
    #[serde(rename = "type")]
    pub service_type: u8,
    pub remote_control_key_id: Option<u8>,
    pub name: String,
    pub channel: ChannelInfo,
    #[serde(default)]
    pub has_logo_data: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Deserialize)]
pub struct ChannelInfo {
    #[serde(rename = "type")]
    pub channel_type: String,
    pub channel: String,
}

/// 録画一覧に番組情報を控えるため、mirakc から受け取った形のまま書き戻せるようにする。
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Program {
    pub id: u64,
    pub network_id: u16,
    pub service_id: u16,
    pub start_at: i64,
    pub duration: Option<i64>,
    #[serde(default)]
    pub is_free: bool,
    pub name: Option<String>,
    pub description: Option<String>,
    pub extended: Option<serde_json::Map<String, serde_json::Value>>,
    pub genres: Option<Vec<Genre>>,
    pub audios: Option<Vec<Audio>>,
}

/// mirakc は音声を `component_tag` をキーにした連想配列から返すため、並び順に意味はない。
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Audio {
    #[serde(default)]
    pub is_main: bool,
    #[serde(default)]
    pub langs: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Genre {
    pub lv1: u8,
}

impl Program {
    /// mirakc の Service.id は networkId と serviceId の合成値だが、Program にはその値が含まれない。
    pub fn service_key(&self) -> u64 {
        u64::from(self.network_id) * 100_000 + u64::from(self.service_id)
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingSchedule {
    pub state: ScheduleState,
    pub program: Program,
    pub options: RecordingOptions,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingOptions {
    /// mirakc の `recording.basedir` からの相対パス。
    pub content_path: std::path::PathBuf,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingEvent {
    pub program_id: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ScheduleState {
    Scheduled,
    Tracking,
    Recording,
    Rescheduling,
    Finished,
    Failed,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Tuner {
    pub index: usize,
    pub name: String,
    pub types: Vec<String>,
    pub users: Vec<TunerUser>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TunerUser {
    /// `recorder:program#<番組 ID>` や `job:<名前>` など。外部からの視聴では接続元のアドレス。
    pub id: String,
    pub agent: Option<String>,
}

pub enum TunerUserKind<'a> {
    /// moontv の配信。値はセッション ID。
    Session(u64),
    /// 値は番組 ID。
    Recording(u64),
    /// mirakc が番組情報を取るための受信。
    Epg,
    Other(&'a str),
}

impl TunerUser {
    pub fn kind(&self) -> TunerUserKind<'_> {
        if let Some(id) = self.agent.as_deref().and_then(|a| a.strip_prefix(SESSION_AGENT_PREFIX))
            && let Ok(id) = id.parse()
        {
            return TunerUserKind::Session(id);
        }
        if let Some(id) = self.id.strip_prefix("recorder:program#")
            && let Ok(id) = id.parse()
        {
            return TunerUserKind::Recording(id);
        }
        if self.id.starts_with("job:") || self.id.starts_with("onair-program-tracker:") {
            return TunerUserKind::Epg;
        }
        TunerUserKind::Other(self.agent.as_deref().unwrap_or(&self.id))
    }
}

#[derive(Debug)]
pub enum OpenStreamError {
    TunerUnavailable,
    Other(anyhow::Error),
}

impl std::error::Error for OpenStreamError {}

impl std::fmt::Display for OpenStreamError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::TunerUnavailable => write!(f, "no tuner is available"),
            Self::Other(e) => write!(f, "{e:#}"),
        }
    }
}

impl MirakcClient {
    pub fn new(base: Url) -> Result<Self> {
        let http = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .user_agent(USER_AGENT)
            .build()
            .context("failed to build HTTP client")?;
        Ok(Self { http, base })
    }

    fn url(&self, path: &str) -> Url {
        let mut url = self.base.clone();
        url.set_path(path);
        url
    }

    async fn get_json<T: serde::de::DeserializeOwned>(&self, path: &str) -> Result<T> {
        let res = self
            .http
            .get(self.url(path))
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .with_context(|| format!("failed to request mirakc {path}"))?;
        let status = res.status();
        if !status.is_success() {
            bail!("mirakc {path} returned {status}");
        }
        res.json()
            .await
            .with_context(|| format!("failed to decode mirakc {path}"))
    }

    pub async fn services(&self) -> Result<Vec<Service>> {
        self.get_json("/api/services").await
    }

    pub async fn programs(&self) -> Result<Vec<Program>> {
        self.get_json("/api/programs").await
    }

    /// mirakc は `recording.basedir` を設定していないと録画の API を持たず、404 を返す。そのときは None を返す。
    pub async fn recording_schedules(&self) -> Result<Option<Vec<RecordingSchedule>>> {
        let res = self
            .http
            .get(self.url("/api/recording/schedules"))
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .context("failed to request mirakc recording schedules")?;
        if res.status() == StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !res.status().is_success() {
            bail!("mirakc recording schedules returned {}", res.status());
        }
        Ok(Some(
            res.json()
                .await
                .context("failed to decode mirakc recording schedules")?,
        ))
    }

    pub async fn recording_schedule(&self, program_id: u64) -> Result<Option<RecordingSchedule>> {
        let res = self
            .http
            .get(self.url(&format!("/api/recording/schedules/{program_id}")))
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .context("failed to request mirakc recording schedule")?;
        if res.status() == StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !res.status().is_success() {
            bail!("mirakc recording schedule returned {}", res.status());
        }
        Ok(Some(
            res.json().await.context("failed to decode mirakc recording schedule")?,
        ))
    }

    /// 録画が無効なら mirakc は録画の API を持たず 404 を返すので、録画中ではないとみなす。
    pub async fn is_recording(&self) -> Result<bool> {
        let res = self
            .http
            .get(self.url("/api/recording/recorders"))
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .context("failed to request mirakc recorders")?;
        if res.status() == StatusCode::NOT_FOUND {
            return Ok(false);
        }
        if !res.status().is_success() {
            bail!("mirakc recorders returned {}", res.status());
        }
        let recorders: Vec<serde_json::Value> = res.json().await.context("failed to decode mirakc recorders")?;
        Ok(!recorders.is_empty())
    }

    /// Server-Sent Events の本文を返す。接続を張りっぱなしにするので、タイムアウトを付けない。
    pub async fn events(&self) -> Result<reqwest::Response> {
        let res = self
            .http
            .get(self.url("/events"))
            .send()
            .await
            .context("failed to request mirakc events")?;
        if !res.status().is_success() {
            bail!("mirakc events returned {}", res.status());
        }
        Ok(res)
    }

    pub async fn add_recording_schedule(&self, program_id: u64, content_path: &str, priority: i32) -> Result<()> {
        let body = serde_json::json!({
            "programId": program_id,
            "options": { "contentPath": content_path, "priority": priority },
        });
        let res = self
            .http
            .post(self.url("/api/recording/schedules"))
            .timeout(Duration::from_secs(10))
            .json(&body)
            .send()
            .await
            .context("failed to request mirakc to add a recording schedule")?;
        match res.status() {
            s if s.is_success() => Ok(()),
            // 予約済みと放送終了済みのどちらも 400 で返り、区別できない。
            StatusCode::BAD_REQUEST => bail!("the program is already scheduled or has ended"),
            s => bail!("mirakc returned {s} when adding a recording schedule"),
        }
    }

    pub async fn remove_recording_schedule(&self, program_id: u64) -> Result<()> {
        let res = self
            .http
            .delete(self.url(&format!("/api/recording/schedules/{program_id}")))
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .context("failed to request mirakc to remove a recording schedule")?;
        match res.status() {
            s if s.is_success() || s == StatusCode::NOT_FOUND => Ok(()),
            s => bail!("mirakc returned {s} when removing a recording schedule"),
        }
    }

    pub async fn tuners(&self) -> Result<Vec<Tuner>> {
        self.get_json("/api/tuners").await
    }

    pub async fn program(&self, id: u64) -> Result<Option<Program>> {
        let res = self
            .http
            .get(self.url(&format!("/api/programs/{id}")))
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .context("failed to request mirakc program")?;
        if res.status() == StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !res.status().is_success() {
            bail!("mirakc program returned {}", res.status());
        }
        Ok(Some(res.json().await.context("failed to decode mirakc program")?))
    }

    pub async fn logo(&self, service_id: u64) -> Result<Option<bytes::Bytes>> {
        let res = self
            .http
            .get(self.url(&format!("/api/services/{service_id}/logo")))
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .context("failed to request mirakc logo")?;
        if !res.status().is_success() {
            return Ok(None);
        }
        Ok(Some(res.bytes().await.context("failed to read mirakc logo")?))
    }

    pub async fn open_stream(&self, service_id: u64, session_id: u64) -> Result<reqwest::Response, OpenStreamError> {
        let req = self
            .http
            .get(self.url(&format!("/api/services/{service_id}/stream")))
            .header(
                reqwest::header::USER_AGENT,
                format!("{SESSION_AGENT_PREFIX}{session_id}"),
            )
            .send();
        let res = tokio::time::timeout(STREAM_OPEN_TIMEOUT, req)
            .await
            .map_err(|_| OpenStreamError::Other(anyhow::anyhow!("timed out opening stream")))?
            .map_err(|e| OpenStreamError::Other(anyhow::Error::new(e).context("failed to open stream")))?;
        match res.status() {
            // mirakc はチューナーを確保できないとき 404 を返す。
            StatusCode::NOT_FOUND | StatusCode::SERVICE_UNAVAILABLE => Err(OpenStreamError::TunerUnavailable),
            s if s.is_success() => Ok(res),
            s => Err(OpenStreamError::Other(anyhow::anyhow!("mirakc stream returned {s}"))),
        }
    }
}
