//! # sovereign-prime-fock
//!
//! Prime Fock Space: F = ⊕_p F_p where each F_p is the Fock space for prime p.
//!
//! ## Mathematical Structure
//!
//! ```text
//! F = ⊕_{p ∈ primes} F_p
//! F_p = ℂ ⊕ V_p ⊕ (S²V_p) ⊕ (S³V_p) ⊕ ...
//! ```
//!
//! Each F_p carries:
//! - Vacuum state |0⟩_p
//! - Creation operator a†_p (adds particle to mode p)
//! - Annihilation operator a_p (removes particle from mode p)
//! - Number operator n_p = a†_p a_p
//!
//! The full Fock space inner product is:
//! ```text
//! ⟨ψ|φ⟩ = Σ_p ⟨ψ_p|φ_p⟩_p
//! ```
//!
//! ## Non-Recursive Structure
//!
//! The Fock space is truncated at a maximum occupation number N_max.
//! Each F_p is a finite-dimensional vector space of dimension N_max + 1.

use serde::{Deserialize, Serialize};
use thiserror::Error;
use utqc_goldilocks::Goldilocks;

/// Fock space error.
#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum FockError {
    /// Occupation number exceeds maximum.
    #[error("occupation number {0} exceeds maximum {1}")]
    OccupationExceeded(usize, usize),

    /// Invalid prime index.
    #[error("invalid prime index {0}")]
    InvalidPrime(usize),

    /// Dimension mismatch.
    #[error("dimension mismatch: expected {0}, got {1}")]
    DimensionMismatch(usize, usize),
}

/// First few primes for indexing.
pub const PRIMES: &[u64] = &[
    2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47,
    53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
];

/// A single-mode Fock state |n⟩_p for prime p.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct FockState {
    /// Prime index.
    pub prime: u64,
    /// Occupation number.
    pub occupation: usize,
}

impl FockState {
    /// Create a new Fock state.
    pub fn new(prime: u64, occupation: usize) -> Self {
        Self { prime, occupation }
    }

    /// Vacuum state for prime p.
    pub fn vacuum(prime: u64) -> Self {
        Self { prime, occupation: 0 }
    }

    /// Apply creation operator a†. Returns None if at max occupation.
    pub fn create(&self, max_occ: usize) -> Option<Self> {
        if self.occupation >= max_occ {
            None
        } else {
            Some(Self {
                prime: self.prime,
                occupation: self.occupation + 1,
            })
        }
    }

    /// Apply annihilation operator a. Returns None if at vacuum.
    pub fn annihilate(&self) -> Option<Self> {
        if self.occupation == 0 {
            None
        } else {
            Some(Self {
                prime: self.prime,
                occupation: self.occupation - 1,
            })
        }
    }

    /// Number operator eigenvalue: ⟨n|n_p|n⟩ = n.
    pub fn number_eigenvalue(&self) -> usize {
        self.occupation
    }

    /// Compute overlap ⟨self|other⟩ = δ_{p,p'} δ_{n,n'}.
    pub fn overlap(&self, other: &Self) -> Goldilocks {
        if self.prime == other.prime && self.occupation == other.occupation {
            Goldilocks::new(1)
        } else {
            Goldilocks::new(0)
        }
    }
}

/// Single-mode Fock space F_p with truncation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SingleModeFock {
    /// The prime this mode is associated with.
    pub prime: u64,
    /// Maximum occupation number.
    pub max_occupation: usize,
    /// State amplitudes: amp[n] = coefficient of |n⟩.
    pub amplitudes: Vec<Goldilocks>,
}

impl SingleModeFock {
    /// Create F_p with given truncation.
    pub fn new(prime: u64, max_occupation: usize) -> Self {
        let mut amplitudes = vec![Goldilocks::new(0); max_occupation + 1];
        amplitudes[0] = Goldilocks::new(1); // Start in vacuum
        Self { prime, max_occupation, amplitudes }
    }

    /// Create from explicit amplitude vector.
    pub fn from_amplitudes(prime: u64, amplitudes: Vec<Goldilocks>) -> Result<Self, FockError> {
        let max_occupation = amplitudes.len().saturating_sub(1);
        Ok(Self { prime, max_occupation, amplitudes })
    }

    /// Dimension of this Fock space.
    pub fn dimension(&self) -> usize {
        self.max_occupation + 1
    }

    /// Apply creation operator a† to amplitude vector.
    pub fn apply_creation(&self, state: &[Goldilocks]) -> Result<Vec<Goldilocks>, FockError> {
        if state.len() != self.max_occupation + 1 {
            return Err(FockError::DimensionMismatch(self.max_occupation + 1, state.len()));
        }
        let mut result = vec![Goldilocks::new(0); self.max_occupation + 1];
        for n in 0..self.max_occupation {
            // a†|n⟩ = √(n+1)|n+1⟩ — we use integer sqrt approximation in Goldilocks
            let coeff = integer_sqrt_approx(n + 1);
            result[n + 1] = result[n + 1] + state[n] * Goldilocks::new(coeff as u64);
        }
        Ok(result)
    }

    /// Apply annihilation operator a to amplitude vector.
    pub fn apply_annihilation(&self, state: &[Goldilocks]) -> Result<Vec<Goldilocks>, FockError> {
        if state.len() != self.max_occupation + 1 {
            return Err(FockError::DimensionMismatch(self.max_occupation + 1, state.len()));
        }
        let mut result = vec![Goldilocks::new(0); self.max_occupation + 1];
        for n in 1..=self.max_occupation {
            let coeff = integer_sqrt_approx(n);
            result[n - 1] = result[n - 1] + state[n] * Goldilocks::new(coeff as u64);
        }
        Ok(result)
    }

    /// Apply number operator n_p = a†a.
    pub fn apply_number(&self, state: &[Goldilocks]) -> Result<Vec<Goldilocks>, FockError> {
        if state.len() != self.max_occupation + 1 {
            return Err(FockError::DimensionMismatch(self.max_occupation + 1, state.len()));
        }
        let mut result = vec![Goldilocks::new(0); self.max_occupation + 1];
        for n in 0..=self.max_occupation {
            result[n] = state[n] * Goldilocks::new(n as u64);
        }
        Ok(result)
    }

    /// Inner product ⟨ψ|φ⟩.
    pub fn inner_product(&self, bra: &[Goldilocks], ket: &[Goldilocks]) -> Result<Goldilocks, FockError> {
        if bra.len() != self.max_occupation + 1 || ket.len() != self.max_occupation + 1 {
            return Err(FockError::DimensionMismatch(self.max_occupation + 1, bra.len()));
        }
        let mut sum = Goldilocks::new(0);
        for i in 0..=self.max_occupation {
            sum = sum + bra[i] * ket[i];
        }
        Ok(sum)
    }

    /// Compute ⟨n_p⟩ = ⟨ψ|n_p|ψ⟩.
    pub fn expectation_number(&self, state: &[Goldilocks]) -> Result<Goldilocks, FockError> {
        let acted = self.apply_number(state)?;
        self.inner_product(state, &acted)
    }

    /// WORM-sealed representation hash.
    pub fn seal_hash(&self) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(self.prime.to_le_bytes());
        hasher.update((self.max_occupation as u64).to_le_bytes());
        for amp in &self.amplitudes {
            hasher.update(amp.0.to_le_bytes());
        }
        hex::encode(hasher.finalize())
    }
}

/// Multi-mode Fock space F = ⊕_p F_p.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrimeFockSpace {
    /// Maximum occupation per mode.
    pub max_occupation: usize,
    /// Amplitudes per prime mode: modes[prime_index] = amplitude vector.
    pub modes: Vec<(u64, Vec<Goldilocks>)>,
}

impl PrimeFockSpace {
    /// Create Fock space for given primes with truncation.
    pub fn new(primes: &[u64], max_occupation: usize) -> Self {
        let modes = primes.iter()
            .map(|&p| (p, vec![Goldilocks::new(0); max_occupation + 1]))
            .collect();
        Self { max_occupation, modes }
    }

    /// Create vacuum state: all modes in |0⟩.
    pub fn vacuum(primes: &[u64], max_occupation: usize) -> Self {
        let modes = primes.iter()
            .map(|&p| {
                let mut amps = vec![Goldilocks::new(0); max_occupation + 1];
                amps[0] = Goldilocks::new(1);
                (p, amps)
            })
            .collect();
        Self { max_occupation, modes }
    }

    /// Number of modes.
    pub fn num_modes(&self) -> usize {
        self.modes.len()
    }

    /// Get amplitude vector for prime p.
    pub fn mode(&self, prime: u64) -> Option<&[Goldilocks]> {
        self.modes.iter()
            .find(|(p, _)| *p == prime)
            .map(|(_, amps)| amps.as_slice())
    }

    /// Get mutable amplitude vector for prime p.
    pub fn mode_mut(&mut self, prime: u64) -> Option<&mut Vec<Goldilocks>> {
        self.modes.iter_mut()
            .find(|(p, _)| *p == prime)
            .map(|(_, amps)| amps)
    }

    /// Apply creation operator a†_p.
    pub fn create_mode(&mut self, prime: u64) -> Result<(), FockError> {
        let max_occ = self.max_occupation;
        let amps = self.mode_mut(prime)
            .ok_or(FockError::InvalidPrime(prime as usize))?;
        let old = amps.clone();
        let mode = SingleModeFock::new(prime, max_occ);
        *amps = mode.apply_creation(&old)?;
        Ok(())
    }

    /// Apply annihilation operator a_p.
    pub fn annihilate_mode(&mut self, prime: u64) -> Result<(), FockError> {
        let max_occ = self.max_occupation;
        let amps = self.mode_mut(prime)
            .ok_or(FockError::InvalidPrime(prime as usize))?;
        let old = amps.clone();
        let mode = SingleModeFock::new(prime, max_occ);
        *amps = mode.apply_annihilation(&old)?;
        Ok(())
    }

    /// Total particle number: N = Σ_p n_p.
    pub fn total_particle_number(&self) -> Goldilocks {
        let mut total = Goldilocks::new(0);
        for (prime, amps) in &self.modes {
            let mode = SingleModeFock::new(*prime, self.max_occupation);
            if let Ok(n) = mode.expectation_number(amps) {
                total = total + n;
            }
        }
        total
    }

    /// Inner product ⟨ψ|φ⟩ = Σ_p ⟨ψ_p|φ_p⟩.
    pub fn inner_product(&self, other: &Self) -> Result<Goldilocks, FockError> {
        let mut sum = Goldilocks::new(0);
        for ((p1, amps1), (p2, amps2)) in self.modes.iter().zip(other.modes.iter()) {
            if p1 != p2 {
                return Err(FockError::DimensionMismatch(*p1 as usize, *p2 as usize));
            }
            let mode = SingleModeFock::new(*p1, self.max_occupation);
            sum = sum + mode.inner_product(amps1, amps2)?;
        }
        Ok(sum)
    }

    /// WORM-sealed hash of entire Fock space.
    pub fn seal_hash(&self) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update((self.max_occupation as u64).to_le_bytes());
        for (prime, amps) in &self.modes {
            hasher.update(prime.to_le_bytes());
            for amp in amps {
            hasher.update(amp.0.to_le_bytes());
            }
        }
        hex::encode(hasher.finalize())
    }
}

/// Integer square root approximation (floor).
fn integer_sqrt_approx(n: usize) -> usize {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_vacuum_state() {
        let vac = FockState::vacuum(2);
        assert_eq!(vac.prime, 2);
        assert_eq!(vac.occupation, 0);
        assert_eq!(vac.number_eigenvalue(), 0);
    }

    #[test]
    fn test_create_annihilate() {
        let state = FockState::vacuum(3);
        let created = state.create(10).unwrap();
        assert_eq!(created.occupation, 1);
        let annihilated = created.annihilate().unwrap();
        assert_eq!(annihilated.occupation, 0);
    }

    #[test]
    fn test_create_at_max() {
        let state = FockState::new(5, 3);
        assert!(state.create(3).is_none());
    }

    #[test]
    fn test_annihilate_at_vacuum() {
        let state = FockState::vacuum(7);
        assert!(state.annihilate().is_none());
    }

    #[test]
    fn test_overlap() {
        let a = FockState::new(2, 1);
        let b = FockState::new(2, 1);
        let c = FockState::new(3, 1);
        assert_eq!(a.overlap(&b), Goldilocks::new(1));
        assert_eq!(a.overlap(&c), Goldilocks::new(0));
    }

    #[test]
    fn test_single_mode_dimension() {
        let mode = SingleModeFock::new(2, 5);
        assert_eq!(mode.dimension(), 6);
    }

    #[test]
    fn test_creation_operator() {
        let mode = SingleModeFock::new(2, 3);
        let vac = vec![Goldilocks::new(1), Goldilocks::new(0), Goldilocks::new(0), Goldilocks::new(0)];
        let result = mode.apply_creation(&vac).unwrap();
        assert_eq!(result[0], Goldilocks::new(0));
        assert_eq!(result[1], Goldilocks::new(1)); // √1 = 1
    }

    #[test]
    fn test_annihilation_operator() {
        let mode = SingleModeFock::new(2, 3);
        let one_particle = vec![Goldilocks::new(0), Goldilocks::new(1), Goldilocks::new(0), Goldilocks::new(0)];
        let result = mode.apply_annihilation(&one_particle).unwrap();
        assert_eq!(result[0], Goldilocks::new(1)); // √1 = 1
        assert_eq!(result[1], Goldilocks::new(0));
    }

    #[test]
    fn test_number_operator() {
        let mode = SingleModeFock::new(2, 3);
        let state = vec![Goldilocks::new(0), Goldilocks::new(0), Goldilocks::new(1), Goldilocks::new(0)];
        let result = mode.apply_number(&state).unwrap();
        // |2⟩ → 2|2⟩
        assert_eq!(result[2], Goldilocks::new(2));
    }

    #[test]
    fn test_vacuum_fock_space() {
        let primes = vec![2, 3, 5];
        let fs = PrimeFockSpace::vacuum(&primes, 3);
        assert_eq!(fs.num_modes(), 3);
        assert_eq!(fs.total_particle_number(), Goldilocks::new(0));
    }

    #[test]
    fn test_create_in_multi_mode() {
        let primes = vec![2, 3, 5];
        let mut fs = PrimeFockSpace::vacuum(&primes, 3);
        fs.create_mode(3).unwrap();
        assert_eq!(fs.total_particle_number(), Goldilocks::new(1));
    }

    #[test]
    fn test_seal_hash_deterministic() {
        let primes = vec![2, 3];
        let fs1 = PrimeFockSpace::vacuum(&primes, 2);
        let fs2 = PrimeFockSpace::vacuum(&primes, 2);
        assert_eq!(fs1.seal_hash(), fs2.seal_hash());
    }

    #[test]
    fn test_inner_product_same() {
        let primes = vec![2, 3];
        let fs = PrimeFockSpace::vacuum(&primes, 2);
        let ip = fs.inner_product(&fs).unwrap();
        // Each mode contributes 1^2 = 1, two modes → 2
        assert_eq!(ip, Goldilocks::new(2));
    }

    #[test]
    fn test_integer_sqrt() {
        assert_eq!(integer_sqrt_approx(0), 0);
        assert_eq!(integer_sqrt_approx(1), 1);
        assert_eq!(integer_sqrt_approx(4), 2);
        assert_eq!(integer_sqrt_approx(9), 3);
        assert_eq!(integer_sqrt_approx(10), 3); // floor(√10) = 3
    }

    proptest! {
        #[test]
        fn prop_create_then_annihilate_identity(
            prime in 2u64..100,
            max_occ in 1usize..10
        ) {
            let mode = SingleModeFock::new(prime, max_occ);
            let vac = vec![Goldilocks::new(1); 1]
                .into_iter()
                .chain(std::iter::repeat(Goldilocks::new(0)).take(max_occ))
                .collect::<Vec<_>>();
            if let Ok(created) = mode.apply_creation(&vac) {
                if let Ok(annihilated) = mode.apply_annihilation(&created) {
                    // a a† |0⟩ = |0⟩ (for single mode)
                    prop_assert_eq!(annihilated[0], vac[0]);
                }
            }
        }

        #[test]
        fn prop_number_operator_eigenvalue(
            n in 0usize..10
        ) {
            let mode = SingleModeFock::new(2, 10);
            let mut state = vec![Goldilocks::new(0); 11];
            state[n] = Goldilocks::new(1);
            let result = mode.apply_number(&state).unwrap();
            prop_assert_eq!(result[n], Goldilocks::new(n as u64));
        }
    }
}
