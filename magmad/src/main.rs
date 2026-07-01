// main.rs — magmad sovereign agentic daemon
//
// Starts REST + SSE on :3000 (primary interface).
// gRPC on :50051 is defined in grpc/mod.rs and will be wired when protoc
// becomes available (install protoc, re-add tonic_build to build.rs).
//
// Usage:
//   magmad                         # start with defaults
//   MAGMA_HTTP_PORT=8080 magmad    # override HTTP port
//   MAGMA_NATS_URL=nats://... magmad
//
// Ahmad Ali Parr · SnapKitty Collective · 2026

mod bob;
mod config;
mod errant_ffi;
mod grpc;
mod http;
mod nats_bus;

use std::sync::Arc;
use anyhow::Result;
use tracing::{info, warn, error};

#[tokio::main]
async fn main() -> Result<()> {
    let cfg = config::Config::from_env();

    // ── Tracing ───────────────────────────────────────────────────────────
    tracing_subscriber::fmt()
        .with_env_filter(&cfg.log_level)
        .json()
        .init();

    print_banner(&cfg);

    // ── Verify liberrant is linked and working ────────────────────────────
    {
        let check = errant_ffi::verify_named(&["PUSH_UN", "SEAL"]);
        if check.ok {
            info!("liberrant {} online · FIPS SHA-256 verified", errant_ffi::version());
        } else {
            error!("liberrant self-check FAILED: {}", check.error);
            std::process::exit(1);
        }
    }

    // ── NATS connection (optional — daemon runs without it) ───────────────
    let nats = match nats_bus::NatsBus::connect(&cfg.nats_url).await {
        Ok(bus) => {
            info!("NATS connected: {}", cfg.nats_url);
            Some(Arc::new(bus))
        }
        Err(e) => {
            warn!("NATS unavailable ({}): running in local mode", e);
            None
        }
    };

    // ── Build shared HTTP state ───────────────────────────────────────────
    let http_state = http::AppState {
        config:   Arc::new(cfg.clone()),
        nats:     nats.clone(),
        worm_url: format!("{}/api/labs/ledge/seal", cfg.os_url),
        llm_url:  cfg.llm_url.clone(),
    };

    // ── REST + SSE server (primary interface) ─────────────────────────────
    let http_addr: std::net::SocketAddr = cfg.http_addr().parse()?;
    let app = http::router(http_state)
        .layer(tower_http::cors::CorsLayer::permissive())
        .layer(tower_http::trace::TraceLayer::new_for_http());

    info!("REST/SSE listening on http://{}", http_addr);
    info!("gRPC endpoint defined at :{}  (enable: install protoc, run cargo build)", cfg.grpc_port);
    info!("magmad online · EVIDENCE OR SILENCE · Ω↺Ψ↺Δ↺Λ↺Σ↺Φ↺α");

    let listener = tokio::net::TcpListener::bind(http_addr).await?;

    tokio::select! {
        r = axum::serve(listener, app) => {
            if let Err(e) = r { error!("HTTP server error: {e}"); }
        }
        _ = tokio::signal::ctrl_c() => {
            info!("Ω — magmad shutting down");
        }
    }

    Ok(())
}

fn print_banner(cfg: &config::Config) {
    eprintln!(r#"
╔══════════════════════════════════════════════════════════════╗
║  ███╗   ███╗ █████╗  ██████╗ ███╗   ███╗ █████╗ ██████╗    ║
║  ████╗ ████║██╔══██╗██╔════╝ ████╗ ████║██╔══██╗██╔══██╗   ║
║  ██╔████╔██║███████║██║  ███╗██╔████╔██║███████║██║  ██║   ║
║  ██║╚██╔╝██║██╔══██║██║   ██║██║╚██╔╝██║██╔══██║██║  ██║   ║
║  ██║ ╚═╝ ██║██║  ██║╚██████╔╝██║ ╚═╝ ██║██║  ██║██████╔╝   ║
║  ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═════╝    ║
╠══════════════════════════════════════════════════════════════╣
║  Sovereign Agentic Daemon v{}                            ║
║  BOB: TRUST-DEED-GATE → MAMBA → WATSON → PROLOG → SEAL     ║
╠══════════════════════════════════════════════════════════════╣
║  REST/SSE  http://0.0.0.0:{}                               ║
║  gRPC      :{}  (stub — install protoc to activate)      ║
║  NATS      {}
╚══════════════════════════════════════════════════════════════╝
    "#,
    env!("CARGO_PKG_VERSION"),
    cfg.http_port,
    cfg.grpc_port,
    cfg.nats_url,
    );
}
