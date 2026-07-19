pub mod normalizer {
    pub use crate::normalizer::*;
}

pub mod typer {
    pub use crate::typer::*;
}

pub mod dispatcher {
    pub use crate::dispatcher::*;
}

use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum MathIR {
    // Core Algebra
    Const(Constant),
    Var(Box<Variable>),

    // Operators
    Add(Vec<MathIR>),
    Mul(Vec<MathIR>),
    Pow(Box<MathIR>, Box<MathIR>),

    // Functions
    Fn { name: Symbol, args: Vec<MathIR> },

    // Calculus
    Derivative(Box<MathIR>, Variable),
    Integral { expr: Box<MathIR>, var: Variable, limits: Option<(Box<MathIR>, Box<MathIR>)> },
    Limit { expr: Box<MathIR>, var: Variable, target: Box<MathIR>, dir: Dir },
    Sum { expr: Box<MathIR>, var: Variable, limits: (Box<MathIR>, Box<MathIR>) },
    Product { expr: Box<MathIR>, var: Variable, limits: (Box<MathIR>, Box<MathIR>) },

    // Logic
    And(Vec<MathIR>),
    Or(Vec<MathIR>),
    Not(Box<MathIR>),
    Implies(Box<MathIR>, Box<MathIR>),
    Iff(Box<MathIR>, Box<MathIR>),
    ForAll(Variable, Box<Domain>, Box<MathIR>),
    Exists(Variable, Box<Domain>, Box<MathIR>),

    // Relations
    Eq(Box<MathIR>, Box<MathIR>),
    Neq(Box<MathIR>, Box<MathIR>),
    Lt(Box<MathIR>, Box<MathIR>),
    Lte(Box<MathIR>, Box<MathIR>),
    Gt(Box<MathIR>, Box<MathIR>),
    Gte(Box<MathIR>, Box<MathIR>),

    // Matrix / Tensor / Geometric
    Matrix(Vec<Vec<MathIR>>),
    Vector(Vec<MathIR>),
    Tensor { data: Vec<MathIR>, shape: Vec<usize> },
    Geometric { space: SpaceType, elements: Vec<MathIR> },

    // Sets
    Set(Vec<MathIR>),
    SetUnion(Box<MathIR>, Box<MathIR>),
    SetIntersect(Box<MathIR>, Box<MathIR>),
    SetDiff(Box<MathIR>, Box<MathIR>),
    In(Box<MathIR>, Box<MathIR>),

    // Meta / Proof
    Proof { claim: Box<MathIR>, proof: ProofTerm },
    Trusted { source: String, hash: String, expr: Box<MathIR> },
    Annotated { inner: Box<MathIR>, annotations: Annotations },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Variable {
    pub id: String,
    pub domain: Domain,
    pub assumptions: AssumptionSet,
}

impl Default for Variable {
    fn default() -> Self {
        Self {
            id: String::new(),
            domain: Domain::Real,
            assumptions: AssumptionSet::default(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Symbol {
    pub name: String,
}

impl Symbol {
    pub fn as_str(&self) -> &str {
        &self.name
    }
}

impl From<&str> for Symbol {
    fn from(s: &str) -> Self {
        Self { name: s.to_string() }
    }
}

impl From<String> for Symbol {
    fn from(s: String) -> Self {
        Self { name: s }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum Dir {
    Positive,
    Negative,
    Both,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum SpaceType {
    Euclidean(String),
    Projective(String),
    Conformal(String),
    Symplectic(String),
    Hyperbolic(String),
    Spherical(String),
    Custom(String),
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ProofTerm {
    Lean(String),
    Coq(String),
    Z3Proof(String),
    Witness(String),
    Certificate(String),
    None,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Annotations {
    pub domain_hints: HashMap<String, String>,
    pub source_format: Option<String>,
    pub source_text: Option<String>,
    pub solver_hints: Vec<String>,
    pub metadata: HashMap<String, String>,
}

impl Annotations {
    pub fn new() -> Self {
        Self {
            domain_hints: HashMap::new(),
            source_format: None,
            source_text: None,
            solver_hints: vec![],
            metadata: HashMap::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum Constant {
    Int(i64),
    Rational { numer: i64, denom: i64 },
    Float(f64),
    Complex { re: Box<MathIR>, im: Box<MathIR> },
    Symbolic(SymbolicConst),
    String(String),
}

impl Eq for Constant {}

impl std::hash::Hash for Constant {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        std::mem::discriminant(self).hash(state);
        match self {
            Constant::Int(n) => n.hash(state),
            Constant::Rational { numer, denom } => {
                numer.hash(state);
                denom.hash(state);
            }
            Constant::Float(f) => f.to_bits().hash(state),
            Constant::Symbolic(s) => s.hash(state),
            Constant::String(s) => s.hash(state),
            _ => {}
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
pub enum SymbolicConst {
    Pi,
    E,
    EulerGamma,
    Catalan,
    Infinity,
    NegInfinity,
    ComplexInfinity,
    I,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum Domain {
    Real,
    Complex,
    Integer,
    Natural,
    Rational,
    Positive,
    Negative,
    NonZero,
    Modulo(u64),
    FunctionSpace { domain: Box<Domain>, codomain: Box<Domain> },
    Manifold(String),
    VectorSpace { dim: usize, field: Box<Domain> },
    MatrixSpace { rows: usize, cols: usize, field: Box<Domain> },
    UserDefined(String),
    Any,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct AssumptionSet {
    pub positive: bool,
    pub negative: bool,
    pub integer: bool,
    pub real: bool,
    pub commutative: bool,
    pub bounded: Option<(Box<MathIR>, Box<MathIR>)>,
    pub custom: Vec<String>,
}

impl Default for AssumptionSet {
    fn default() -> Self {
        Self {
            positive: false,
            negative: false,
            integer: false,
            real: true,
            commutative: true,
            bounded: None,
            custom: vec![],
        }
    }
}

impl MathIR {
    pub fn is_arithmetic(&self) -> bool {
        matches!(self, MathIR::Add(_) | MathIR::Mul(_) | MathIR::Pow(_, _) | MathIR::Const(_) | MathIR::Var(_))
    }

    pub fn is_atomic(&self) -> bool {
        matches!(self, MathIR::Const(_) | MathIR::Var(_))
    }

    pub fn children(&self) -> Vec<&MathIR> {
        match self {
            MathIR::Add(args) | MathIR::Mul(args) | MathIR::And(args) | MathIR::Or(args) => {
                args.iter().collect()
            }
            MathIR::Pow(a, b) | MathIR::Eq(a, b) | MathIR::Neq(a, b)
            | MathIR::Lt(a, b) | MathIR::Lte(a, b) | MathIR::Gt(a, b) | MathIR::Gte(a, b)
            | MathIR::Implies(a, b) | MathIR::Iff(a, b) => {
                vec![a.as_ref(), b.as_ref()]
            }
            MathIR::Not(a) | MathIR::Derivative(a, _) => {
                vec![a.as_ref()]
            }
            MathIR::Var(_v) => {
                vec![]
            }
            MathIR::Fn { args, .. } => args.iter().collect(),
            MathIR::Integral { expr, .. } | MathIR::Limit { expr, .. }
            | MathIR::Sum { expr, .. } | MathIR::Product { expr, .. } => {
                vec![expr.as_ref()]
            }
            _ => vec![],
        }
    }
}

pub mod json_schema {
    use super::*;

    pub fn generate_mathir_schema() -> String {
        let schema = serde_json::json!({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "$id": "https://snapkitty.dev/mathir/v0.1",
            "title": "MathIR v0.1",
            "type": "object"
        });
        serde_json::to_string_pretty(&schema).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_json_roundtrip() {
        let expr = MathIR::Eq(
            Box::new(MathIR::Pow(
                Box::new(MathIR::Var(Variable {
                    id: "x".to_string(),
                    domain: Domain::Real,
                    assumptions: AssumptionSet::default(),
                }.into())),
                Box::new(MathIR::Const(Constant::Int(2))),
            )),
            Box::new(MathIR::Const(Constant::Int(1))),
        );
        let json = serde_json::to_string(&expr).unwrap();
        let parsed: MathIR = serde_json::from_str(&json).unwrap();
        assert_eq!(expr, parsed);
    }
}
