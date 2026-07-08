//! # Sovereign PRISM
//!
//! Bitcoin proof-of-work as UOR-ADDR realization.
//! Every hash WORM-sealed.
//!
//! ## Components
//! - **Canonical Serialization**: Deterministic JSON with key ordering invariance
//! - **SHA-256d**: Double SHA-256 hashing (prevents length-extension attacks)
//! - **ψ-Pipeline**: Algebraic topology (Nerve → Postnikov → Homotopy → k-Invariants)
//! - **WORM Seal**: Write-once-read-many cryptographic witnesses
//! - **Admission Validation**: Fail-closed target verification

pub mod pow;
pub mod block;
pub mod seal;
pub mod canonical;
pub mod sha256d;
pub mod psi_pipeline;
pub mod admission;

pub use pow::ProofOfWork;
pub use block::Block;
pub use seal::WormSeal;
pub use canonical::canonical_bytes;
pub use sha256d::{hash_bytes, hash_string, hash_double, snapsha256d};
pub use psi_pipeline::{Carrier, psi_pipeline as pipeline};
pub use admission::{AdmissionValidator, AdmissionError, PrimeIndexValidator};
