use crate::{MathIR, Variable, Constant, Domain, AssumptionSet, SymbolicConst};
use super::{Parser, ParseError};

pub struct SympyParser;

impl Parser for SympyParser {
    fn parse(&self, input: &str) -> Result<MathIR, ParseError> {
        let trimmed = input.trim();

        if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
            return parse_sympy_json(&value);
        }

        parse_sympy_python(trimmed)
    }

    fn format_name(&self) -> &str {
        "sympy"
    }
}

fn parse_sympy_json(value: &serde_json::Value) -> Result<MathIR, ParseError> {
    match value {
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Ok(MathIR::Const(Constant::Int(i)))
            } else if let Some(f) = n.as_f64() {
                Ok(MathIR::Const(Constant::Float(f)))
            } else {
                Err(ParseError::Invalid("Invalid number".into()))
            }
        }
        serde_json::Value::String(s) => {
            match s.as_str() {
                "pi" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::Pi))),
                "E" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::E))),
                "oo" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::Infinity))),
                _ => Ok(MathIR::Var(Box::new(Variable {
                    id: s.clone(),
                    domain: Domain::Real,
                    assumptions: AssumptionSet::default(),
                }))),
            }
        }
        serde_json::Value::Array(arr) => {
            if arr.len() == 3 && arr[0].as_str() == Some("Add") {
                let args: Result<Vec<MathIR>, _> = arr[1..].iter().map(parse_sympy_json).collect();
                Ok(MathIR::Add(args?))
            } else if arr.len() == 3 && arr[0].as_str() == Some("Mul") {
                let args: Result<Vec<MathIR>, _> = arr[1..].iter().map(parse_sympy_json).collect();
                Ok(MathIR::Mul(args?))
            } else if arr.len() == 3 && arr[0].as_str() == Some("Pow") {
                let base = parse_sympy_json(&arr[1])?;
                let exp = parse_sympy_json(&arr[2])?;
                Ok(MathIR::Pow(Box::new(base), Box::new(exp)))
            } else if arr.len() >= 2 && arr[0].as_str() == Some("Symbol") {
                let id = arr[1].as_str().ok_or(ParseError::Invalid("Invalid symbol".into()))?;
                Ok(MathIR::Var(Box::new(Variable {
                    id: id.to_string(),
                    domain: Domain::Real,
                    assumptions: AssumptionSet::default(),
                })))
            } else if arr.len() >= 2 && arr[0].as_str() == Some("Eq") {
                let lhs = parse_sympy_json(&arr[1])?;
                let rhs = parse_sympy_json(&arr[2])?;
                Ok(MathIR::Eq(Box::new(lhs), Box::new(rhs)))
            } else {
                Err(ParseError::Unsupported { feature: format!("SymPy JSON: {:?}", arr[0]) })
            }
        }
        _ => Err(ParseError::Invalid("Invalid SymPy JSON".into())),
    }
}

fn parse_sympy_python(input: &str) -> Result<MathIR, ParseError> {
    let trimmed = input.trim();

    if trimmed.starts_with("integrate(") {
        return Err(ParseError::Unsupported { feature: "Python integrate()".into() });
    }

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

    Err(ParseError::Invalid(format!("Cannot parse Python expression: {}", trimmed)))
}
