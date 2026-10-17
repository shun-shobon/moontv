use std::time::Duration;

use anyhow::{Context, Result, bail};
use reqwest::{StatusCode, Url};
use serde::Deserialize;

const STREAM_OPEN_TIMEOUT: Duration = Duration::from_secs(15);

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

#[derive(Debug, Clone, Deserialize)]
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
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Audio {
    #[serde(default)]
    pub is_main: bool,
    #[serde(default)]
    pub langs: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Genre {
    pub lv1: u8,
}

impl Program {
    /// mirakc の Service.id は networkId と serviceId の合成値だが、Program にはその値が含まれない。
    pub fn service_key(&self) -> u64 {
        u64::from(self.network_id) * 100_000 + u64::from(self.service_id)
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
            .user_agent(concat!("moontv/", env!("CARGO_PKG_VERSION")))
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

    pub async fn open_stream(&self, service_id: u64) -> Result<reqwest::Response, OpenStreamError> {
        let req = self
            .http
            .get(self.url(&format!("/api/services/{service_id}/stream")))
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
