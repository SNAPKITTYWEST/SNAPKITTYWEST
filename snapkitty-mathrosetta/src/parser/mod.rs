pub mod latex;
pub mod sympy;
pub mod lean;

use crate::MathIR;

pub trait Parser {
    fn parse(&self, input: &str) -> Result<MathIR, ParseError>;
    fn format_name(&self) -> &str;
}

#[derive(Debug, thiserror::Error)]
pub enum ParseError {
    #[error("Syntax error at position {position}: {message}")]
    Syntax { position: usize, message: String },
    #[error("Unsupported feature: {feature}")]
    Unsupported { feature: String },
    #[error("Invalid input: {0}")]
    Invalid(String),
}

pub struct AutoParser {
    parsers: Vec<Box<dyn Parser>>,
}

impl AutoParser {
    pub fn new() -> Self {
        Self {
            parsers: vec![
                Box::new(latex::LatexParser),
                Box::new(sympy::SympyParser),
                Box::new(lean::LeanParser),
            ],
        }
    }

    pub fn parse_auto(&self, input: &str) -> Result<MathIR, ParseError> {
        // Try JSON first
        if let Ok(expr) = serde_json::from_str::<MathIR>(input) {
            return Ok(expr);
        }

        // Try each parser
        for parser in &self.parsers {
            if let Ok(expr) = parser.parse(input) {
                return Ok(expr);
            }
        }

        Err(ParseError::Invalid("Could not parse input with any available parser".into()))
    }
}

impl Default for AutoParser {
    fn default() -> Self {
        Self::new()
    }
}
