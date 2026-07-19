//! Prime-indexed tensor

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrimeTensor {
    pub data: Vec<f64>,
    pub prime_index: usize,
    pub dimensions: Vec<usize>,
}

impl PrimeTensor {
    pub fn new(data: Vec<f64>, prime_index: usize) -> Self {
        let dims = vec![data.len()];
        Self { data, prime_index, dimensions: dims }
    }

    pub fn dot(&self, other: &Self) -> f64 {
        self.data.iter().zip(other.data.iter()).map(|(a, b)| a * b).sum()
    }

    pub fn norm(&self) -> f64 {
        self.data.iter().map(|x| x * x).sum::<f64>().sqrt()
    }

    pub fn normalize(&self) -> Self {
        let n = self.norm();
        Self {
            data: self.data.iter().map(|x| x / n).collect(),
            prime_index: self.prime_index,
            dimensions: self.dimensions.clone(),
        }
    }
}
