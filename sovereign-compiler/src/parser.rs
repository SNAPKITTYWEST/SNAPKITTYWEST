//! Parser

use crate::token::{Token, TokenType};

pub struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    pub fn new(tokens: Vec<Token>) -> Self {
        Self { tokens, pos: 0 }
    }

    pub fn parse(&mut self) -> Vec<String> {
        let mut statements = Vec::new();
        while self.pos < self.tokens.len() {
            if let Some(stmt) = self.parse_statement() {
                statements.push(stmt);
            }
            self.pos += 1;
        }
        statements
    }

    fn parse_statement(&mut self) -> Option<String> {
        let token = self.tokens.get(self.pos)?;
        match &token.token_type {
            TokenType::Prime(n) => Some(format!("PRIME({})", n)),
            TokenType::Tensor => Some("TENSOR".to_string()),
            TokenType::Evolve => Some("EVOLVE".to_string()),
            TokenType::Seal => Some("SEAL".to_string()),
            _ => None,
        }
    }
}
