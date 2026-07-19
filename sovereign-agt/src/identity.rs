//! Agent identity

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentIdentity {
    pub name: String,
    pub role: String,
    pub permissions: Vec<String>,
}

impl AgentIdentity {
    pub fn new(name: &str, role: &str, permissions: Vec<String>) -> Self {
        Self { name: name.to_string(), role: role.to_string(), permissions }
    }

    pub fn can(&self, permission: &str) -> bool {
        self.permissions.iter().any(|p| p == permission)
    }
}
