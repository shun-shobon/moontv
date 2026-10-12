use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::Result;
use serde::Serialize;
use tokio::sync::Mutex;
use unicode_normalization::UnicodeNormalization;

use crate::mirakc::{ChannelInfo, MirakcClient, Program, Service};

/// mirakc の /api/programs は全番組を返し数MBになるため、画面遷移ごとに取得しない。
const CACHE_TTL: Duration = Duration::from_secs(60);

/// デジタルTVサービスと高画質(4K)サービス。ラジオやデータ放送は視聴対象にしない。
const TV_SERVICE_TYPES: [u8; 2] = [0x01, 0xad];

const CHANNEL_TYPE_ORDER: [&str; 4] = ["GR", "BS", "CS", "SKY"];

pub struct Catalog {
    mirakc: MirakcClient,
    cache: Mutex<Option<(Instant, Arc<Snapshot>)>>,
}

pub struct Snapshot {
    pub services: Vec<Service>,
    pub programs: Vec<Program>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelDto {
    pub id: u64,
    pub name: String,
    pub channel_type: String,
    pub channel: String,
    pub remote_control_key_id: Option<u8>,
    pub has_logo: bool,
    pub is_subchannel: bool,
    pub present: Option<ProgramDto>,
    pub following: Option<ProgramDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgramDto {
    pub id: u64,
    pub service_id: u64,
    pub start_at: i64,
    pub duration: Option<i64>,
    pub name: String,
    pub description: String,
    pub genres: Vec<u8>,
    pub is_free: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgramDetailDto {
    #[serde(flatten)]
    pub summary: ProgramDto,
    pub extended: Vec<ExtendedItem>,
}

#[derive(Serialize)]
pub struct ExtendedItem {
    pub key: String,
    pub value: String,
}

impl Catalog {
    pub fn new(mirakc: MirakcClient) -> Self {
        Self {
            mirakc,
            cache: Mutex::new(None),
        }
    }

    pub async fn snapshot(&self) -> Result<Arc<Snapshot>> {
        let mut cache = self.cache.lock().await;
        if let Some((fetched_at, snapshot)) = cache.as_ref()
            && fetched_at.elapsed() < CACHE_TTL
        {
            return Ok(snapshot.clone());
        }

        let (services, programs) = tokio::try_join!(self.mirakc.services(), self.mirakc.programs())?;
        let mut services: Vec<Service> = services
            .into_iter()
            .filter(|s| TV_SERVICE_TYPES.contains(&s.service_type))
            .collect();
        services.sort_by_key(|s| {
            let type_rank = CHANNEL_TYPE_ORDER
                .iter()
                .position(|t| *t == s.channel.channel_type)
                .unwrap_or(CHANNEL_TYPE_ORDER.len());
            (type_rank, s.remote_control_key_id.unwrap_or(u8::MAX), s.service_id)
        });

        // 放送していないサブチャンネルには名前のない番組が入るので、番組として扱わない。
        let programs = programs
            .into_iter()
            .filter(|p| p.name.as_deref().is_some_and(|name| !name.trim().is_empty()))
            .collect();
        let snapshot = Arc::new(Snapshot { services, programs });
        *cache = Some((Instant::now(), snapshot.clone()));
        drop(cache);
        Ok(snapshot)
    }

    pub async fn service_channel(&self, service_id: u64) -> Result<Option<ChannelInfo>> {
        let snapshot = self.snapshot().await?;
        Ok(snapshot
            .services
            .iter()
            .find(|s| s.id == service_id)
            .map(|s| s.channel.clone()))
    }

    pub async fn channels(&self, now_ms: i64) -> Result<Vec<ChannelDto>> {
        let snapshot = self.snapshot().await?;
        let channels = snapshot
            .services
            .iter()
            .map(|service| {
                let mut upcoming: Vec<&Program> = snapshot
                    .programs
                    .iter()
                    .filter(|p| p.service_key() == service.id && end_at(p) > now_ms)
                    .collect();
                upcoming.sort_by_key(|p| p.start_at);
                let mut upcoming = upcoming.into_iter();
                let first = upcoming.next();
                let (present, following) = match first {
                    Some(p) if p.start_at <= now_ms => (Some(p), upcoming.next()),
                    other => (None, other),
                };
                ChannelDto {
                    id: service.id,
                    name: normalize(&service.name),
                    channel_type: service.channel.channel_type.clone(),
                    channel: service.channel.channel.clone(),
                    remote_control_key_id: service.remote_control_key_id,
                    has_logo: service.has_logo_data,
                    is_subchannel: is_subchannel(service, &snapshot.services),
                    present: present.map(to_dto),
                    following: following.map(to_dto),
                }
            })
            .collect();
        Ok(channels)
    }

    pub async fn programs(&self, start_ms: i64, end_ms: i64) -> Result<Vec<ProgramDto>> {
        let snapshot = self.snapshot().await?;
        let mut programs: Vec<ProgramDto> = snapshot
            .programs
            .iter()
            .filter(|p| p.start_at < end_ms && end_at(p) > start_ms)
            .filter(|p| snapshot.services.iter().any(|s| s.id == p.service_key()))
            .map(to_dto)
            .collect();
        programs.sort_by_key(|p| (p.service_id, p.start_at));
        Ok(programs)
    }

    pub async fn program(&self, id: u64) -> Result<Option<ProgramDetailDto>> {
        let Some(program) = self.mirakc.program(id).await? else {
            return Ok(None);
        };
        let extended = program
            .extended
            .iter()
            .flatten()
            .map(|(key, value)| ExtendedItem {
                key: normalize(key),
                value: normalize(value.as_str().unwrap_or_default()),
            })
            .collect();
        Ok(Some(ProgramDetailDto {
            summary: to_dto(&program),
            extended,
        }))
    }

    pub async fn logo(&self, service_id: u64) -> Result<Option<bytes::Bytes>> {
        self.mirakc.logo(service_id).await
    }
}

/// 同じ物理チャンネル・同じリモコン番号に、より若いサービスIDのサービスがあればサブチャンネルとみなす。
fn is_subchannel(service: &Service, services: &[Service]) -> bool {
    services.iter().any(|other| {
        other.channel == service.channel
            && other.remote_control_key_id == service.remote_control_key_id
            && other.service_id < service.service_id
    })
}

/// 番組長が未定の番組は、次の番組が始まるまで続くものとして扱う。
fn end_at(program: &Program) -> i64 {
    program.start_at + program.duration.unwrap_or(i64::MAX / 4)
}

fn to_dto(program: &Program) -> ProgramDto {
    ProgramDto {
        id: program.id,
        service_id: program.service_key(),
        start_at: program.start_at,
        duration: program.duration,
        name: normalize(program.name.as_deref().unwrap_or_default()),
        description: normalize(program.description.as_deref().unwrap_or_default()),
        genres: program.genres.iter().flatten().map(|g| g.lv1).collect(),
        is_free: program.is_free,
    }
}

/// ARIB の文字列は英数字が全角で送られてくるため NFKC で半角に揃える。
/// ただし NFKC は「🈑」のような囲み文字を「字」に潰すので、先に括弧付きの表記へ置き換える。
pub fn normalize(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match enclosed_symbol(c) {
            Some(s) => {
                out.push('[');
                out.push_str(s);
                out.push(']');
            }
            None => out.push(c),
        }
    }
    out.nfkc().collect()
}

const fn enclosed_symbol(c: char) -> Option<&'static str> {
    Some(match c {
        '🅊' => "HV",
        '🅌' => "SD",
        '🅿' => "P",
        '🆆' => "W",
        '🅫' => "MV",
        '🈐' => "手",
        '🈑' => "字",
        '🈒' => "双",
        '🈓' => "デ",
        '🈔' => "二",
        '🈕' => "多",
        '🈖' => "解",
        '🈗' => "天",
        '🈘' => "交",
        '🈙' => "映",
        '🈚' => "無",
        '🈛' => "料",
        '🈜' => "前",
        '🈝' => "後",
        '🈞' => "再",
        '🈟' => "新",
        '🈠' => "初",
        '🈡' => "終",
        '🈢' => "生",
        '🈣' => "販",
        '🈤' => "声",
        '🈥' => "吹",
        '🈦' => "演",
        '🈧' => "投",
        '🈨' => "捕",
        '🈩' => "一",
        '🈪' => "三",
        '🈫' => "遊",
        '🈬' => "左",
        '🈭' => "中",
        '🈮' => "右",
        '🈯' => "指",
        '🈰' => "走",
        '🈱' => "打",
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_converts_fullwidth_and_enclosed_symbols() {
        assert_eq!(normalize("ＴＯＫＹＯ　ＭＸ１"), "TOKYO MX1");
        assert_eq!(normalize("ニュース🈑🈞"), "ニュース[字][再]");
    }
}
