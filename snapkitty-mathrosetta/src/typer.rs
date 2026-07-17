use crate::{MathIR, Domain};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct Typer {
    type_env: HashMap<String, Domain>,
}

impl Typer {
    pub fn new() -> Self {
        Self {
            type_env: HashMap::new(),
        }
    }

    pub fn infer(&self, expr: &MathIR) -> Domain {
        match expr {
            MathIR::Const(c) => match c {
                crate::Constant::Int(_) => Domain::Integer,
                crate::Constant::Rational { .. } => Domain::Rational,
                crate::Constant::Float(_) => Domain::Real,
                crate::Constant::Complex { .. } => Domain::Complex,
                crate::Constant::Symbolic(s) => match s {
                    crate::SymbolicConst::Pi | crate::SymbolicConst::E => Domain::Real,
                    crate::SymbolicConst::I => Domain::Complex,
                    _ => Domain::Real,
                },
                crate::Constant::String(_) => Domain::UserDefined("String".into()),
            },
            MathIR::Var(v) => {
                self.type_env.get(&v.id).cloned().unwrap_or(v.domain.clone())
            }
            MathIR::Add(args) | MathIR::Mul(args) => {
                args.first().map(|a| self.infer(a)).unwrap_or(Domain::Real)
            }
            MathIR::Pow(base, _) => self.infer(base),
            MathIR::Fn { name, .. } => match name.as_str() {
                "sin" | "cos" | "tan" | "exp" | "ln" | "sqrt" => Domain::Real,
                "conj" | "re" | "im" => Domain::Complex,
                _ => Domain::Real,
            },
            MathIR::Derivative(_, _) | MathIR::Integral { .. } => Domain::Real,
            MathIR::Eq(_, _) | MathIR::Neq(_, _) |
            MathIR::Lt(_, _) | MathIR::Lte(_, _) |
            MathIR::Gt(_, _) | MathIR::Gte(_, _) |
            MathIR::And(_) | MathIR::Or(_) | MathIR::Not(_) |
            MathIR::ForAll(_, _, _) | MathIR::Exists(_, _, _) => Domain::UserDefined("Boolean".into()),
            _ => Domain::Real,
        }
    }
}

impl Default for Typer {
    fn default() -> Self {
        Self::new()
    }
}
