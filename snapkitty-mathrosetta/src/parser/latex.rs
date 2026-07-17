use crate::{MathIR, Variable, Constant, Domain, AssumptionSet, SymbolicConst};
use super::{Parser, ParseError};

pub struct LatexParser;

impl Parser for LatexParser {
    fn parse(&self, input: &str) -> Result<MathIR, ParseError> {
        let trimmed = input.trim();

        if let Some(eq_pos) = trimmed.find('=') {
            let lhs = parse_latex_expr(&trimmed[..eq_pos])?;
            let rhs = parse_latex_expr(&trimmed[eq_pos + 1..])?;
            return Ok(MathIR::Eq(Box::new(lhs), Box::new(rhs)));
        }

        parse_latex_expr(trimmed)
    }

    fn format_name(&self) -> &str {
        "latex"
    }
}

fn parse_latex_expr(input: &str) -> Result<MathIR, ParseError> {
    let trimmed = input.trim();

    if let Some(caret_pos) = find_caret(trimmed) {
        let base = parse_latex_primary(&trimmed[..caret_pos])?;
        let exp = parse_latex_expr(&trimmed[caret_pos + 1..])?;
        return Ok(MathIR::Pow(Box::new(base), Box::new(exp)));
    }

    if let Some(plus_pos) = find_plus(trimmed) {
        let lhs = parse_latex_expr(&trimmed[..plus_pos])?;
        let rhs = parse_latex_expr(&trimmed[plus_pos + 1..])?;
        return Ok(MathIR::Add(vec![lhs, rhs]));
    }

    if let Some(star_pos) = find_star(trimmed) {
        let lhs = parse_latex_expr(&trimmed[..star_pos])?;
        let rhs = parse_latex_expr(&trimmed[star_pos + 1..])?;
        return Ok(MathIR::Mul(vec![lhs, rhs]));
    }

    parse_latex_primary(trimmed)
}

fn parse_latex_primary(input: &str) -> Result<MathIR, ParseError> {
    let trimmed = input.trim();

    if let Ok(n) = trimmed.parse::<i64>() {
        return Ok(MathIR::Const(Constant::Int(n)));
    }

    if trimmed.len() == 1 && trimmed.chars().next().unwrap().is_alphabetic() {
        return Ok(MathIR::Var(Box::new(Variable {
            id: trimmed.to_string(),
            domain: Domain::Real,
            assumptions: AssumptionSet::default(),
        })));
    }

    match trimmed {
        "\\pi" | "π" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::Pi))),
        "e" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::E))),
        "\\infty" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::Infinity))),
        _ => Err(ParseError::Invalid(format!("Cannot parse: {}", trimmed))),
    }
}

fn find_caret(input: &str) -> Option<usize> {
    let mut depth = 0;
    for (i, c) in input.chars().enumerate() {
        match c {
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth -= 1,
            '^' if depth == 0 => return Some(i),
            _ => {}
        }
    }
    None
}

fn find_plus(input: &str) -> Option<usize> {
    let mut depth = 0;
    let mut last_sign = None;
    for (i, c) in input.chars().enumerate() {
        match c {
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth -= 1,
            '+' if depth == 0 => last_sign = Some(i),
            _ => {}
        }
    }
    last_sign
}

fn find_star(input: &str) -> Option<usize> {
    let mut depth = 0;
    for (i, c) in input.chars().enumerate() {
        match c {
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth -= 1,
            '*' if depth == 0 => return Some(i),
            _ => {}
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_integer() {
        let parser = LatexParser;
        let result = parser.parse("42").unwrap();
        assert_eq!(result, MathIR::Const(Constant::Int(42)));
    }

    #[test]
    fn test_parse_variable() {
        let parser = LatexParser;
        let result = parser.parse("x").unwrap();
        assert!(matches!(result, MathIR::Var(_)));
    }

    #[test]
    fn test_parse_equation() {
        let parser = LatexParser;
        let result = parser.parse("x = 1").unwrap();
        assert!(matches!(result, MathIR::Eq(_, _)));
    }
}
