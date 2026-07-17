//! # Sovereign Compiler
//!
//! PIRTM-lang compiler with governance-as-compilation.
//! Grammar enforcement, signature verification, stability checks.
//! Every compilation WORM-sealed.

pub mod token;
pub mod parser;
pub mod codegen;
pub mod seal;

pub use token::{Token, TokenType};
pub use parser::Parser;
pub use codegen::CodeGen;
pub use seal::WormSeal;
