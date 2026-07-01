//! Structure-preserving matrix types for PH-DAE systems.
//!
//! - `SkewSymMatrix`: Enforces J = -J^T (skew-symmetric interconnection)
//! - `PsdMatrix`: Enforces R = R^T >= 0 (positive semi-definite dissipation)

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Matrix error type.
#[derive(Error, Debug, Clone, PartialEq)]
pub enum MatrixError {
    /// Matrix is not square.
    #[error("matrix is not {0}x{0}, got {1}x{2}")]
    NotSquare(usize, usize, usize),

    /// Matrix is not skew-symmetric.
    #[error("matrix is not skew-symmetric: J[{row}][{col}] = {val} != -{expected}")]
    NotSkewSymmetric {
        /// Row index.
        row: usize,
        /// Column index.
        col: usize,
        /// Actual value.
        val: f64,
        /// Expected negative value.
        expected: f64,
    },

    /// Matrix is not PSD.
    #[error("matrix is not positive semi-definite: Cholesky failed at step {0}")]
    NotPsd(usize),

    /// Cholesky decomposition failed.
    #[error("Cholesky decomposition failed: {0}")]
    CholeskyFailed(String),

    /// Inconsistent dimensions.
    #[error("dimension mismatch: {0} != {1}")]
    DimensionMismatch(usize, usize),
}

/// Skew-symmetric matrix (J = -J^T).
///
/// Enforces the interconnection structure of Port-Hamiltonian systems.
/// Properties: J_ij = -J_ji, J_ii = 0.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkewSymMatrix(pub Vec<Vec<f64>>);

impl SkewSymMatrix {
    /// Create new skew-symmetric matrix from a square matrix.
    /// Verifies J = -J^T at construction time.
    pub fn new(data: Vec<Vec<f64>>) -> Result<Self, MatrixError> {
        let n = data.len();
        for row in &data {
            if row.len() != n {
                return Err(MatrixError::NotSquare(n, n, row.len()));
            }
        }

        // Verify skew-symmetry: J[i][j] = -J[j][i]
        for i in 0..n {
            for j in (i + 1)..n {
                let expected = -data[j][i];
                if (data[i][j] - expected).abs() > 1e-12 {
                    return Err(MatrixError::NotSkewSymmetric {
                        row: i,
                        col: j,
                        val: data[i][j],
                        expected,
                    });
                }
            }
        }

        Ok(Self(data))
    }

    /// Create skew-symmetric matrix by anti-symmetrizing: J = (A - A^T) / 2.
    pub fn from_antisymmetrize(data: Vec<Vec<f64>>) -> Result<Self, MatrixError> {
        let n = data.len();
        let mut result = vec![vec![0.0; n]; n];
        for i in 0..n {
            for j in 0..n {
                result[i][j] = (data[i][j] - data[j][i]) / 2.0;
            }
        }
        Self::new(result)
    }

    /// Validate skew-symmetry.
    pub fn validate_skew_symmetric(&self) -> Result<(), MatrixError> {
        let n = self.0.len();
        for i in 0..n {
            for j in (i + 1)..n {
                let expected = -self.0[j][i];
                if (self.0[i][j] - expected).abs() > 1e-12 {
                    return Err(MatrixError::NotSkewSymmetric {
                        row: i,
                        col: j,
                        val: self.0[i][j],
                        expected,
                    });
                }
            }
        }
        Ok(())
    }

    /// Multiply J * v.
    pub fn mul_vec(&self, v: &[f64]) -> Vec<f64> {
        let n = self.0.len();
        let mut result = vec![0.0; n];
        for i in 0..n {
            for j in 0..n {
                result[i] += self.0[i][j] * v[j];
            }
        }
        result
    }

    /// Get dimension.
    pub fn dim(&self) -> usize {
        self.0.len()
    }
}

/// Positive semi-definite matrix (R = R^T >= 0).
///
/// Enforces the dissipation structure of Port-Hamiltonian systems.
/// Provides Cholesky witness as proof of PSD-ness.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PsdMatrix {
    /// The matrix data.
    pub data: Vec<Vec<f64>>,
    /// Cholesky factor L (witness that R = L * L^T >= 0).
    pub cholesky: Vec<Vec<f64>>,
}

impl PsdMatrix {
    /// Create new PSD matrix with Cholesky verification.
    pub fn new(data: Vec<Vec<f64>>) -> Result<Self, MatrixError> {
        let n = data.len();
        for row in &data {
            if row.len() != n {
                return Err(MatrixError::NotSquare(n, n, row.len()));
            }
        }

        // Verify symmetry
        for i in 0..n {
            for j in (i + 1)..n {
                if (data[i][j] - data[j][i]).abs() > 1e-12 {
                    return Err(MatrixError::NotPsd(0));
                }
            }
        }

        // Cholesky decomposition
        let cholesky = Self::cholesky(&data)?;

        Ok(Self { data, cholesky })
    }

    /// Cholesky decomposition: R = L * L^T.
    fn cholesky(r: &[Vec<f64>]) -> Result<Vec<Vec<f64>>, MatrixError> {
        let n = r.len();
        let mut l = vec![vec![0.0; n]; n];

        for i in 0..n {
            for j in 0..=i {
                let mut sum = 0.0;
                for k in 0..j {
                    sum += l[i][k] * l[j][k];
                }

                if i == j {
                    let diag = r[i][i] - sum;
                    if diag <= 0.0 {
                        return Err(MatrixError::NotPsd(i));
                    }
                    l[i][j] = diag.sqrt();
                } else {
                    let ljj = l[j][j];
                    if ljj.abs() < 1e-12 {
                        return Err(MatrixError::CholeskyFailed(
                            format!("L[{j}][{j}] is zero"),
                        ));
                    }
                    l[i][j] = (r[i][j] - sum) / ljj;
                }
            }
        }

        Ok(l)
    }

    /// Validate PSD (Cholesky witness exists).
    pub fn validate_psd(&self) -> Result<(), MatrixError> {
        // Re-verify Cholesky
        let _ = Self::cholesky(&self.data)?;
        Ok(())
    }

    /// Multiply R * v.
    pub fn mul_vec(&self, v: &[f64]) -> Vec<f64> {
        let n = self.data.len();
        let mut result = vec![0.0; n];
        for i in 0..n {
            for j in 0..n {
                result[i] += self.data[i][j] * v[j];
            }
        }
        result
    }

    /// Get dimension.
    pub fn dim(&self) -> usize {
        self.data.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_skew_symmetric_valid() {
        let j = SkewSymMatrix::new(vec![
            vec![0.0, 1.0],
            vec![-1.0, 0.0],
        ]);
        assert!(j.is_ok());
    }

    #[test]
    fn test_skew_symmetric_invalid() {
        let j = SkewSymMatrix::new(vec![
            vec![0.0, 1.0],
            vec![1.0, 0.0], // Not skew-symmetric
        ]);
        assert!(j.is_err());
    }

    #[test]
    fn test_skew_symmetric_from_antisymmetrize() {
        let a = vec![
            vec![1.0, 2.0],
            vec![3.0, 4.0],
        ];
        let j = SkewSymMatrix::from_antisymmetrize(a).unwrap();
        // J = (A - A^T) / 2 = [[0, -0.5], [0.5, 0]]
        assert!((j.0[0][0]).abs() < 1e-10);
        assert!((j.0[0][1] - (-0.5)).abs() < 1e-10);
        assert!((j.0[1][0] - 0.5).abs() < 1e-10);
    }

    #[test]
    fn test_psd_valid() {
        let r = PsdMatrix::new(vec![
            vec![1.0, 0.0],
            vec![0.0, 1.0],
        ]);
        assert!(r.is_ok());
    }

    #[test]
    fn test_psd_not_psd() {
        let r = PsdMatrix::new(vec![
            vec![1.0, 2.0],
            vec![2.0, 1.0],
        ]);
        assert!(r.is_err());
    }

    #[test]
    fn test_psd_diagonal() {
        let r = PsdMatrix::new(vec![
            vec![0.1, 0.0],
            vec![0.0, 0.1],
        ]).unwrap();
        let v = vec![1.0, 2.0];
        let rv = r.mul_vec(&v);
        assert!((rv[0] - 0.1).abs() < 1e-10);
        assert!((rv[1] - 0.2).abs() < 1e-10);
    }

    #[test]
    fn test_skew_mul_vec() {
        let j = SkewSymMatrix::new(vec![
            vec![0.0, 1.0],
            vec![-1.0, 0.0],
        ]).unwrap();
        let v = vec![1.0, 0.0];
        let jv = j.mul_vec(&v);
        assert!((jv[0]).abs() < 1e-10); // J*v = [0, -1]
        assert!((jv[1] - (-1.0)).abs() < 1e-10);
    }
}
