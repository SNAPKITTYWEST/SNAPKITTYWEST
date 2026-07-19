//! # Sovereign PIRTM
//!
//! Prime-Indexed Recursive Tensor Mathematics — SnapKitty meta version.
//!
//! Core: tensors indexed by primes, recursive evolution, spectral stability.
//! Every computation WORM-sealed. Evidence or silence.

pub mod tensor;
pub mod prime;
pub mod evolve;
pub mod seal;

pub use tensor::PrimeTensor;
pub use prime::{Primes, prime_at};
pub use evolve::RecursiveEvolution;
pub use seal::WormSeal;
