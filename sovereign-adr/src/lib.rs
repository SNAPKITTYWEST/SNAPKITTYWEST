//! # Sovereign ADR Kernel
//!
//! Architecture Decision Records govern the rule graph.
//! NF-style stratification constraints enforced.
//! Every decision WORM-sealed.

pub mod adr;
pub mod graph;
pub mod seal;

pub use adr::{ArchitectureDecision, DecisionStatus};
pub use graph::RuleGraph;
pub use seal::WormSeal;
