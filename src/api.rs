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
use crate::recording::Recorder;
use crate::recording::library::{DeleteError, Library};
use crate::transcode::manager::{AcquireError, SessionManager};
use crate::transcode::profile::{AudioTrack, Codec, QUALITIES, Quality};
use crate::transcode::session::{LiveKey, LiveSession, MEDIA_PLAYLIST};

/// チューナーの起動と最初のセグメント生成を合わせても通常は10秒以内に終わる。
const READY_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Clone)]
pub struct AppState {
    pub catalog: Arc<Catalog>,
    pub sessions: Arc<SessionManager>,
    pub recorder: Arc<Recorder>,
    pub library: Option<Arc<Library>>,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/status", get(status))
        .route("/api/channels", get(channels))
        .route("/api/channels/{id}/logo", get(logo))
        .route("/api/programs", get(programs))
        .route("/api/programs/{id}", get(program))
        .route("/api/recording/schedules", get(schedules))
        .route("/api/recordings", get(recordings))
        .route("/api/recordings/{program_id}", axum::routing::delete(delete_recording))
        .route(
            "/api/recording/schedules/{program_id}",
            axum::routing::put(add_schedule).delete(remove_schedule),
        )
        .route(
            "/api/live/{service}/{codec}/{quality}/{audio}/{viewer}",
            get(live_end).put(start_live).delete(leave_live),
        )
        .route(
            "/api/live/{service}/{codec}/{quality}/{audio}/{viewer}/master.m3u8",
            get(master_playlist),
        )
        .route(
            "/api/live/{service}/{codec}/{quality}/{audio}/{viewer}/{session}/{file}",
            get(live_file),
        )
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
    recording: bool,
    /// 録画を変換して一覧にする設定があるか。
    library: bool,
}

async fn status(State(state): State<AppState>) -> ApiResult<Json<StatusDto>> {
    let setup = state.sessions.setup();
    Ok(Json(StatusDto {
        version: env!("CARGO_PKG_VERSION"),
        encoder: setup.encoder.name(),
        codecs: setup.codecs.clone(),
        qualities: QUALITIES.to_vec(),
        recording: state.recorder.is_enabled().await?,
        library: state.library.is_some(),
    }))
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
    let program = state.catalog.program(id).await?;
    program
        .map(Json)
        .ok_or_else(|| ApiError(StatusCode::NOT_FOUND, "program not found".into()))
}

async fn logo(State(state): State<AppState>, Path(id): Path<u64>) -> ApiResult<Response> {
    let Some(bytes) = state.catalog.logo(id).await? else {
        return Err(ApiError(StatusCode::NOT_FOUND, "logo not found".into()));
    };
    Ok((
        [
            (header::CONTENT_TYPE, "image/png"),
            (header::CACHE_CONTROL, "public, max-age=86400"),
        ],
        bytes,
    )
        .into_response())
}

async fn schedules(State(state): State<AppState>) -> ApiResult<impl IntoResponse> {
    let schedules = state.recorder.schedules().await?;
    schedules
        .map(Json)
        .ok_or_else(|| ApiError(StatusCode::NOT_FOUND, "recording is disabled in mirakc".into()))
}

async fn add_schedule(State(state): State<AppState>, Path(program_id): Path<u64>) -> ApiResult<StatusCode> {
    state.recorder.add(program_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn remove_schedule(State(state): State<AppState>, Path(program_id): Path<u64>) -> ApiResult<StatusCode> {
    state.recorder.remove(program_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

fn library(state: &AppState) -> ApiResult<&Library> {
    state
        .library
        .as_deref()
        .ok_or_else(|| ApiError(StatusCode::NOT_FOUND, "the recording library is not configured".into()))
}

async fn recordings(State(state): State<AppState>) -> ApiResult<impl IntoResponse> {
    Ok(Json(library(&state)?.list()))
}

async fn delete_recording(State(state): State<AppState>, Path(program_id): Path<u64>) -> ApiResult<StatusCode> {
    library(&state)?.delete(program_id).await.map_err(|e| match e {
        DeleteError::NotFound => ApiError(StatusCode::NOT_FOUND, "recording not found".into()),
        DeleteError::Busy => ApiError(StatusCode::CONFLICT, "the recording is still being written".into()),
        DeleteError::Other(e) => e.into(),
    })?;
    Ok(StatusCode::NO_CONTENT)
}

type LivePath = (u64, Codec, Quality, AudioTrack, String);

fn live_key(state: &AppState, (service_id, codec, quality, audio, viewer): &LivePath) -> ApiResult<LiveKey> {
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
        audio: *audio,
    })
}

async fn ready_session(state: &AppState, path: &LivePath) -> ApiResult<Arc<LiveSession>> {
    let key = live_key(state, path)?;
    let session = state.sessions.acquire(key, &path.4).await.map_err(|e| match e {
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

#[derive(Serialize)]
struct LiveEndDto {
    evicted: bool,
}

/// プレイヤーが再生の中断を検知したときに呼び、チューナーを譲らされたのかを画面に出す。
async fn live_end(State(state): State<AppState>, Path(path): Path<LivePath>) -> ApiResult<Json<LiveEndDto>> {
    let key = live_key(&state, &path)?;
    Ok(Json(LiveEndDto {
        evicted: state.sessions.was_evicted(key, &path.4),
    }))
}

async fn leave_live(State(state): State<AppState>, Path(path): Path<LivePath>) -> ApiResult<StatusCode> {
    let key = live_key(&state, &path)?;
    state.sessions.leave(key, &path.4);
    Ok(StatusCode::NO_CONTENT)
}

async fn master_playlist(State(state): State<AppState>, Path(path): Path<LivePath>) -> ApiResult<Response> {
    let session = ready_session(&state, &path).await?;
    let spec = session.key.quality.spec(session.key.codec);
    let bandwidth = (spec.video_kbps * 3 / 2 + spec.audio_kbps) * 1000;
    let body = format!(
        "#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-INDEPENDENT-SEGMENTS\n\
         #EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={}x{},CODECS=\"{},mp4a.40.2\"\n{}/{MEDIA_PLAYLIST}\n",
        spec.width, spec.height, spec.codecs, session.id,
    );
    Ok(playlist_response(body.into_bytes()))
}

async fn live_file(
    State(state): State<AppState>,
    Path((service, codec, quality, audio, viewer, session_id, file)): Path<(
        u64,
        Codec,
        Quality,
        AudioTrack,
        String,
        u64,
        String,
    )>,
) -> ApiResult<Response> {
    let key = live_key(&state, &(service, codec, quality, audio, viewer.clone()))?;
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
        .get_by_id(key, session_id, &viewer)
        .ok_or_else(|| ApiError(StatusCode::NOT_FOUND, "session not found".into()))?;
    let bytes = tokio::fs::read(session.dir.join(&file))
        .await
        .map_err(|_| ApiError(StatusCode::NOT_FOUND, "not found".into()))?;

    Ok(live_response(content_type, bytes))
}

fn playlist_response(body: Vec<u8>) -> Response {
    live_response("application/vnd.apple.mpegurl", body)
}

fn live_response(content_type: &'static str, body: Vec<u8>) -> Response {
    let mut res = body.into_response();
    let headers = res.headers_mut();
    headers.insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type));
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    res
}
