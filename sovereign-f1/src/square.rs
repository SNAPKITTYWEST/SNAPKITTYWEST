//! F1 square

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct F1Square {
    pub dimension: usize,
    pub entries: Vec<Vec<f64>>,
}

impl F1Square {
    pub fn new(dimension: usize) -> Self {
        let entries = vec![vec![1.0; dimension]; dimension];
        Self { dimension, entries }
    }

    pub fn determinant(&self) -> f64 {
        // Simplified: product of diagonal
        self.entries.iter().enumerate().map(|(i, row)| row[i]).product()
    }
}
