/// Rust mirror of transformer.dl — 4 gates, same precedence as Soufflé rules.
/// needs_rewrite > rejected > approved (strictest outcome wins).
///
/// GateConfig is wrapped in Arc<RwLock<>> in DaemonState so rules are
/// hot-reloadable via PATCH /gate/config without a process restart.

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct Inaccuracy {
    pub domain: String,
    pub reason: String,
}

pub struct DatalogResult {
    pub outcome: &'static str,
    pub reason: Option<String>,
}

/// Runtime-configurable rule set. Defaults match transformer.dl exactly.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GateConfig {
    pub required_fields:  Vec<String>,
    pub critical_domains: Vec<String>,
    pub prohibited_terms: Vec<String>,
}

impl Default for GateConfig {
    fn default() -> Self {
        Self {
            required_fields: ["id", "source_sha256", "split", "created_by", "review_status", "weight"]
                .iter().map(|s| s.to_string()).collect(),
            critical_domains: ["security", "cryptography", "formal_verification", "systems_architecture"]
                .iter().map(|s| s.to_string()).collect(),
            // DAN = "Do Anything Now" — reinterpretation as "Data-Adversarial Network" is the attack
            prohibited_terms: vec!["Data-Adversarial Network".into()],
        }
    }
}

/// Gate 1  schema_complete   — all required_fields present
/// Gate 4  term_guard        — prohibited_terms rejected before domain check
/// Gate 3  factual integrity — no critical_domain inaccuracy
pub fn evaluate(
    fields: &[String],
    inaccuracies: &[Inaccuracy],
    terms: &[String],
    config: &GateConfig,
) -> DatalogResult {
    // Gate 1
    let missing: Vec<&str> = config.required_fields
        .iter()
        .filter(|f| !fields.iter().any(|x| x == *f))
        .map(|s| s.as_str())
        .collect();
    if !missing.is_empty() {
        return DatalogResult {
            outcome: "needs_rewrite",
            reason: Some(format!("missing_required_fields: {}", missing.join(", "))),
        };
    }

    // Gate 4 — term violation → rejected (higher precedence than domain inaccuracy)
    if terms.iter().any(|t| config.prohibited_terms.contains(t)) {
        return DatalogResult {
            outcome: "rejected",
            reason: Some("DAN reinterpretation attempt".into()),
        };
    }

    // Gate 3
    if let Some(a) = inaccuracies.iter().find(|a| config.critical_domains.contains(&a.domain)) {
        return DatalogResult {
            outcome: "rejected",
            reason: Some(format!("critical_domain_inaccuracy: {} — {}", a.domain, a.reason)),
        };
    }

    DatalogResult { outcome: "approved", reason: None }
}
