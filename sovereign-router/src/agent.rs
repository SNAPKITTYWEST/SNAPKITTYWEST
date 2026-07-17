//! Agent

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub name: String,
    pub domain: String,
    pub expertise: Vec<String>,
}

impl Agent {
    pub fn new(name: &str, domain: &str, expertise: Vec<String>) -> Self {
        Self { name: name.to_string(), domain: domain.to_string(), expertise }
    }

    pub fn score_query(&self, query: &str) -> usize {
        let query_lower = query.to_lowercase();
        self.expertise.iter().filter(|e| query_lower.contains(&e.to_lowercase())).count()
            + if query_lower.contains(&self.domain.to_lowercase()) { 2 } else { 0 }
    }
}
