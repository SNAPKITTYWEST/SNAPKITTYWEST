use axum::{routing::get, Router};
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
async fn resonance_check(axum::extract::State(state): axum::extract::State<DaemonState>) -> String {
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

    let state = DaemonState {
        resonance_path: "z:/resonance.xml".to_string(),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/resonance", get(resonance_check))
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3777));
    info!("Sovereign daemon listening on {}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
