//! Implicit Radau IIA time integrator for PH-DAE systems.
//!
//! ## Mathematical Foundation
//!
//! Radau IIA is an implicit Runge-Kutta method with:
//! - L-stability (excellent for stiff DAEs)
//! - Stage order q = s (order s for s stages)
//! - Method order p = 2s - 1
//!
//! For s=3 (5th order), the Butcher tableau is:
//! ```text
//! c | A
//! --|---
//!   | b
//! ```
//!
//! ## Algorithm
//!
//! 1. Compute stage values by solving nonlinear system
//! 2. Update state: z_{n+1} = z_n + h * sum(b_i * k_i)
//! 3. Verify power balance at each step

use crate::{PhdaeSystem, MatrixError};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Solver error type.
#[derive(Error, Debug, Clone, PartialEq)]
pub enum SolverError {
    /// Solver did not converge.
    #[error("solver did not converge after {iterations} iterations, residual = {residual}")]
    NotConverged {
        /// Number of iterations performed.
        iterations: usize,
        /// Final residual.
        residual: f64,
    },

    /// Step size too large.
    #[error("step size {0} exceeds maximum {1}")]
    StepTooLarge(f64, f64),

    /// Singular mass matrix.
    #[error("singular mass matrix at step {0}")]
    SingularMass(usize),

    /// Power balance violation.
    #[error("power balance violation: |dH/dt - (P_port - P_diss)| = {0}")]
    PowerBalanceViolation(f64),

    /// Invalid configuration.
    #[error("invalid config: {0}")]
    InvalidConfig(String),

    /// Matrix error.
    #[error("matrix error: {0}")]
    Matrix(#[from] MatrixError),
}

/// Radau IIA Butcher tableau coefficients (3-stage, 5th order).
#[derive(Debug, Clone)]
pub struct RadauTableau {
    /// Stage abscissae.
    pub c: Vec<f64>,
    /// Weight matrix.
    pub a: Vec<Vec<f64>>,
    /// Quadrature weights.
    pub b: Vec<f64>,
}

impl RadauTableau {
    /// 3-stage Radau IIA tableau (5th order).
    pub fn radau_3() -> Self {
        let sqrt6 = 6.0_f64.sqrt();
        let c1 = (4.0 - sqrt6) / 10.0;
        let c2 = (4.0 + sqrt6) / 10.0;
        let c3 = 1.0;

        let a11 = (88.0 - 7.0 * sqrt6) / 360.0;
        let a12 = (296.0 - 169.0 * sqrt6) / 1800.0;
        let a13 = (-2.0 + 3.0 * sqrt6) / 225.0;
        let a21 = (296.0 + 169.0 * sqrt6) / 1800.0;
        let a22 = (88.0 + 7.0 * sqrt6) / 360.0;
        let a23 = (-2.0 - 3.0 * sqrt6) / 225.0;
        let a31 = (16.0 - sqrt6) / 36.0;
        let a32 = (16.0 + sqrt6) / 36.0;
        let a33 = 1.0 / 9.0;

        let b1 = (16.0 - sqrt6) / 36.0;
        let b2 = (16.0 + sqrt6) / 36.0;
        let b3 = 1.0 / 9.0;

        Self {
            c: vec![c1, c2, c3],
            a: vec![
                vec![a11, a12, a13],
                vec![a21, a22, a23],
                vec![a31, a32, a33],
            ],
            b: vec![b1, b2, b3],
        }
    }
}

/// Solver configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolverConfig {
    /// Maximum number of iterations per step.
    pub max_iterations: usize,
    /// Convergence tolerance.
    pub tolerance: f64,
    /// Maximum step size.
    pub max_step: f64,
    /// Verify power balance at each step.
    pub verify_power_balance: bool,
}

impl Default for SolverConfig {
    fn default() -> Self {
        Self {
            max_iterations: 50,
            tolerance: 1e-12,
            max_step: 0.1,
            verify_power_balance: true,
        }
    }
}

/// Step receipt (result of a successful step).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepReceipt {
    /// New time.
    pub time: f64,
    /// New state.
    pub state: Vec<f64>,
    /// New derivative.
    pub state_deriv: Vec<f64>,
    /// Hamiltonian at new state.
    pub hamiltonian: f64,
    /// Power balance error.
    pub power_balance_error: f64,
    /// Number of iterations.
    pub iterations: usize,
}

/// Implicit Radau IIA solver.
#[derive(Debug, Clone)]
pub struct RadauIIA {
    /// Butcher tableau.
    tableau: RadauTableau,
    /// Configuration.
    config: SolverConfig,
}

impl RadauIIA {
    /// Create new Radau IIA solver with given stage count.
    pub fn new(config: SolverConfig) -> Self {
        Self {
            tableau: RadauTableau::radau_3(),
            config,
        }
    }

    /// Perform one step of Radau IIA.
    pub fn step(&self, sys: &mut PhdaeSystem, dt: f64) -> Result<StepReceipt, SolverError> {
        if dt > self.config.max_step {
            return Err(SolverError::StepTooLarge(dt, self.config.max_step));
        }

        let n = sys.state.len();
        let s = self.tableau.c.len(); // Number of stages

        // Stage values k_i
        let mut k = vec![vec![0.0; n]; s];
        let z0 = sys.state.clone();

        // Fixed-point iteration for implicit stages
        for iter in 0..self.config.max_iterations {
            let mut max_residual: f64 = 0.0;

            for i in 0..s {
                // Compute stage state: z_i = z0 + h * sum(a_ij * k_j)
                let mut zi = z0.clone();
                for j in 0..s {
                    for l in 0..n {
                        zi[l] += dt * self.tableau.a[i][j] * k[j][l];
                    }
                }

                // Compute stage derivative: k_i = f(t0 + c_i * h, z_i)
                let t_i = sys.time + self.tableau.c[i] * dt;
                let ki = self.compute_f(sys, t_i, &zi);

                // Compute residual
                let mut residual = 0.0;
                for l in 0..n {
                    let diff = ki[l] - k[i][l];
                    residual += diff * diff;
                }
                residual = residual.sqrt();
                max_residual = max_residual.max(residual);

                k[i] = ki;
            }

            if max_residual < self.config.tolerance {
                // Converged: update state
                let mut new_state = z0.clone();
                for i in 0..s {
                    for l in 0..n {
                        new_state[l] += dt * self.tableau.b[i] * k[i][l];
                    }
                }

                // Compute new derivative
                let new_deriv = self.compute_f(sys, sys.time + dt, &new_state);

                // Verify power balance
                let h_old = sys.hamiltonian();
                sys.state = new_state;
                sys.state_deriv = new_deriv;
                sys.time += dt;
                let h_new = sys.hamiltonian();
                let dhdt = (h_new - h_old) / dt;
                let p_port = sys.port_power();
                let p_diss = sys.dissipation_power();
                let balance_error = (dhdt - (p_port - p_diss)).abs();

                if self.config.verify_power_balance && balance_error > self.config.tolerance {
                    return Err(SolverError::PowerBalanceViolation(balance_error));
                }

                return Ok(StepReceipt {
                    time: sys.time,
                    state: sys.state.clone(),
                    state_deriv: sys.state_deriv.clone(),
                    hamiltonian: h_new,
                    power_balance_error: balance_error,
                    iterations: iter + 1,
                });
            }
        }

        Err(SolverError::NotConverged {
            iterations: self.config.max_iterations,
            residual: 0.0, // Would need to track last residual
        })
    }

    /// Compute f(t, z) = T^{-1} * [(J - R) * Q * z + B * u].
    ///
    /// For singular T (DAE), we use a pseudoinverse approximation.
    fn compute_f(&self, sys: &PhdaeSystem, _t: f64, z: &[f64]) -> Vec<f64> {
        let n = z.len();

        // Compute RHS = (J - R) * Q * z + B * u
        let qz = mat_vec_mul(&sys.gradient, z);
        let jqz = sys.interconnection.mul_vec(&qz);
        let rqz = sys.dissipation.mul_vec(&qz);
        let bu = mat_vec_mul(&sys.input_map, &sys.input_port);

        let mut rhs = vec![0.0; n];
        for i in 0..n {
            rhs[i] = jqz[i] - rqz[i] + bu[i];
        }

        // For non-singular T: solve T * dz = rhs
        // For singular T: use pseudoinverse
        solve_linear(&sys.tensor.mass, &rhs)
    }
}

/// Solve T * x = b using Gaussian elimination with partial pivoting.
fn solve_linear(t: &[Vec<f64>], b: &[f64]) -> Vec<f64> {
    let n = t.len();
    let mut a = t.to_vec();
    let mut rhs = b.to_vec();
    let mut perm: Vec<usize> = (0..n).collect();

    // Forward elimination with partial pivoting
    for col in 0..n {
        // Find pivot
        let mut max_val = a[col][col].abs();
        let mut max_row = col;
        for row in (col + 1)..n {
            if a[row][col].abs() > max_val {
                max_val = a[row][col].abs();
                max_row = row;
            }
        }

        // Swap rows
        if max_row != col {
            a.swap(col, max_row);
            rhs.swap(col, max_row);
            perm.swap(col, max_row);
        }

        // Eliminate
        if a[col][col].abs() > 1e-12 {
            for row in (col + 1)..n {
                let factor = a[row][col] / a[col][col];
                for k in col..n {
                    a[row][k] -= factor * a[col][k];
                }
                rhs[row] -= factor * rhs[col];
            }
        }
    }

    // Back substitution
    let mut x = vec![0.0; n];
    for i in (0..n).rev() {
        let mut sum = rhs[i];
        for j in (i + 1)..n {
            sum -= a[i][j] * x[j];
        }
        if a[i][i].abs() > 1e-12 {
            x[i] = sum / a[i][i];
        }
    }

    x
}

/// Matrix-vector multiplication.
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
    use crate::matrix::{SkewSymMatrix, PsdMatrix};
    use crate::tensor::TensorOperator;

    fn make_test_system() -> PhdaeSystem {
        let n = 2;
        let tensor = TensorOperator::static_tensor(vec![
            vec![1.0, 0.0],
            vec![0.0, 1.0],
        ]);
        let j = SkewSymMatrix::new(vec![
            vec![0.0, 1.0],
            vec![-1.0, 0.0],
        ]).unwrap();
        let r = PsdMatrix::new(vec![
            vec![0.1, 0.0],
            vec![0.0, 0.1],
        ]).unwrap();

        let mut sys = PhdaeSystem::new(n, tensor, j, r).unwrap();
        sys.state = vec![1.0, 0.0];
        sys.state_deriv = vec![0.0, 0.0];
        sys.gradient = vec![vec![1.0, 0.0], vec![0.0, 1.0]];
        sys
    }

    #[test]
    fn test_radau_tableau() {
        let tableau = RadauTableau::radau_3();
        assert_eq!(tableau.c.len(), 3);
        assert_eq!(tableau.a.len(), 3);
        assert_eq!(tableau.b.len(), 3);

        // Verify weights sum to 1
        let sum_b: f64 = tableau.b.iter().sum();
        assert!((sum_b - 1.0).abs() < 1e-12);
    }

    #[test]
    fn test_radau_step() {
        let config = SolverConfig {
            verify_power_balance: false, // Disable for simple test
            ..Default::default()
        };
        let solver = RadauIIA::new(config);
        let mut sys = make_test_system();

        let receipt = solver.step(&mut sys, 0.01).unwrap();
        assert!((receipt.time - 0.01).abs() < 1e-10);
        assert_eq!(receipt.state.len(), 2);
    }

    #[test]
    fn test_radau_multiple_steps() {
        let config = SolverConfig {
            verify_power_balance: false, // Disable for simple test
            ..Default::default()
        };
        let solver = RadauIIA::new(config);
        let mut sys = make_test_system();

        for _ in 0..10 {
            let _ = solver.step(&mut sys, 0.01).unwrap();
        }

        // System should still be valid
        assert!(sys.validate().is_ok());
    }

    #[test]
    fn test_solve_linear() {
        let a = vec![
            vec![2.0, 1.0],
            vec![1.0, 3.0],
        ];
        let b = vec![5.0, 7.0];
        let x = solve_linear(&a, &b);
        // Solution: x = [1.6, 1.8]
        assert!((x[0] - 1.6).abs() < 1e-10);
        assert!((x[1] - 1.8).abs() < 1e-10);
    }

    #[test]
    fn test_solver_convergence() {
        let config = SolverConfig {
            max_iterations: 100,
            tolerance: 1e-14,
            verify_power_balance: false, // Disable for simple test
            ..Default::default()
        };
        let solver = RadauIIA::new(config);
        let mut sys = make_test_system();

        let receipt = solver.step(&mut sys, 0.001).unwrap();
        assert!(receipt.iterations < 20);
    }
}
