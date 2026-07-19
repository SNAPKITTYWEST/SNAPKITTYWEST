//! # Sovereign F1
//!
//! The F1 square: Spec Z x_F1 Spec Z
//! Hodge-index positivity is the Riemann Hypothesis.
//! Every computation WORM-sealed.

pub mod field;
pub mod square;
pub mod hodge;
pub mod seal;

pub use field::F1Field;
pub use square::F1Square;
pub use hodge::HodgeIndex;
pub use seal::WormSeal;
