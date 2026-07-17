//! Universal Object

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UniversalObject {
    pub id: String,
    pub schema: String,
    pub data: serde_json::Value,
    pub seal: Option<String>,
}

impl UniversalObject {
    pub fn new(id: &str, schema: &str, data: serde_json::Value) -> Self {
        use sha2::{Sha256, Digest};
        let raw = serde_json::to_string(&data).unwrap_or_default();
        let hash = format!("{:x}", Sha256::digest(raw.as_bytes()));
        Self { id: id.to_string(), schema: schema.to_string(), data, seal: Some(hash) }
    }

    pub fn verify(&self) -> bool {
        use sha2::{Sha256, Digest};
        let raw = serde_json::to_string(&self.data).unwrap_or_default();
        let expected = format!("{:x}", Sha256::digest(raw.as_bytes()));
        self.seal.as_deref() == Some(&expected)
    }
}
