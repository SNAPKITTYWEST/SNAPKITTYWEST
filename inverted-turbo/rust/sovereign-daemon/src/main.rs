mod datalog;
mod gate;
mod plasma;

use std::sync::Arc;

use axum::{routing::{get, patch, post}, Router};
use sha2::{Digest, Sha256};
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tokio::sync::{RwLock, Semaphore};
use tracing::{info, instrument};

use datalog::GateConfig;

/// Max concurrent gate evaluations before new requests queue.
/// Override with GATE_CONCURRENCY env var.
const DEFAULT_GATE_CONCURRENCY: usize = 256;

/// Shared across all Axum handlers via axum::extract::State.
///
/// Concurrency model:
///   gate_config   — Arc<RwLock<>>: many handlers read concurrently, PATCH /gate/config
///                   acquires the write lock to hot-reload rules without restart.
///   gate_semaphore — Arc<Semaphore>: caps concurrent gate evaluations at
///                   GATE_CONCURRENCY. Permits are acquired at handler entry and
///                   dropped at return — natural backpressure before Datalog runs.
#[derive(Debug, Clone)]
pub struct DaemonState {
    resonance_path: String,
    pub gate_config:    Arc<RwLock<GateConfig>>,
    pub gate_semaphore: Arc<Semaphore>,
}

#[instrument]
async fn health() -> &'static str {
    "sovereign-daemon: ok"
}

#[instrument]
async fn resonance_check(
    axum::extract::State(state): axum::extract::State<DaemonState>,
) -> String {
    let path = std::path::Path::new(&state.resonance_path);
    if path.exists() {
        let content = std::fs::read(path).unwrap_or_default();
        let hash = Sha256::digest(&content);
        format!("resonance: present (sha256:{:x})", hash)
    } else {
        "resonance: none".to_string()
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let resonance_path = std::env::var("RESONANCE_PATH")
        .unwrap_or_else(|_| "z:/resonance.xml".to_string());

    let port: u16 = std::env::var("DAEMON_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3777);

    let gate_concurrency: usize = std::env::var("GATE_CONCURRENCY")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_GATE_CONCURRENCY);

    let state = DaemonState {
        resonance_path,
        gate_config:    Arc::new(RwLock::new(GateConfig::default())),
        gate_semaphore: Arc::new(Semaphore::new(gate_concurrency)),
    };

    let app = Router::new()
        .route("/health",       get(health))
        .route("/resonance",    get(resonance_check))
        .route("/gate",         post(gate::handle))
        .route("/gate/config",  patch(gate::patch_config))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Sovereign daemon listening on {} (gate_concurrency={})", addr, gate_concurrency);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
