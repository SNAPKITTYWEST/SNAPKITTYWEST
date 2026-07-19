//! # Sovereign UOR
//!
//! Universal Object Representation — canonical object model.
//! Chain-agnostic, agent-produced content.
//! Every object WORM-sealed.

pub mod object;
pub mod schema;
pub mod seal;

pub use object::UniversalObject;
pub use schema::ObjectSchema;
pub use seal::WormSeal;
