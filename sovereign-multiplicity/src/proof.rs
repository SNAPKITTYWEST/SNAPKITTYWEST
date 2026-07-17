//! Proof

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proof {
    pub theorem: String,
    pub steps: Vec<String>,
    pub valid: bool,
}

impl Proof {
    pub fn new(theorem: &str) -> Self {
        Self { theorem: theorem.to_string(), steps: Vec::new(), valid: false }
    }

    pub fn add_step(&mut self, step: &str) {
        self.steps.push(step.to_string());
    }

    pub fn verify(&mut self) -> bool {
        self.valid = !self.steps.is_empty();
        self.valid
    }
}
