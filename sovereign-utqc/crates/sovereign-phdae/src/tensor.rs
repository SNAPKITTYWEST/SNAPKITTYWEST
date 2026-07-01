//! Tensor operator for Port-Hamiltonian systems.
//!
//! Implements the mass tensor T(t,z) and its time derivative.
//!
//! ## Key Property
//!
//! The total derivative of T*z includes the implicit term:
//! ```text
//! d/dt(T*z) = T*dz/dt + (dT/dt)*z
//! ```
//!
//! This is the CORRECT formulation for DAEs where T may be singular.

use serde::{Deserialize, Serialize};
use crate::matrix::MatrixError;

/// Tensor operator T(t,z) with mass matrix and time derivative.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TensorOperator {
    /// Mass matrix T.
    pub mass: Vec<Vec<f64>>,
    /// Time derivative dT/dt (augmented mass matrix correction).
    pub dmass_dt: Vec<Vec<f64>>,
}

impl TensorOperator {
    /// Create new tensor operator.
    pub fn new(mass: Vec<Vec<f64>>, dmass_dt: Vec<Vec<f64>>) -> Self {
        Self { mass, dmass_dt }
    }

    /// Create static tensor (dT/dt = 0).
    pub fn static_tensor(mass: Vec<Vec<f64>>) -> Self {
        let n = mass.len();
        Self {
            mass,
            dmass_dt: vec![vec![0.0; n]; n],
        }
    }

    /// Compute T * v (mass contraction).
    pub fn contract(&self, v: &[f64]) -> Vec<f64> {
        mat_vec_mul(&self.mass, v)
    }

    /// Compute (dT/dt) * v (time derivative contribution).
    pub fn time_derivative_contract(&self, v: &[f64]) -> Vec<f64> {
        mat_vec_mul(&self.dmass_dt, v)
    }

    /// Compute d/dt(T*z) = T*dz/dt + (dT/dt)*z.
    ///
    /// This is the CORRECT total derivative for the DAE formulation.
    /// The implicit derivative term (dT/dt)*z is critical for DAE index reduction.
    pub fn total_derivative(&self, z: &[f64], dz: &[f64]) -> Vec<f64> {
        let t_dz = self.contract(dz);
        let dtdt_z = self.time_derivative_contract(z);

        let n = z.len();
        let mut result = vec![0.0; n];
        for i in 0..n {
            result[i] = t_dz[i] + dtdt_z[i];
        }
        result
    }

    /// Validate tensor dimensions.
    pub fn validate(&self) -> Result<(), MatrixError> {
        let n = self.mass.len();
        for row in &self.mass {
            if row.len() != n {
                return Err(MatrixError::NotSquare(n, n, row.len()));
            }
        }
        for row in &self.dmass_dt {
            if row.len() != n {
                return Err(MatrixError::NotSquare(n, n, row.len()));
            }
        }
        Ok(())
    }

    /// Get dimension.
    pub fn dim(&self) -> usize {
        self.mass.len()
    }
}

/// Matrix-vector multiplication helper.
fn mat_vec_mul(m: &[Vec<f64>], v: &[f64]) -> Vec<f64> {
    let n = m.len();
    let mut result = vec![0.0; n];
    for i in 0..n {
        for j in 0..v.len() {
            result[i] += m[i][j] * v[j];
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tensor_creation() {
        let t = TensorOperator::new(
            vec![vec![1.0, 0.0], vec![0.0, 1.0]],
            vec![vec![0.0, 0.0], vec![0.0, 0.0]],
        );
        assert_eq!(t.dim(), 2);
        assert!(t.validate().is_ok());
    }

    #[test]
    fn test_tensor_static() {
        let t = TensorOperator::static_tensor(vec![
            vec![2.0, 0.0],
            vec![0.0, 2.0],
        ]);
        let z = vec![1.0, 1.0];
        let tz = t.contract(&z);
        assert!((tz[0] - 2.0).abs() < 1e-10);
        assert!((tz[1] - 2.0).abs() < 1e-10);
    }

    #[test]
    fn test_total_derivative_static() {
        let t = TensorOperator::static_tensor(vec![
            vec![1.0, 0.0],
            vec![0.0, 1.0],
        ]);
        let z = vec![1.0, 2.0];
        let dz = vec![3.0, 4.0];
        let td = t.total_derivative(&z, &dz);
        // For static T: d/dt(T*z) = T*dz = dz
        assert!((td[0] - 3.0).abs() < 1e-10);
        assert!((td[1] - 4.0).abs() < 1e-10);
    }

    #[test]
    fn test_total_derivative_dynamic() {
        let t = TensorOperator::new(
            vec![vec![1.0, 0.0], vec![0.0, 1.0]],
            vec![vec![0.1, 0.0], vec![0.0, 0.2]], // dT/dt
        );
        let z = vec![1.0, 2.0];
        let dz = vec![0.0, 0.0];
        let td = t.total_derivative(&z, &dz);
        // For dz=0: d/dt(T*z) = (dT/dt)*z = [0.1, 0.4]
        assert!((td[0] - 0.1).abs() < 1e-10);
        assert!((td[1] - 0.4).abs() < 1e-10);
    }
}
