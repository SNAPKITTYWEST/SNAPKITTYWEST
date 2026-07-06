//! # Sovereign Goldilocks Compute
//!
//! Reverse-engineered from apex-goldilocks (MultiplicityTheory).
//! 
//! Core concepts:
//! - Boundary Lattice G = P x B, |G| = 12,288
//! - Goldilocks Field arithmetic (p = 2^64 - 2^32 + 1)
//! - Resonance Words (class + payload)
//! - URef subgroup with 11 commuting involutions
//! - Orbit certificates

pub mod lattice;
pub mod field;
pub mod resonance;
pub mod uref;
pub mod seal;

pub use lattice::{LatticeElement, LatticeCertificate};
pub use field::GoldilocksField;
pub use resonance::ResonanceWord;
pub use uref::URef;
pub use seal::WormSeal;
