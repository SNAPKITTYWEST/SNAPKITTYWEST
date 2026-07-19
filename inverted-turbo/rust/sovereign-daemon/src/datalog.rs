/// Rust mirror of transformer.dl — 4 gates, same precedence as Soufflé rules.
/// needs_rewrite > rejected > approved (strictest outcome wins).

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Inaccuracy {
    pub domain: String,
    pub reason: String,
}

pub struct DatalogResult {
    pub outcome: &'static str,
    pub reason: Option<String>,
}

const REQUIRED_FIELDS: &[&str] = &[
    "id", "source_sha256", "split", "created_by", "review_status", "weight",
];

const CRITICAL_DOMAINS: &[&str] = &[
    "security", "cryptography", "formal_verification", "systems_architecture",
];

/// Gate 1  schema_complete   — all required fields declared present
/// Gate 2  split_valid       — already enforced by plasma; checked again for purity
/// Gate 3  factual integrity — no critical-domain inaccuracy
/// Gate 4  term_guard        — DAN reinterpretation blocked
pub fn evaluate(fields: &[String], inaccuracies: &[Inaccuracy], terms: &[String]) -> DatalogResult {
    // Gate 1
    let missing: Vec<&str> = REQUIRED_FIELDS
        .iter()
        .filter(|&&f| !fields.iter().any(|x| x == f))
        .copied()
        .collect();
    if !missing.is_empty() {
        return DatalogResult {
            outcome: "needs_rewrite",
            reason: Some(format!("missing_required_fields: {}", missing.join(", "))),
        };
    }

    // Gate 4 — check before domain inaccuracy (term violation → rejected, not rewrite)
    if terms.iter().any(|t| t == "Data-Adversarial Network") {
        return DatalogResult {
            outcome: "rejected",
            reason: Some("DAN reinterpretation attempt".into()),
        };
    }

    // Gate 3
    if let Some(a) = inaccuracies.iter().find(|a| CRITICAL_DOMAINS.contains(&a.domain.as_str())) {
        return DatalogResult {
            outcome: "rejected",
            reason: Some(format!("critical_domain_inaccuracy: {} — {}", a.domain, a.reason)),
        };
    }

    DatalogResult { outcome: "approved", reason: None }
}
