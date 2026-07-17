//! Policy

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Policy {
    pub name: String,
    pub rules: Vec<String>,
    pub enforced: bool,
}

impl Policy {
    pub fn new(name: &str, rules: Vec<String>) -> Self {
        Self { name: name.to_string(), rules, enforced: true }
    }

    pub fn check(&self, action: &str) -> bool {
        self.enforced && self.rules.iter().any(|r| action.contains(r.as_str()))
    }
}
