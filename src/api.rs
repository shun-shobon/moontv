use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use axum::Json;
use axum::Router;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use serde::{Deserialize, Serialize};

use crate::catalog::Catalog;
use crate::transcode::manager::{AcquireError, SessionManager};
use crate::transcode::profile::{Codec, QUALITIES, Quality};
use crate::transcode::session::{LiveKey, LiveSession, MEDIA_PLAYLIST};

/// チューナーの起動と最初のセグメント生成を合わせても通常は10秒以内に終わる。
const READY_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Clone)]
pub struct AppState {
    pub catalog: Arc<Catalog>,
    pub sessions: Arc<SessionManager>,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/status", get(status))
        .route("/api/channels", get(channels))
        .route("/api/channels/{id}/logo", get(logo))
        .route("/api/programs", get(programs))
        .route("/api/programs/{id}", get(program))
        .route(
            "/api/live/{service}/{codec}/{quality}/{viewer}",
            axum::routing::put(start_live).delete(leave_live),
        )
        .route(
            "/api/live/{service}/{codec}/{quality}/{viewer}/master.m3u8",
            get(master_playlist),
        )
        .route("/api/live/{service}/{codec}/{quality}/{viewer}/{file}", get(live_file))
        .with_state(state)
}

pub struct ApiError(StatusCode, String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        #[derive(Serialize)]
        struct Body {
            error: String,
        }
        (self.0, Json(Body { error: self.1 })).into_response()
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(e: anyhow::Error) -> Self {
        tracing::warn!("request failed: {e:#}");
        Self(StatusCode::BAD_GATEWAY, format!("{e:#}"))
    }
}

type ApiResult<T> = Result<T, ApiError>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StatusDto {
    version: &'static str,
    encoder: &'static str,
    codecs: Vec<Codec>,
    qualities: Vec<Quality>,
}

async fn status(State(state): State<AppState>) -> Json<StatusDto> {
    let setup = state.sessions.setup();
    Json(StatusDto {
        version: env!("CARGO_PKG_VERSION"),
        encoder: setup.encoder.name(),
        codecs: setup.codecs.clone(),
        qualities: QUALITIES.to_vec(),
    })
}

fn now_ms() -> i64 {
    let elapsed = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    i64::try_from(elapsed.as_millis()).unwrap_or(i64::MAX)
}

async fn channels(State(state): State<AppState>) -> ApiResult<impl IntoResponse> {
    Ok(Json(state.catalog.channels(now_ms()).await?))
}

#[derive(Deserialize)]
struct ProgramsQuery {
    start: i64,
    end: i64,
}

async fn programs(State(state): State<AppState>, Query(q): Query<ProgramsQuery>) -> ApiResult<impl IntoResponse> {
    Ok(Json(state.catalog.programs(q.start, q.end).await?))
}

async fn program(State(state): State<AppState>, Path(id): Path<u64>) -> ApiResult<impl IntoResponse> {
    match state.catalog.program(id).await? {
        Some(p) => Ok(Json(p)),
        None => Err(ApiError(StatusCode::NOT_FOUND, "program not found".into())),
    }
}

async fn logo(State(state): State<AppState>, Path(id): Path<u64>) -> ApiResult<Response> {
    match state.catalog.logo(id).await? {
        Some(bytes) => Ok((
            [
                (header::CONTENT_TYPE, "image/png"),
                (header::CACHE_CONTROL, "public, max-age=86400"),
            ],
            bytes,
        )
            .into_response()),
        None => Err(ApiError(StatusCode::NOT_FOUND, "logo not found".into())),
    }
}

type LivePath = (u64, Codec, Quality, String);

fn live_key(state: &AppState, (service_id, codec, quality, viewer): &LivePath) -> ApiResult<LiveKey> {
    let valid_viewer =
        !viewer.is_empty() && viewer.len() <= 64 && viewer.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-');
    if !valid_viewer {
        return Err(ApiError(StatusCode::BAD_REQUEST, "invalid viewer id".into()));
    }
    if !state.sessions.setup().codecs.contains(codec) {
        return Err(ApiError(
            StatusCode::BAD_REQUEST,
            format!("codec {} is not available", codec.label()),
        ));
    }
    Ok(LiveKey {
        service_id: *service_id,
        codec: *codec,
        quality: *quality,
    })
}

async fn ready_session(state: &AppState, path: &LivePath) -> ApiResult<Arc<LiveSession>> {
    let key = live_key(state, path)?;
    let session = state.sessions.acquire(key, &path.3).await.map_err(|e| match e {
        AcquireError::UnknownService => ApiError(StatusCode::NOT_FOUND, "service not found".into()),
        AcquireError::Other(e) => e.into(),
    })?;
    session
        .wait_ready(READY_TIMEOUT)
        .await
        .map_err(|e| ApiError(StatusCode::SERVICE_UNAVAILABLE, format!("{e:#}")))?;
    Ok(session)
}

/// プレイヤーに渡す前に呼び、起動失敗の理由（チューナー不足など）を利用者に表示できるようにする。
async fn start_live(State(state): State<AppState>, Path(path): Path<LivePath>) -> ApiResult<StatusCode> {
    ready_session(&state, &path).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn leave_live(State(state): State<AppState>, Path(path): Path<LivePath>) -> ApiResult<StatusCode> {
    let key = live_key(&state, &path)?;
    state.sessions.leave(key, &path.3);
    Ok(StatusCode::NO_CONTENT)
}

async fn master_playlist(State(state): State<AppState>, Path(path): Path<LivePath>) -> ApiResult<Response> {
    let session = ready_session(&state, &path).await?;
    let spec = session.key.quality.spec(session.key.codec);
    let bandwidth = (spec.video_kbps * 3 / 2 + spec.audio_kbps) * 1000;
    let body = format!(
        "#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-INDEPENDENT-SEGMENTS\n\
         #EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={}x{},CODECS=\"{},mp4a.40.2\"\n{MEDIA_PLAYLIST}\n",
        spec.width, spec.height, spec.codecs,
    );
    Ok(playlist_response(body.into_bytes()))
}

async fn live_file(
    State(state): State<AppState>,
    Path((service, codec, quality, viewer, file)): Path<(u64, Codec, Quality, String, String)>,
) -> ApiResult<Response> {
    let key = live_key(&state, &(service, codec, quality, viewer.clone()))?;
    let content_type = match file.rsplit_once('.').map(|(_, ext)| ext) {
        Some("m3u8") => "application/vnd.apple.mpegurl",
        Some("m4s") => "video/iso.segment",
        Some("mp4") => "video/mp4",
        _ => return Err(ApiError(StatusCode::NOT_FOUND, "not found".into())),
    };
    if !file
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'.')
        || file.starts_with('.')
    {
        return Err(ApiError(StatusCode::NOT_FOUND, "not found".into()));
    }
    let session = state
        .sessions
        .get(key, &viewer)
        .ok_or_else(|| ApiError(StatusCode::NOT_FOUND, "session not found".into()))?;
    let bytes = tokio::fs::read(session.dir.join(&file))
        .await
        .map_err(|_| ApiError(StatusCode::NOT_FOUND, "not found".into()))?;

    if content_type == "application/vnd.apple.mpegurl" {
        return Ok(playlist_response(bytes));
    }
    Ok((
        [
            (header::CONTENT_TYPE, content_type),
            (header::CACHE_CONTROL, "max-age=60"),
        ],
        bytes,
    )
        .into_response())
}

fn playlist_response(body: Vec<u8>) -> Response {
    let mut res = body.into_response();
    let headers = res.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/vnd.apple.mpegurl"),
    );
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    res
}
