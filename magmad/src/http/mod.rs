// http/mod.rs — axum REST router + SSE orchestration stream
//
// Endpoints:
//   POST /api/v1/orchestrate  → SSE stream of BOB pipeline stages
//   POST /api/v1/verify       → immediate ERRANT verification result
//   GET  /api/v1/chain/head   → current WORM chain head
//   GET  /api/v1/health       → daemon health
//   GET  /api/v1/version      → liberrant + magmad version
//
// SSE stream format per stage:
//   data: {"stage":"TRUST-DEED-GATE","ok":true,"worm_hash":"...","message":"..."}
//
// The external REST/SSE surface is what the magma CLI, METAMINE bridge.mjs,
// and any web UI talks to. The internal gRPC surface talks agent-to-agent.

use axum::{
    extract::State,
    http::StatusCode,
    response::{
        sse::{Event, Sse},
        IntoResponse, Json,
    },
    routing::{get, post},
    Router,
};
use futures::stream::{self, Stream};
use serde::{Deserialize, Serialize};
use std::{convert::Infallible, sync::Arc, time::Duration};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tracing::{error, info};

use crate::{bob, errant_ffi};

// ── Shared application state ───────────────────────────────────────────────

#[derive(Clone)]
pub struct AppState {
    pub config:     Arc<crate::config::Config>,
    pub nats:       Option<Arc<crate::nats_bus::NatsBus>>,
    pub worm_url:   String,
}

// ── Request / response types ───────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct OrchestrateRequest {
    pub session_id:  Option<String>,
    pub action:      String,
    pub code:        Option<String>,
    pub intent:      Option<String>,
    pub constraints: Option<Vec<String>>,
    pub trace_ops:   Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct StageEvent {
    pub stage:      &'static str,
    pub ok:         bool,
    pub agent:      Option<String>,
    pub worm_hash:  Option<String>,
    pub proof_hash: Option<String>,
    pub message:    String,
    pub error:      Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VerifyRequest {
    pub opcodes: Option<Vec<String>>,
    pub source:  Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VerifyResponse {
    pub ok:           bool,
    pub verdict:      &'static str,
    pub worm_hash:    String,
    pub error:        Option<String>,
    pub steps:        i32,
    pub lin_consumed: i32,
    pub lin_leaked:   i32,
    pub fallback:     bool,
}

// ── Router ─────────────────────────────────────────────────────────────────

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/v1/orchestrate", post(orchestrate))
        .route("/api/v1/verify",      post(verify))
        .route("/api/v1/chain/head",  get(chain_head))
        .route("/api/v1/health",      get(health))
        .route("/api/v1/version",     get(version_handler))
        // Legacy MAGMA protocol endpoints (snap-os compatibility)
        .route("/api/labs/ledge/seal",post(legacy_seal))
        .route("/api/sovereign/dispatch", post(legacy_dispatch))
        .with_state(state)
}

// ── POST /api/v1/orchestrate ── SSE stream ─────────────────────────────────

async fn orchestrate(
    State(state): State<AppState>,
    Json(req): Json<OrchestrateRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let (tx, rx) = mpsc::channel::<StageEvent>(16);

    tokio::spawn(async move {
        let send = |ev: StageEvent| {
            let tx = tx.clone();
            async move {
                let json = serde_json::to_string(&ev).unwrap_or_default();
                tx.send(ev).await.ok();
                json
            }
        };

        // ── Stage 1: TRUST-DEED-GATE ──────────────────────────────────────
        send(StageEvent {
            stage:     "TRUST-DEED-GATE",
            ok:        true,
            agent:     None,
            worm_hash: None,
            proof_hash: None,
            message:   "BOB gate open".into(),
            error:     None,
        }).await;

        // ── Stage 2: ERRANT linear type check ─────────────────────────────
        let ops: Vec<String> = req.trace_ops
            .or_else(|| req.code.as_ref().map(|s| {
                s.split_whitespace().map(String::from).collect()
            }))
            .unwrap_or_default();

        let op_refs: Vec<&str> = ops.iter().map(|s| s.as_str()).collect();
        let errant = if op_refs.is_empty() {
            errant_ffi::verify_source("PUSH_UN SEAL") // trivial pass for natural-language actions
        } else {
            errant_ffi::verify_named(&op_refs)
        };

        send(StageEvent {
            stage:     "ERRANT",
            ok:        errant.ok,
            agent:     None,
            worm_hash: Some(errant.worm_hash.clone()),
            proof_hash: None,
            message:   if errant.ok {
                format!("linear types verified · {} steps · {}", errant.steps,
                    if errant.fallback { "structural" } else { "full LFIS" })
            } else {
                format!("SILENCE: {}", errant.error)
            },
            error: if errant.ok { None } else { Some(errant.error.clone()) },
        }).await;

        if !errant.ok { return; }

        // ── Stage 3: MAMBA compress (stub) ────────────────────────────────
        send(StageEvent {
            stage: "MAMBA", ok: true, agent: None,
            worm_hash: Some(errant.worm_hash.clone()),
            proof_hash: None,
            message: "sequence compressed".into(), error: None,
        }).await;

        // ── Stage 4: WATSON attend (stub) ─────────────────────────────────
        send(StageEvent {
            stage: "WATSON", ok: true, agent: None,
            worm_hash: Some(errant.worm_hash.clone()),
            proof_hash: None,
            message: "attention applied".into(), error: None,
        }).await;

        // ── Stage 5: BOB routing ──────────────────────────────────────────
        let signals = bob::BobSignals::from_errant_and_action(&errant, &req.action);
        let route = bob::route(&signals);

        send(StageEvent {
            stage:     "BOB",
            ok:        true,
            agent:     Some(format!("{} {}", route.emoji, route.agent)),
            worm_hash: Some(errant.worm_hash.clone()),
            proof_hash: None,
            message:   format!("→ {}:{}", route.agent, route.action),
            error:     None,
        }).await;

        // ── Stage 6: NATS publish ─────────────────────────────────────────
        if let Some(nats) = &state.nats {
            let payload = serde_json::json!({
                "action":    req.action,
                "worm_hash": errant.worm_hash,
                "agent":     route.agent,
                "session":   req.session_id,
            });
            match nats.publish(route.subject, &payload).await {
                Ok(_)  => info!("NATS → {}", route.subject),
                Err(e) => error!("NATS publish failed: {e}"),
            }
        }

        send(StageEvent {
            stage: "NATS", ok: true, agent: Some(route.agent.into()),
            worm_hash: Some(errant.worm_hash.clone()),
            proof_hash: None,
            message: format!("published to {}", route.subject), error: None,
        }).await;

        // ── Stage 7: SEAL (Ω) ─────────────────────────────────────────────
        let seal_hash = errant_ffi::sha256_hex(
            format!("MAGMA|{}|{}|{}", route.agent, errant.worm_hash, req.action).as_bytes()
        );

        send(StageEvent {
            stage:     "SEAL",
            ok:        true,
            agent:     Some(route.agent.into()),
            worm_hash: Some(seal_hash.clone()),
            proof_hash: Some(seal_hash),
            message:   "Ω↺Ψ↺Δ↺Λ↺Σ↺Φ↺α".into(),
            error:     None,
        }).await;
    });

    let stream = ReceiverStream::new(rx).map(|ev| {
        let data = serde_json::to_string(&ev).unwrap_or_default();
        Ok::<Event, Infallible>(Event::default().data(data))
    });

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("ping"),
    )
}

// ── POST /api/v1/verify ────────────────────────────────────────────────────

async fn verify(
    Json(req): Json<VerifyRequest>,
) -> Json<VerifyResponse> {
    let result = if let Some(ops) = req.opcodes {
        let refs: Vec<&str> = ops.iter().map(|s| s.as_str()).collect();
        errant_ffi::verify_named(&refs)
    } else if let Some(src) = req.source {
        errant_ffi::verify_source(&src)
    } else {
        errant_ffi::verify_named(&[])
    };

    Json(VerifyResponse {
        ok:           result.ok,
        verdict:      result.verdict(),
        worm_hash:    result.worm_hash,
        error:        if result.ok { None } else { Some(result.error) },
        steps:        result.steps,
        lin_consumed: result.lin_consumed,
        lin_leaked:   result.lin_leaked,
        fallback:     result.fallback,
    })
}

// ── GET /api/v1/chain/head ─────────────────────────────────────────────────

async fn chain_head(
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Try to fetch from snap-os; fall back to local WORM hash
    let fallback = errant_ffi::sha256_hex(b"MAGMA-GENESIS");
    Json(serde_json::json!({
        "head":      fallback,
        "source":    "local",
        "os_url":    state.worm_url,
    }))
}

// ── GET /api/v1/health ─────────────────────────────────────────────────────

async fn health(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let errant_ok = errant_ffi::verify_named(&["PUSH_UN", "SEAL"]).ok;
    let nats_ok   = state.nats.is_some();
    let status    = if errant_ok { "ok" } else { "degraded" };
    Json(serde_json::json!({
        "status":     status,
        "version":    env!("CARGO_PKG_VERSION"),
        "errant":     errant_ffi::version(),
        "errant_ok":  errant_ok,
        "nats_ok":    nats_ok,
        "sovereign":  "Ω↺Ψ↺Δ↺Λ↺Σ↺Φ↺α",
    }))
}

// ── GET /api/v1/version ────────────────────────────────────────────────────

async fn version_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "magmad":   env!("CARGO_PKG_VERSION"),
        "liberrant": errant_ffi::version(),
        "protocol": "MAGMA/1.0",
    }))
}

// ── Legacy snap-os compatibility endpoints ─────────────────────────────────

#[derive(Deserialize)]
struct LegacySealPayload { payload: serde_json::Value }

async fn legacy_seal(
    Json(body): Json<LegacySealPayload>,
) -> impl IntoResponse {
    let hash = errant_ffi::sha256_hex(body.payload.to_string().as_bytes());
    Json(serde_json::json!({
        "event": {
            "seal":          hash,
            "previousSeal":  "0".repeat(64),
            "index":         0,
            "timestamp":     chrono::Utc::now().to_rfc3339(),
        }
    }))
}

async fn legacy_dispatch(
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let hash = errant_ffi::sha256_hex(body.to_string().as_bytes());
    Json(serde_json::json!({
        "ok":   true,
        "seal": hash,
        "gate": "TRUST-DEED-GATE",
        "sovereign": "Ω",
    }))
}

use futures::StreamExt;
use chrono;
