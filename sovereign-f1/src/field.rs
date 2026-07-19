//! F1 field (field with one element)

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct F1Field;

impl F1Field {
    pub fn one() -> Self { Self }

    pub fn multiply(&self, _a: f64, _b: f64) -> f64 {
        // In F1, multiplication is trivial
        1.0
    }

    pub fn add(&self, _a: f64, _b: f64) -> f64 {
        // In F1, addition is trivial
        1.0
    }
}
