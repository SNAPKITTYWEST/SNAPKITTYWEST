use axum::extract::{Json, State};
use serde::{Deserialize, Serialize};
use tracing::instrument;

use crate::{
    datalog::{self, GateConfig},
    plasma,
    DaemonState,
};

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct GateRequest {
    pub id: String,
    pub source_sha256: String,
    pub split: String,
    pub weight: f64,
    pub created_by: String,
    pub review_status: String,
    /// Declared field names — checked against required_fields (Gate 1)
    #[serde(default)]
    pub fields: Vec<String>,
    /// Flagged inaccuracies — domain+reason pairs (Gate 3)
    #[serde(default)]
    pub inaccuracies: Vec<datalog::Inaccuracy>,
    /// Content terms present in record (Gate 4)
    #[serde(default)]
    pub terms: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct GateResponse {
    pub record_id: String,
    pub plasma_result: String,
    pub gate_result: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// POST /gate
///
/// Execution path:
///   1. Acquire semaphore permit — backpressure, max GATE_CONCURRENCY concurrent evals
///   2. plasma_gate (sync, no alloc) — null/bounds checks in register order
///   3. RwLock::read() on GateConfig — shared across all handlers, writers are rare
///   4. datalog::evaluate — pure fn over borrowed config, zero allocation on happy path
///   Permit drops at end of scope, slot returns to semaphore.
#[instrument(skip(state, req), fields(id = %req.id, split = %req.split))]
pub async fn handle(
    State(state): State<DaemonState>,
    Json(req): Json<GateRequest>,
) -> Json<GateResponse> {
    // Backpressure: block if GATE_CONCURRENCY slots are full
    let _permit = state.gate_semaphore.acquire().await.unwrap();

    let split_tag: u32 = match req.split.as_str() {
        "train"   => 0,
        "val"     => 1,
        "test"    => 2,
        "holdout" => 3,
        _ => {
            return Json(GateResponse {
                record_id: req.id,
                plasma_result: "FAIL_BAD_SPLIT".into(),
                gate_result: "rejected".into(),
                reason: Some("split must be train|val|test|holdout".into()),
            });
        }
    };

    // Layer 1 — plasma (sync, mirrors plasma_gate.asm register checks)
    let pr = plasma::plasma_gate(&req.id, &req.source_sha256, split_tag, req.weight);
    if pr != plasma::PlasmaResult::Pass {
        return Json(GateResponse {
            record_id: req.id,
            plasma_result: pr.as_str().into(),
            gate_result: "rejected".into(),
            reason: Some(format!("plasma: {}", pr.as_str())),
        });
    }

    // Layer 2 — Datalog rules (shared config, many-reader RwLock)
    let config = state.gate_config.read().await;
    let dl = datalog::evaluate(&req.fields, &req.inaccuracies, &req.terms, &config);
    Json(GateResponse {
        record_id: req.id,
        plasma_result: "PLASMA_PASS".into(),
        gate_result: dl.outcome.into(),
        reason: dl.reason,
    })
}

/// PATCH /gate/config
///
/// Hot-reload gate rules without process restart.
/// Acquires the write lock (exclusive), swaps config, releases.
/// All in-flight reads finish before the write proceeds.
pub async fn patch_config(
    State(state): State<DaemonState>,
    Json(new_config): Json<GateConfig>,
) -> Json<GateConfig> {
    let mut config = state.gate_config.write().await;
    *config = new_config;
    Json(config.clone())
}
