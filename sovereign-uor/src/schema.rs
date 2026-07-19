//! Object schema

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectSchema {
    pub name: String,
    pub version: String,
    pub fields: Vec<String>,
}

impl ObjectSchema {
    pub fn new(name: &str, version: &str, fields: Vec<String>) -> Self {
        Self { name: name.to_string(), version: version.to_string(), fields }
    }

    pub fn validate(&self, data: &serde_json::Value) -> bool {
        match data {
            serde_json::Value::Object(map) => self.fields.iter().all(|f| map.contains_key(f)),
            _ => false,
        }
    }
}
