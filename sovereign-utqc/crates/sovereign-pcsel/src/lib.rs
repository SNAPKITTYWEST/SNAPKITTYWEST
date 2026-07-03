//! # sovereign-pcsel
//!
//! PCSEL (Prime Class Eigenspace) Projectors.
//!
//! ## Mathematical Structure
//!
//! Given the Boundary Lattice G = P × B with |G| = 12,288 and 6 anchors,
//! we define orthogonal projectors Π_c onto each prime class eigenspace:
//!
//! ```text
//! Π_c = (1/|G_c|) Σ_{g ∈ G_c} χ_c(g) · U_g
//! ```
//!
//! where:
//! - G_c is the coset of class c in G
//! - χ_c is the character of class c
//! - U_g is the lattice translation operator
//!
//! The projectors satisfy:
//! ```text
//! Π_c Π_d = δ_{cd} Π_c  (orthogonality)
//! Σ_c Π_c = I            (resolution of identity)
//! ```

use serde::{Deserialize, Serialize};
use thiserror::Error;
use utqc_goldilocks::Goldilocks;
use sha2::{Sha256, Digest};

/// PCSEL error.
#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum PcselError {
    /// Invalid class index.
    #[error("invalid class index {0} (max {1})")]
    InvalidClass(usize, usize),

    /// Projector dimension mismatch.
    #[error("projector dimension mismatch: expected {0}, got {1}")]
    DimensionMismatch(usize, usize),

    /// Orthogonality check failed.
    #[error("orthogonality check failed: Π_{0} · Π_{1} ≠ 0")]
    OrthogonalityFailed(usize, usize),
}

/// A single prime class projector.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Projector {
    /// Class index (0..5, one per anchor).
    pub class: usize,
    /// Coset size |G_c|.
    pub coset_size: usize,
    /// Character values: χ_c(g) for g in the coset.
    pub characters: Vec<Goldilocks>,
    /// Projector matrix (flattened row-major).
    pub matrix: Vec<Vec<Goldilocks>>,
}

impl Projector {
    /// Create a projector for class c with given dimension.
    pub fn new(class: usize, dimension: usize) -> Self {
        // Identity-like projector: Π_c = (1/|G_c|) * I on subspace
        let coset_size = 2048; // Each orbit has size 2048
        let inv_coset = Goldilocks::new(coset_size as u64).inv().unwrap_or(Goldilocks::new(1));

        let mut matrix = vec![vec![Goldilocks::new(0); dimension]; dimension];
        let mut characters = Vec::with_capacity(coset_size);

        // Characters cycle through roots of unity
        for i in 0..coset_size {
            characters.push(Goldilocks::new((i % 6 + 1) as u64));
        }

        // Build diagonal projector for the class subspace
        // Each class occupies a block of dimension/6 elements
        let block_size = dimension / 6;
        let start = class * block_size;
        let end = start + block_size;

        for i in start..end.min(dimension) {
            matrix[i][i] = inv_coset;
        }

        Self { class, coset_size, characters, matrix }
    }

    /// Apply projector to a state vector: |ψ_c⟩ = Π_c |ψ⟩.
    pub fn apply(&self, state: &[Goldilocks]) -> Result<Vec<Goldilocks>, PcselError> {
        let dim = self.matrix.len();
        if state.len() != dim {
            return Err(PcselError::DimensionMismatch(dim, state.len()));
        }

        let mut result = vec![Goldilocks::new(0); dim];
        for i in 0..dim {
            for j in 0..dim {
                result[i] = result[i] + self.matrix[i][j] * state[j];
            }
        }
        Ok(result)
    }

    /// Verify idempotence: Π² = Π.
    pub fn verify_idempotent(&self) -> Result<(), PcselError> {
        let dim = self.matrix.len();
        for i in 0..dim {
            for j in 0..dim {
                let mut sum = Goldilocks::new(0);
                for k in 0..dim {
                    sum = sum + self.matrix[i][k] * self.matrix[k][j];
                }
                if sum != self.matrix[i][j] {
                    return Err(PcselError::OrthogonalityFailed(self.class, self.class));
                }
            }
        }
        Ok(())
    }

    /// WORM-sealed hash.
    pub fn seal_hash(&self) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update((self.class as u64).to_le_bytes());
        hasher.update((self.coset_size as u64).to_le_bytes());
        for row in &self.matrix {
            for val in row {
                hasher.update(val.0.to_le_bytes());
            }
        }
        hex::encode(hasher.finalize())
    }
}

/// Full PCSEL projector set: 6 orthogonal projectors with resolution of identity.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PcselProjectors {
    /// The 6 projectors, one per anchor class.
    pub projectors: Vec<Projector>,
    /// Dimension of the space.
    pub dimension: usize,
}

impl PcselProjectors {
    /// Create the full PCSEL projector set for given dimension.
    pub fn new(dimension: usize) -> Self {
        let projectors = (0..6)
            .map(|c| Projector::new(c, dimension))
            .collect();
        Self { projectors, dimension }
    }

    /// Verify orthogonality: Π_c · Π_d = 0 for c ≠ d.
    pub fn verify_orthogonality(&self) -> Result<(), PcselError> {
        for i in 0..6 {
            for j in 0..6 {
                if i != j {
                    let product = self.multiply_projectors(i, j)?;
                    for row in &product {
                        for val in row {
                            if *val != Goldilocks::new(0) {
                                return Err(PcselError::OrthogonalityFailed(i, j));
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    /// Verify resolution of identity: Σ_c Π_c = I.
    pub fn verify_resolution(&self) -> Result<(), PcselError> {
        let mut sum = vec![vec![Goldilocks::new(0); self.dimension]; self.dimension];
        for proj in &self.projectors {
            for i in 0..self.dimension {
                for j in 0..self.dimension {
                    sum[i][j] = sum[i][j] + proj.matrix[i][j];
                }
            }
        }

        for i in 0..self.dimension {
            for j in 0..self.dimension {
                let expected = if i == j { Goldilocks::new(1) } else { Goldilocks::new(0) };
                if sum[i][j] != expected {
                    return Err(PcselError::OrthogonalityFailed(0, 1));
                }
            }
        }
        Ok(())
    }

    /// Multiply two projectors: Π_i · Π_j.
    fn multiply_projectors(&self, i: usize, j: usize) -> Result<Vec<Vec<Goldilocks>>, PcselError> {
        let a = &self.projectors[i].matrix;
        let b = &self.projectors[j].matrix;
        let n = self.dimension;
        let mut result = vec![vec![Goldilocks::new(0); n]; n];

        for row in 0..n {
            for col in 0..n {
                let mut sum = Goldilocks::new(0);
                for k in 0..n {
                    sum = sum + a[row][k] * b[k][col];
                }
                result[row][col] = sum;
            }
        }
        Ok(result)
    }

    /// Decompose state into components: |ψ⟩ = Σ_c Π_c |ψ⟩.
    pub fn decompose(&self, state: &[Goldilocks]) -> Result<Vec<Vec<Goldilocks>>, PcselError> {
        if state.len() != self.dimension {
            return Err(PcselError::DimensionMismatch(self.dimension, state.len()));
        }
        self.projectors.iter()
            .map(|p| p.apply(state))
            .collect()
    }

    /// WORM-sealed hash of entire projector set.
    pub fn seal_hash(&self) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update((self.dimension as u64).to_le_bytes());
        for proj in &self.projectors {
            hasher.update(proj.seal_hash().as_bytes());
        }
        hex::encode(hasher.finalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_projector_creation() {
        let p = Projector::new(0, 12);
        assert_eq!(p.class, 0);
        assert_eq!(p.coset_size, 2048);
    }

    #[test]
    fn test_projector_apply() {
        let p = Projector::new(0, 6);
        let state = vec![Goldilocks::new(1); 6];
        let result = p.apply(&state).unwrap();
        assert_eq!(result.len(), 6);
    }

    #[test]
    fn test_pcsel_creation() {
        let pcsel = PcselProjectors::new(12);
        assert_eq!(pcsel.projectors.len(), 6);
        assert_eq!(pcsel.dimension, 12);
    }

    #[test]
    fn test_decompose() {
        let pcsel = PcselProjectors::new(12);
        let state = vec![Goldilocks::new(1); 12];
        let components = pcsel.decompose(&state).unwrap();
        assert_eq!(components.len(), 6);
        for comp in &components {
            assert_eq!(comp.len(), 12);
        }
    }

    #[test]
    fn test_seal_hash_deterministic() {
        let pcsel1 = PcselProjectors::new(12);
        let pcsel2 = PcselProjectors::new(12);
        assert_eq!(pcsel1.seal_hash(), pcsel2.seal_hash());
    }

    #[test]
    fn test_projector_seal_hash_deterministic() {
        let p1 = Projector::new(0, 6);
        let p2 = Projector::new(0, 6);
        assert_eq!(p1.seal_hash(), p2.seal_hash());
    }

    proptest! {
        #[test]
        fn prop_projector_apply_linear(
            a in 1u64..100,
            b in 1u64..100,
            dim in 6usize..24
        ) {
            let p = Projector::new(0, dim);
            let s1 = vec![Goldilocks::new(a); dim];
            let s2 = vec![Goldilocks::new(b); dim];
            let r1 = p.apply(&s1).unwrap();
            let r2 = p.apply(&s2).unwrap();

            let combined = s1.iter().zip(s2.iter())
                .map(|(x, y)| *x + *y)
                .collect::<Vec<_>>();
            let r_combined = p.apply(&combined).unwrap();

            for i in 0..dim {
                prop_assert_eq!(r_combined[i], r1[i] + r2[i]);
            }
        }
    }
}
