//! # Sovereign ADDR
//!
//! Chain-agnostic canonical content addressing for agent-produced content.
//! SHA-256 over JCS-RFC8785 + Unicode NFC canonical bytes.
//! Every address WORM-sealed.

pub mod address;
pub mod canonical;
pub mod seal;

pub use address::ContentAddress;
pub use canonical::{canonicalize, jcs_canonicalize};
pub use seal::WormSeal;
