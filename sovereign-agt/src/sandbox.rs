//! Sandbox

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sandbox {
    pub name: String,
    pub restrictions: Vec<String>,
}

impl Sandbox {
    pub fn new(name: &str, restrictions: Vec<String>) -> Self {
        Self { name: name.to_string(), restrictions }
    }

    pub fn allow(&self, action: &str) -> bool {
        !self.restrictions.iter().any(|r| action.contains(r.as_str()))
    }
}
