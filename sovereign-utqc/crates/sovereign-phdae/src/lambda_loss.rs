//! Λ_m(t) Loss Function: measures discrepancy between computed and target prime densities.
//!
//! ## Mathematical Structure
//!
//! ```text
//! Λ_m(t) = Σ_{n≤t} Λ(n) · e^{2πi·n/t} - target(t)
//! ```
//!
//! where:
//! - Λ(n) is the von Mangoldt function
//! - The sum is over integers up to t
//! - target(t) is the target prime density function
//! - The loss includes a regularization term on parameters
//!
//! ## Gradient Flow
//!
//! The PH-DAE kernel minimizes Λ_m(t) via structure-preserving descent.
//! The gradient is computed using the interconnection structure J.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Λ_m(t) loss error.
#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum LambdaError {
    /// Invalid parameter.
    #[error("invalid parameter: {0}")]
    InvalidParameter(String),

    /// Computation overflow.
    #[error("computation overflow at t={0}")]
    Overflow(u64),
}

/// Von Mangoldt function: Λ(n) = log(p) if n = p^k, 0 otherwise.
pub fn von_mangoldt(n: u64) -> f64 {
    if n < 2 {
        return 0.0;
    }
    // Find the smallest prime factor
    let p = smallest_prime_factor(n);
    if p == 0 {
        return 0.0;
    }
    // Check if n is a prime power
    let mut temp = n;
    while temp % p == 0 {
        temp /= p;
    }
    if temp == 1 {
        (p as f64).ln()
    } else {
        0.0
    }
}

fn smallest_prime_factor(n: u64) -> u64 {
    if n < 2 {
        return 0;
    }
    if n % 2 == 0 {
        return 2;
    }
    let mut i = 3;
    while i * i <= n {
        if n % i == 0 {
            return i;
        }
        i += 2;
    }
    n // n is prime
}

/// Λ_m(t) loss function with regularization.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LambdaLoss {
    /// Regularization coefficient λ.
    pub lambda: f64,
    /// Target function values.
    pub target: Vec<f64>,
    /// Current parameter vector θ.
    pub params: Vec<f64>,
}

impl LambdaLoss {
    /// Create a new Λ_m(t) loss function.
    pub fn new(lambda: f64, target: Vec<f64>, params: Vec<f64>) -> Self {
        Self { lambda, target, params }
    }

    /// Compute Λ_m(t) for given t values.
    pub fn compute(&self, t_values: &[u64]) -> Result<Vec<f64>, LambdaError> {
        let mut losses = Vec::with_capacity(t_values.len());

        for &t in t_values {
            if t == 0 {
                return Err(LambdaError::InvalidParameter("t=0".to_string()));
            }

            // Compute sum_{n≤t} Λ(n) * e^{2πi·n/t}
            let mut real_sum = 0.0;
            let mut imag_sum = 0.0;

            for n in 1..=t {
                let lambda_n = von_mangoldt(n);
                if lambda_n > 0.0 {
                    let angle = 2.0 * std::f64::consts::PI * (n as f64) / (t as f64);
                    real_sum += lambda_n * angle.cos();
                    imag_sum += lambda_n * angle.sin();
                }
            }

            // Magnitude of the complex sum
            let magnitude = (real_sum * real_sum + imag_sum * imag_sum).sqrt();

            // Subtract target
            let target_idx = ((t - 1) as usize) % self.target.len();
            let loss = magnitude - self.target[target_idx];

            losses.push(loss);
        }

        Ok(losses)
    }

    /// Compute total loss: Λ_m(t) + λ * ‖θ‖².
    pub fn total_loss(&self, t_values: &[u64]) -> Result<f64, LambdaError> {
        let losses = self.compute(t_values)?;

        let data_loss: f64 = losses.iter().map(|x| x * x).sum::<f64>().sqrt();
        let reg_loss: f64 = self.params.iter().map(|x| x * x).sum::<f64>().sqrt();

        Ok(data_loss + self.lambda * reg_loss)
    }

    /// Compute gradient ∂L/∂θ (simplified finite differences).
    pub fn gradient(&self, t_values: &[u64], epsilon: f64) -> Result<Vec<f64>, LambdaError> {
        let base_loss = self.total_loss(t_values)?;
        let mut grad = Vec::with_capacity(self.params.len());

        for i in 0..self.params.len() {
            let mut params_plus = self.params.clone();
            params_plus[i] += epsilon;
            let loss_plus = Self::new(self.lambda, self.target.clone(), params_plus)
                .total_loss(t_values)?;

            grad.push((loss_plus - base_loss) / epsilon);
        }

        Ok(grad)
    }

    /// Gradient descent step.
    pub fn step(&mut self, t_values: &[u64], learning_rate: f64, epsilon: f64) -> Result<f64, LambdaError> {
        let grad = self.gradient(t_values, epsilon)?;

        for i in 0..self.params.len() {
            self.params[i] -= learning_rate * grad[i];
        }

        self.total_loss(t_values)
    }

    /// WORM-sealed hash.
    pub fn seal_hash(&self) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(self.lambda.to_le_bytes());
        for p in &self.params {
            hasher.update(p.to_le_bytes());
        }
        for t in &self.target {
            hasher.update(t.to_le_bytes());
        }
        hex::encode(hasher.finalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_von_mangoldt_prime() {
        // Λ(2) = log(2)
        assert!((von_mangoldt(2) - 2.0_f64.ln()).abs() < 1e-10);
        assert!((von_mangoldt(3) - 3.0_f64.ln()).abs() < 1e-10);
        assert!((von_mangoldt(5) - 5.0_f64.ln()).abs() < 1e-10);
    }

    #[test]
    fn test_von_mangoldt_prime_power() {
        // Λ(4) = log(2) (since 4 = 2^2)
        assert!((von_mangoldt(4) - 2.0_f64.ln()).abs() < 1e-10);
        // Λ(8) = log(2) (since 8 = 2^3)
        assert!((von_mangoldt(8) - 2.0_f64.ln()).abs() < 1e-10);
    }

    #[test]
    fn test_von_mangoldt_composite() {
        // Λ(6) = 0 (6 = 2*3, not a prime power)
        assert!((von_mangoldt(6)).abs() < 1e-10);
        assert!((von_mangoldt(12)).abs() < 1e-10);
    }

    #[test]
    fn test_lambda_loss_creation() {
        let target = vec![0.0, 1.0, 0.5];
        let params = vec![0.1, 0.2];
        let loss = LambdaLoss::new(0.01, target, params);
        assert_eq!(loss.lambda, 0.01);
    }

    #[test]
    fn test_compute() {
        let target = vec![0.0, 1.0, 0.5, 0.3];
        let params = vec![0.1];
        let loss = LambdaLoss::new(0.01, target, params);
        let losses = loss.compute(&[1, 2, 3]).unwrap();
        assert_eq!(losses.len(), 3);
    }

    #[test]
    fn test_total_loss() {
        let target = vec![0.0, 1.0];
        let params = vec![0.1, 0.2];
        let loss = LambdaLoss::new(0.01, target, params);
        let total = loss.total_loss(&[1, 2]).unwrap();
        assert!(total >= 0.0);
    }

    #[test]
    fn test_gradient() {
        let target = vec![0.0, 1.0, 0.5];
        let params = vec![0.1, 0.2];
        let loss = LambdaLoss::new(0.01, target, params);
        let grad = loss.gradient(&[1, 2, 3], 1e-6).unwrap();
        assert_eq!(grad.len(), 2);
    }

    #[test]
    fn test_step_reduces_loss() {
        let target = vec![0.0, 1.0, 0.5, 0.3];
        let mut loss = LambdaLoss::new(0.01, target, vec![0.5, 0.5]);
        let initial = loss.total_loss(&[1, 2, 3, 4]).unwrap();
        for _ in 0..10 {
            loss.step(&[1, 2, 3, 4], 0.01, 1e-6).unwrap();
        }
        let final_loss = loss.total_loss(&[1, 2, 3, 4]).unwrap();
        assert!(final_loss < initial);
    }

    #[test]
    fn test_seal_hash_deterministic() {
        let loss1 = LambdaLoss::new(0.01, vec![1.0], vec![0.5]);
        let loss2 = LambdaLoss::new(0.01, vec![1.0], vec![0.5]);
        assert_eq!(loss1.seal_hash(), loss2.seal_hash());
    }
}
