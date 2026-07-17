//! # Sovereign AGT
//!
//! Agent Governance Technology — policy enforcement, identity, sandboxing.
//! Every decision WORM-sealed.

pub mod policy;
pub mod identity;
pub mod sandbox;
pub mod seal;

pub use policy::Policy;
pub use identity::AgentIdentity;
pub use sandbox::Sandbox;
pub use seal::WormSeal;
