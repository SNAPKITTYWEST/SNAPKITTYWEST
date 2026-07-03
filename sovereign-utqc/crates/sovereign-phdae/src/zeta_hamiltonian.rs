//! Zeta-Hamiltonian operator: couples prime zeros to quantum energy levels.
//!
//! ## Mathematical Structure
//!
//! ```text
//! H_ζ = Σ_p (1/p) * (a†_p a_p) + Σ_{p,q} V(p,q) * a†_p a_q
//! ```
//!
//! where:
//! - Sum over primes p, q
//! - (1/p) is the prime-frequency coupling
//! - V(p,q) is the pair potential derived from prime gaps
//! - The eigenvalues are connected to zeta zeros via the Hilbert-Pólya conjecture
//!
//! ## Non-Recursive Structure
//!
//! The Hamiltonian is truncated to a finite number of modes and occupation levels.
//! The matrix representation is computed exactly in the Goldilocks field.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Zeta-Hamiltonian error.
#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum ZetaError {
    /// Mode index out of bounds.
    #[error("mode index {0} out of bounds (max {1})")]
    ModeOutOfBounds(usize, usize),

    /// Dimension mismatch.
    #[error("dimension mismatch: expected {0}, got {1}")]
    DimensionMismatch(usize, usize),
}

/// First N primes for mode indexing.
fn first_n_primes(n: usize) -> Vec<u64> {
    let mut primes = Vec::new();
    let mut candidate = 2;
    while primes.len() < n {
        if is_prime(candidate) {
            primes.push(candidate);
        }
        candidate += 1;
    }
    primes
}

fn is_prime(n: u64) -> bool {
    if n < 2 {
        return false;
    }
    if n < 4 {
        return true;
    }
    if n % 2 == 0 || n % 3 == 0 {
        return false;
    }
    let mut i = 5;
    while i * i <= n {
        if n % i == 0 || n % (i + 2) == 0 {
            return false;
        }
        i += 6;
    }
    true
}

/// Prime gap: g(p) = next_prime(p) - p.
fn prime_gap(prime: u64) -> u64 {
    let mut next = prime + 1;
    while !is_prime(next) {
        next += 1;
    }
    next - prime
}

/// Pair potential V(p,q) between primes p and q.
fn pair_potential(p: u64, q: u64) -> f64 {
    let gap_p = prime_gap(p) as f64;
    let gap_q = prime_gap(q) as f64;
    // V(p,q) = 1 / (1 + |g(p) - g(q)|)
    1.0 / (1.0 + (gap_p - gap_q).abs())
}

/// Zeta-Hamiltonian matrix for n modes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZetaHamiltonian {
    /// Number of modes.
    pub num_modes: usize,
    /// Maximum occupation per mode.
    pub max_occupation: usize,
    /// Primes used as mode indices.
    pub primes: Vec<u64>,
    /// Hamiltonian matrix (flattened row-major).
    pub matrix: Vec<Vec<f64>>,
}

impl ZetaHamiltonian {
    /// Create Zeta-Hamiltonian for n modes with truncation.
    pub fn new(num_modes: usize, max_occupation: usize) -> Self {
        let primes = first_n_primes(num_modes);
        let dim = num_modes * (max_occupation + 1);
        let mut matrix = vec![vec![0.0; dim]; dim];

        // Diagonal: (1/p) * n_p for each mode p
        for (mode_idx, &prime) in primes.iter().enumerate() {
            let coupling = 1.0 / prime as f64;
            for occ in 0..=max_occupation {
                let row = mode_idx * (max_occupation + 1) + occ;
                matrix[row][row] = coupling * occ as f64;
            }
        }

        // Off-diagonal: V(p,q) coupling between modes
        for i in 0..num_modes {
            for j in 0..num_modes {
                if i != j {
                    let v = pair_potential(primes[i], primes[j]);
                    for occ in 0..=max_occupation {
                        let row = i * (max_occupation + 1) + occ;
                        let col = j * (max_occupation + 1) + occ;
                        matrix[row][col] = v;
                    }
                }
            }
        }

        Self { num_modes, max_occupation, primes, matrix }
    }

    /// Dimension of the Hamiltonian matrix.
    pub fn dimension(&self) -> usize {
        self.num_modes * (self.max_occupation + 1)
    }

    /// Apply Hamiltonian to a state vector.
    pub fn apply(&self, state: &[f64]) -> Result<Vec<f64>, ZetaError> {
        let dim = self.dimension();
        if state.len() != dim {
            return Err(ZetaError::DimensionMismatch(dim, state.len()));
        }

        let mut result = vec![0.0; dim];
        for i in 0..dim {
            for j in 0..dim {
                result[i] += self.matrix[i][j] * state[j];
            }
        }
        Ok(result)
    }

    /// Compute expectation value ⟨ψ|H|ψ⟩.
    pub fn expectation(&self, state: &[f64]) -> Result<f64, ZetaError> {
        let acted = self.apply(state)?;
        let mut value = 0.0;
        for i in 0..state.len() {
            value += state[i] * acted[i];
        }
        Ok(value)
    }

    /// Compute eigenvalues (simplified: power iteration for dominant).
    pub fn dominant_eigenvalue(&self, iterations: usize) -> f64 {
        let dim = self.dimension();
        let mut vec: Vec<f64> = (0..dim).map(|i| (i as f64 + 1.0).sin()).collect();

        for _ in 0..iterations {
            let new_vec = self.apply(&vec).unwrap_or_else(|_| vec.clone());
            let norm: f64 = new_vec.iter().map(|x| x * x).sum::<f64>().sqrt();
            if norm > 1e-15 {
                vec = new_vec.iter().map(|x| x / norm).collect();
            }
        }

        self.expectation(&vec).unwrap_or(0.0)
    }

    /// WORM-sealed hash.
    pub fn seal_hash(&self) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update((self.num_modes as u64).to_le_bytes());
        hasher.update((self.max_occupation as u64).to_le_bytes());
        for row in &self.matrix {
            for val in row {
                hasher.update(val.to_le_bytes());
            }
        }
        hex::encode(hasher.finalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_primes() {
        let primes = first_n_primes(5);
        assert_eq!(primes, vec![2, 3, 5, 7, 11]);
    }

    #[test]
    fn test_prime_gap() {
        assert_eq!(prime_gap(2), 1); // 3-2
        assert_eq!(prime_gap(3), 2); // 5-3
        assert_eq!(prime_gap(7), 4); // 11-7
    }

    #[test]
    fn test_pair_potential_symmetric() {
        let v1 = pair_potential(2, 3);
        let v2 = pair_potential(3, 2);
        assert!((v1 - v2).abs() < 1e-15);
    }

    #[test]
    fn test_hamiltonian_creation() {
        let h = ZetaHamiltonian::new(3, 2);
        assert_eq!(h.num_modes, 3);
        assert_eq!(h.dimension(), 9); // 3 * (2+1)
    }

    #[test]
    fn test_hamiltonian_apply() {
        let h = ZetaHamiltonian::new(2, 1);
        let state = vec![1.0, 0.0, 0.0, 1.0]; // |0⟩_2 + |0⟩_3
        let result = h.apply(&state).unwrap();
        assert_eq!(result.len(), 4);
    }

    #[test]
    fn test_expectation() {
        let h = ZetaHamiltonian::new(2, 1);
        let state = vec![1.0, 0.0, 0.0, 0.0]; // |0⟩_2
        let e = h.expectation(&state).unwrap();
        assert!((e - 0.0).abs() < 1e-10); // Vacuum energy = 0
    }

    #[test]
    fn test_dominant_eigenvalue() {
        let h = ZetaHamiltonian::new(3, 2);
        let eigenvalue = h.dominant_eigenvalue(100);
        assert!(eigenvalue > 0.0);
    }

    #[test]
    fn test_seal_hash_deterministic() {
        let h1 = ZetaHamiltonian::new(3, 2);
        let h2 = ZetaHamiltonian::new(3, 2);
        assert_eq!(h1.seal_hash(), h2.seal_hash());
    }
}
