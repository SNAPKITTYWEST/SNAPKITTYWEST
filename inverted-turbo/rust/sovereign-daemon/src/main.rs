mod datalog;
mod gate;
mod plasma;

use axum::{routing::{get, post}, Router};
use sha2::{Digest, Sha256};
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tracing::{info, instrument};

#[derive(Debug, Clone)]
struct DaemonState {
    resonance_path: String,
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

    let state = DaemonState { resonance_path };

    let app = Router::new()
        .route("/health", get(health))
        .route("/resonance", get(resonance_check))
        .route("/gate", post(gate::handle))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Sovereign daemon listening on {}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
