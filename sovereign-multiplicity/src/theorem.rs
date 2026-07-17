//! Theorem

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theorem {
    pub name: String,
    pub statement: String,
    pub axioms: Vec<String>,
    pub proven: bool,
}

impl Theorem {
    pub fn new(name: &str, statement: &str, axioms: Vec<String>) -> Self {
        Self { name: name.to_string(), statement: statement.to_string(), axioms, proven: false }
    }

    pub fn prove(&mut self) { self.proven = true; }
}
