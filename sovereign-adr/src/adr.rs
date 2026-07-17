//! Architecture Decision Records

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DecisionStatus {
    Proposed,
    Accepted,
    Deprecated,
    Superseded,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchitectureDecision {
    pub id: u64,
    pub title: String,
    pub context: String,
    pub decision: String,
    pub consequences: String,
    pub status: DecisionStatus,
    pub seal: Option<String>,
}

impl ArchitectureDecision {
    pub fn new(id: u64, title: &str, context: &str, decision: &str, consequences: &str) -> Self {
        use sha2::{Sha256, Digest};
        let raw = format!("{}:{}:{}:{}", id, title, decision, context);
        let hash = format!("{:x}", Sha256::digest(raw.as_bytes()));
        Self {
            id, title: title.to_string(), context: context.to_string(),
            decision: decision.to_string(), consequences: consequences.to_string(),
            status: DecisionStatus::Proposed, seal: Some(hash),
        }
    }

    pub fn accept(&mut self) { self.status = DecisionStatus::Accepted; }
    pub fn deprecate(&mut self) { self.status = DecisionStatus::Deprecated; }
}
