use crate::{MathIR, Variable, Constant, Domain, AssumptionSet, SymbolicConst};
use super::{Parser, ParseError};

pub struct LeanParser;

impl Parser for LeanParser {
    fn parse(&self, input: &str) -> Result<MathIR, ParseError> {
        let trimmed = input.trim();

        if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
            return parse_lean_json(&value);
        }

        parse_lean_syntax(trimmed)
    }

    fn format_name(&self) -> &str {
        "lean"
    }
}

fn parse_lean_json(value: &serde_json::Value) -> Result<MathIR, ParseError> {
    match value {
        serde_json::Value::Object(map) => {
            let expr_type = map.get("type").and_then(|t| t.as_str()).ok_or(ParseError::Invalid("Missing type".into()))?;
            match expr_type {
                "const" => {
                    let name = map.get("name").and_then(|n| n.as_str()).unwrap_or("");
                    match name {
                        "Nat.zero" | "Int.zero" | "Real.zero" => Ok(MathIR::Const(Constant::Int(0))),
                        "Nat.one" | "Int.one" | "Real.one" => Ok(MathIR::Const(Constant::Int(1))),
                        "Real.pi" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::Pi))),
                        "Real.e" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::E))),
                        _ => Ok(MathIR::Var(Box::new(Variable {
                            id: name.to_string(),
                            domain: Domain::Real,
                            assumptions: AssumptionSet::default(),
                        }))),
                    }
                }
                "app" => {
                    let fn_expr = map.get("fn").ok_or(ParseError::Invalid("Missing function".into()))?;
                    let args = map.get("args").ok_or(ParseError::Invalid("Missing args".into()))?;
                    let fn_ir = parse_lean_json(fn_expr)?;
                    let args_ir: Vec<MathIR> = args.as_array()
                        .ok_or(ParseError::Invalid("Args not array".into()))?
                        .iter()
                        .map(parse_lean_json)
                        .collect::<Result<Vec<_>, _>>()?;

                    if let MathIR::Var(ref v) = fn_ir {
                        match v.id.as_str() {
                            "HAdd.hAdd" | "Add.add" => return Ok(MathIR::Add(args_ir)),
                            "HMul.hMul" | "Mul.mul" => return Ok(MathIR::Mul(args_ir)),
                            "HPow.hPow" | "Pow.pow" => {
                                if args_ir.len() == 2 {
                                    return Ok(MathIR::Pow(Box::new(args_ir[0].clone()), Box::new(args_ir[1].clone())));
                                }
                            }
                            "Eq" => {
                                if args_ir.len() == 2 {
                                    return Ok(MathIR::Eq(Box::new(args_ir[0].clone()), Box::new(args_ir[1].clone())));
                                }
                            }
                            _ => {}
                        }
                    }
                    Err(ParseError::Unsupported { feature: format!("Lean app: {:?}", fn_ir) })
                }
                "lam" | "forall" => {
                    let binder = map.get("binder").and_then(|b| b.as_str()).unwrap_or("_");
                    let body = map.get("body").ok_or(ParseError::Invalid("Missing body".into()))?;
                    let body_ir = parse_lean_json(body)?;
                    let var = Variable {
                        id: binder.to_string(),
                        domain: Domain::Real,
                        assumptions: AssumptionSet::default(),
                    };
                    if expr_type == "forall" {
                        Ok(MathIR::ForAll(var, Box::new(Domain::Real), Box::new(body_ir)))
                    } else {
                        Ok(body_ir)
                    }
                }
                _ => Err(ParseError::Unsupported { feature: format!("Lean type: {}", expr_type) }),
            }
        }
        _ => Err(ParseError::Invalid("Invalid Lean JSON".into())),
    }
}

fn parse_lean_syntax(input: &str) -> Result<MathIR, ParseError> {
    let trimmed = input.trim();

    if trimmed.starts_with("theorem") || trimmed.starts_with("lemma") {
        return Err(ParseError::Unsupported { feature: "Lean theorem".into() });
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

    match trimmed {
        "ℝ" | "Real" => Ok(MathIR::Var(Box::new(Variable {
            id: "Real".into(),
            domain: Domain::Real,
            assumptions: AssumptionSet::default(),
        }))),
        "ℤ" | "Int" => Ok(MathIR::Var(Box::new(Variable {
            id: "Int".into(),
            domain: Domain::Integer,
            assumptions: AssumptionSet::default(),
        }))),
        _ => Err(ParseError::Invalid(format!("Cannot parse Lean syntax: {}", trimmed))),
    }
}
