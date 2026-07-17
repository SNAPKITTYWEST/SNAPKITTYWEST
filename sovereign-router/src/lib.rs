//! # Sovereign Router
//!
//! General intelligence routing — route queries to the right agent.
//! Prime-weighted scoring. Every route WORM-sealed.

pub mod route;
pub mod agent;
pub mod score;
pub mod seal;

pub use route::QueryRouter;
pub use agent::Agent;
pub use score::Score;
pub use seal::WormSeal;
