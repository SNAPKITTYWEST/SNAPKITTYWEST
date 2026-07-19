//! Recursive evolution operator

use crate::tensor::PrimeTensor;

#[derive(Debug, Clone)]
pub struct RecursiveEvolution {
    pub alpha: f64,
    pub steps: usize,
}

impl RecursiveEvolution {
    pub fn new(alpha: f64) -> Self {
        Self { alpha, steps: 0 }
    }

    pub fn step(&mut self, tensor: &PrimeTensor) -> PrimeTensor {
        self.steps += 1;
        let data = tensor.data.iter().enumerate().map(|(i, &x)| {
            let prime_weight = 1.0 / (i as f64 + 1.0).sqrt();
            x * (1.0 - self.alpha) + prime_weight * self.alpha
        }).collect();
        PrimeTensor::new(data, tensor.prime_index)
    }

    pub fn contractivity(&self) -> f64 {
        1.0 - self.alpha
    }
}
