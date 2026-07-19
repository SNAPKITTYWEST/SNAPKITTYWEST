//! Score

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Score {
    pub value: f64,
    pub confidence: f64,
    pub primes_used: Vec<usize>,
}

impl Score {
    pub fn new(value: f64, confidence: f64) -> Self {
        Self { value, confidence, primes_used: Vec::new() }
    }

    pub fn prime_weighted(primes: &[usize], weights: &[f64]) -> f64 {
        primes.iter().zip(weights.iter()).map(|(p, w)| *p as f64 * w).sum()
    }
}
