//! Tokens

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TokenType {
    Prime(u64),
    Tensor,
    Evolve,
    Seal,
    LParen,
    RParen,
    Semicolon,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Token {
    pub token_type: TokenType,
    pub line: usize,
    pub col: usize,
}

impl Token {
    pub fn new(token_type: TokenType, line: usize, col: usize) -> Self {
        Self { token_type, line, col }
    }
}
