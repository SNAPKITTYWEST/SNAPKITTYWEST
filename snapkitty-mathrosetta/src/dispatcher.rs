use crate::MathIR;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolverSpec {
    pub solver: SolverBackend,
    pub capabilities: Vec<String>,
    pub params: SolverParams,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SolverBackend {
    SymPy,
    Z3,
    CVC5,
    CVODE,
    Julia,
    Singular,
    Lean4,
    CGAL,
    DeepONet,
    Fallback,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolverParams {
    pub timeout_ms: u64,
    pub max_memory_mb: u64,
    pub gpu: bool,
    pub rtol: Option<f64>,
    pub atol: Option<f64>,
}

impl Default for SolverParams {
    fn default() -> Self {
        Self {
            timeout_ms: 30000,
            max_memory_mb: 4096,
            gpu: false,
            rtol: None,
            atol: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofRequirement {
    pub level: ProofLevel,
    pub backends: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProofLevel {
    None,
    Witness,
    FullCertificate,
    LeanTerm,
    Z3ProofObject,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DispatchResult {
    pub solver: SolverSpec,
    pub proof: ProofRequirement,
    pub equation_class: EquationClass,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EquationClass {
    PolynomialSystem,
    ODE { stiffness: Stiffness },
    PDE { geometry: String },
    IntegralEquation,
    LogicalConstraint,
    Geometric,
    TensorAlgebra,
    SymbolicIntegration,
    SymbolicLimit,
    LinearAlgebra,
    Fallback,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Stiffness {
    Stiff,
    NonStiff,
    Unknown,
}

pub struct Dispatcher;

impl Dispatcher {
    pub fn new() -> Self {
        Self
    }

    pub fn dispatch(&self, expr: &MathIR) -> DispatchResult {
        let eq_class = self.classify(expr);
        let solver = self.select_solver(&eq_class);
        let proof = self.require_proof(&eq_class);

        DispatchResult {
            solver,
            proof,
            equation_class: eq_class,
            confidence: 0.8,
        }
    }

    fn classify(&self, expr: &MathIR) -> EquationClass {
        match expr {
            MathIR::Eq(_, _) => EquationClass::PolynomialSystem,
            MathIR::Integral { .. } => EquationClass::SymbolicIntegration,
            MathIR::Limit { .. } => EquationClass::SymbolicLimit,
            MathIR::Derivative(_, _) => EquationClass::SymbolicIntegration,
            MathIR::ForAll(_, _, _) | MathIR::Exists(_, _, _) => EquationClass::LogicalConstraint,
            MathIR::Matrix(_) => EquationClass::LinearAlgebra,
            MathIR::Tensor { .. } => EquationClass::TensorAlgebra,
            MathIR::Geometric { .. } => EquationClass::Geometric,
            MathIR::And(_) | MathIR::Or(_) | MathIR::Not(_) | MathIR::Implies(_, _) => EquationClass::LogicalConstraint,
            _ => EquationClass::Fallback,
        }
    }

    fn select_solver(&self, eq_class: &EquationClass) -> SolverSpec {
        match eq_class {
            EquationClass::PolynomialSystem => SolverSpec {
                solver: SolverBackend::Singular,
                capabilities: vec!["groebner".into()],
                params: SolverParams { timeout_ms: 60000, ..Default::default() },
            },
            EquationClass::SymbolicIntegration | EquationClass::SymbolicLimit => SolverSpec {
                solver: SolverBackend::SymPy,
                capabilities: vec!["integration".into(), "limits".into()],
                params: SolverParams::default(),
            },
            EquationClass::LogicalConstraint => SolverSpec {
                solver: SolverBackend::Z3,
                capabilities: vec!["quantifiers".into()],
                params: SolverParams::default(),
            },
            _ => SolverSpec {
                solver: SolverBackend::Fallback,
                capabilities: vec!["sympy".into()],
                params: SolverParams::default(),
            },
        }
    }

    fn require_proof(&self, eq_class: &EquationClass) -> ProofRequirement {
        match eq_class {
            EquationClass::LogicalConstraint => ProofRequirement {
                level: ProofLevel::Z3ProofObject,
                backends: vec!["z3".into()],
            },
            EquationClass::PolynomialSystem => ProofRequirement {
                level: ProofLevel::Witness,
                backends: vec!["groebner_basis".into()],
            },
            _ => ProofRequirement {
                level: ProofLevel::None,
                backends: vec![],
            },
        }
    }
}

impl Default for Dispatcher {
    fn default() -> Self {
        Self::new()
    }
}
