//! # Sovereign Z-Bit
//!
//! Bitcoin integration for the Lambda-Proof ecosystem.
//! UOR-ADDR realization. Every block WORM-sealed.

pub mod block;
pub mod hash;
pub mod seal;

pub use block::{Block, Transaction};
pub use hash::{sha256, double_sha256};
pub use seal::WormSeal;
