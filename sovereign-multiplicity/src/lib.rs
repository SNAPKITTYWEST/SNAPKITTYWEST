//! # Sovereign Multiplicity
//!
//! Formal verification with Lean 4 style proofs.
//! Every theorem WORM-sealed.

pub mod theorem;
pub mod proof;
pub mod verify;
pub mod seal;

pub use theorem::Theorem;
pub use proof::Proof;
pub use verify::Verifier;
pub use seal::WormSeal;
