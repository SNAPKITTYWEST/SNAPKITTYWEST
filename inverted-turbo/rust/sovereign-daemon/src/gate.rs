use axum::extract::Json;
use serde::{Deserialize, Serialize};
use tracing::instrument;

use crate::{datalog, plasma};

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct GateRequest {
    pub id: String,
    pub source_sha256: String,
    pub split: String,
    pub weight: f64,
    pub created_by: String,
    pub review_status: String,
    /// Declared field names — checked against required_field set (Gate 1)
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

#[instrument(skip(req), fields(id = %req.id, split = %req.split))]
pub async fn handle(Json(req): Json<GateRequest>) -> Json<GateResponse> {
    // Encode split string → tag matching plasma_gate.asm uint32 convention
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

    // Layer 1 — plasma gate (~5 cycle hot path equivalent)
    let pr = plasma::plasma_gate(&req.id, &req.source_sha256, split_tag, req.weight);
    if pr != plasma::PlasmaResult::Pass {
        return Json(GateResponse {
            record_id: req.id,
            plasma_result: pr.as_str().into(),
            gate_result: "rejected".into(),
            reason: Some(format!("plasma: {}", pr.as_str())),
        });
    }

    // Layer 2 — Datalog rules engine (transformer.dl gates 1–4)
    let dl = datalog::evaluate(&req.fields, &req.inaccuracies, &req.terms);
    Json(GateResponse {
        record_id: req.id,
        plasma_result: "PLASMA_PASS".into(),
        gate_result: dl.outcome.into(),
        reason: dl.reason,
    })
}
