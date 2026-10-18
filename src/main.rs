mod api;
mod assets;
mod caption;
mod catalog;
mod mirakc;
mod recording;
mod transcode;
mod ts;

use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use anyhow::{Context, Result};
use clap::Parser;
use reqwest::Url;
use tracing_subscriber::EnvFilter;

use crate::catalog::Catalog;
use crate::mirakc::MirakcClient;
use crate::recording::Recorder;
use crate::recording::library::Library;
use crate::transcode::encoder::{self, EncoderChoice};
use crate::transcode::manager::SessionManager;

#[derive(Parser)]
#[command(version, about = "Watch live TV from mirakc in your browser")]
struct Args {
    /// Address to listen on.
    #[arg(long, env = "MOONTV_LISTEN", default_value = "0.0.0.0:40780")]
    listen: SocketAddr,
    /// Base URL of mirakc.
    #[arg(long, env = "MOONTV_MIRAKC_URL", default_value = "http://localhost:40772")]
    mirakc_url: Url,
    /// Path to the ffmpeg executable.
    #[arg(long, env = "MOONTV_FFMPEG", default_value = "ffmpeg")]
    ffmpeg: PathBuf,
    /// Video encoder backend. `auto` picks the first one that works.
    #[arg(long, env = "MOONTV_ENCODER", value_enum, default_value_t = EncoderChoice::Auto)]
    encoder: EncoderChoice,
    /// DRM render node used by the vaapi and qsv encoders.
    #[arg(long, env = "MOONTV_VAAPI_DEVICE", default_value = "/dev/dri/renderD128")]
    vaapi_device: PathBuf,
    /// Directory to keep converted recordings in.
    #[arg(long, env = "MOONTV_RECORDINGS_DIR", requires = "mirakc_recording_dir")]
    recordings_dir: Option<PathBuf>,
    /// mirakc's `recording.basedir`, where moontv reads recorded files from and deletes them after conversion.
    #[arg(long, env = "MOONTV_MIRAKC_RECORDING_DIR", requires = "recordings_dir")]
    mirakc_recording_dir: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();
    let args = Args::parse();

    let setup = encoder::detect(&args.ffmpeg, args.encoder, &args.vaapi_device).await?;
    tracing::info!(encoder = setup.encoder.name(), codecs = ?setup.codecs, "using encoder");

    let work_dir = std::env::temp_dir().join(format!("moontv-{}", std::process::id()));
    tokio::fs::create_dir_all(&work_dir)
        .await
        .context("failed to create work directory")?;

    let mirakc = MirakcClient::new(args.mirakc_url)?;
    let catalog = Arc::new(Catalog::new(mirakc.clone()));
    let recorder = Arc::new(Recorder::new(mirakc.clone()));
    let library = match (args.recordings_dir, args.mirakc_recording_dir) {
        (Some(dir), Some(source_dir)) => {
            let library = Library::open(dir, source_dir, setup.clone()).await?;
            tokio::spawn(recording::events::follow(mirakc.clone(), library.clone()));
            Some(library)
        }
        _ => None,
    };
    let sessions = Arc::new(SessionManager::new(work_dir.clone(), setup, mirakc, catalog.clone()));
    sessions.spawn_reaper();

    let app = api::router(api::AppState {
        catalog,
        sessions: sessions.clone(),
        recorder,
        library,
    })
    .fallback(assets::serve);
    let listener = tokio::net::TcpListener::bind(args.listen)
        .await
        .with_context(|| format!("failed to listen on {}", args.listen))?;
    tracing::info!("listening on http://{}", args.listen);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("server error")?;

    sessions.shutdown().await;
    if let Err(e) = tokio::fs::remove_dir_all(&work_dir).await {
        tracing::warn!("failed to remove work directory: {e}");
    }
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(e) = tokio::signal::ctrl_c().await {
            tracing::error!("failed to listen for ctrl-c: {e}");
            std::future::pending::<()>().await;
        }
    };
    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(e) => {
                tracing::error!("failed to listen for SIGTERM: {e}");
                std::future::pending::<()>().await;
            }
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}
