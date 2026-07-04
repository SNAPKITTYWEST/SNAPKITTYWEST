# snapkitty-mathrosetta

> **Syntax is Liability. Semantics are Truth.**

A universal mathematical translation engine that converts *any* input notation into a canonical intermediate representation, dispatches to optimal solvers, and returns verified results.

```
                    ╔══════════════════════════════════════════════════════╗
                    ║           SNAPKITTY ROSETTA MATH ENGINE             ║
                    ╚══════════════════════════════════════════════════════╝

    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   LaTeX     │    │   SymPy     │    │   Lean 4    │    │   Natural   │
    │   x^2 + y^2 │    │   integrate │    │   theorem   │    │   "solve    │
    │   = 1       │    │   (sin(x))  │    │   : ∃ x, ℝ  │    │    x²-2=0" │
    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
           │                  │                  │                  │
           ▼                  ▼                  ▼                  ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                    ROSETTA STONE PARSER                            │
    │                    ─────────────────────                           │
    │  Multi-frontend ingestion → Canonical MathIR (v0.1)                │
    └─────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                    TRS NORMALIZER                                   │
    │                    ──────────────                                   │
    │  sin²(x) + cos²(x) → 1                                            │
    │  ∫(d/dx f, x) → f                                                 │
    │  exp(ln(x)) → x                                                    │
    └─────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                    PROLOG DISPATCHER                                │
    │                    ────────────────                                 │
    │  classify → select_solver → proof_requirement                      │
    └──────────┬──────────┬──────────┬──────────┬────────────────────────┘
               │          │          │          │
               ▼          ▼          ▼          ▼
           ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
           │ SymPy │  │  Z3   │  │ CVODE │  │ Lean4 │
           │Symbolic│  │  SMT  │  │Stiff  │  │Proof  │
           │       │  │       │  │  ODE  │  │Cert   │
           └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘
               │          │          │          │
               └──────────┴──────────┴──────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  VERIFIED       │
                    │  RESULT         │
                    │  + PROOF        │
                    │  + WORM RECEIPT │
                    └─────────────────┘
```

---

## The Philosophy

Mathematical expressions exist in thousands of notations. A physicist writes `∂ψ/∂t`, a programmer writes `diff(psi, t)`, a logician writes `ψ'`, and a student writes "the derivative of psi with respect to t." 

**They all mean the same thing.**

MathIR is the canonical semantic layer that strips away syntactic sugar and exposes mathematical truth. Once normalized, the *optimal* solver is selected—not by guessing, but by consulting a Prolog knowledge base of solver capabilities.

---

## Core Architecture

### MathIR v0.1 — The Canonical Schema

```rust
// Every mathematical expression on Earth reduces to this:
enum MathIR {
    // Algebra
    Const(Constant),           // π, e, 42, 3.14, 2+3i
    Var(Variable),             // x ∈ ℝ, n ∈ ℤ, f : ℝ→ℝ
    
    // Operations
    Add(Vec<MathIR>),          // x + y + z
    Mul(Vec<MathIR>),          // x · y · z
    Pow(Box<MathIR>, Box<MathIR>), // x^n
    
    // Functions (open registry)
    Fn { name: Symbol, args: Vec<MathIR> }, // sin(x), BesselJ(ν, x)
    
    // Calculus
    Derivative(Box<MathIR>, Variable),      // d/dx
    Integral { expr, var, limits },         // ∫ₐᵇ
    Limit { expr, var, target, dir },       // lim_{x→0}
    
    // Logic (for SMT/Lean)
    And(Vec<MathIR>),           // ∀x > 0, ∃y : x = y²
    ForAll(Variable, Domain, Box<MathIR>),
    
    // Structure
    Matrix(Vec<Vec<MathIR>>),   // Linear algebra
    Tensor { data, shape },     // Neural operators
    Geometric { space, elements }, // Projective, Conformal
}
```

### The Normalizer — Term Rewriting System

```
INPUT:  sin²(x) + cos²(x)
OUTPUT: 1

INPUT:  ∫(d/dx f(x), x)
OUTPUT: f(x)

INPUT:  exp(ln(x))
OUTPUT: x

INPUT:  x + 0
OUTPUT: x

INPUT:  (-x)²
OUTPUT: x²
```

The normalizer applies **confluent rewrite rules** until fixed point. Each rule is independently verifiable and auditable.

### The Dispatcher — Prolog Oracle

```prolog
% Solver capabilities as facts
solver_capability(z3, smt, [quantifiers, non_linear_arithmetic]).
solver_capability(cvode, numeric_ode, [stiff, implicit, adjoint]).
solver_capability(singular, groebner_basis, [polynomial_ideal]).
solver_capability(lean4, formal_proof, [dependent_types, calculus]).

% Domain classification
equation_class(Term, polynomial_system) :- is_polynomial(Term).
equation_class(Term, ode_system(stiff)) :- is_ode(Term), has_stiffness(Term, stiff).

% Dispatch logic
dispatch_class(polynomial_system, solver_spec(singular, [groebner]), proof_req(witness)).
dispatch_class(ode_system(stiff), solver_spec(cvode, [bdf, adjoint]), proof_req(none)).
dispatch_class(logical_constraint, solver_spec(z3, [quantifiers]), proof_req(proof_object)).
```

---

## Quick Start

```bash
# Clone and build
git clone <this-repo> && cd snapkitty-mathrosetta
cargo build --release

# Translate LaTeX → MathIR
echo 'x^2 + y^2 = 1' | ./target/release/sk-math translate --from latex

# Normalize
./target/release/sk-math normalize '{"Add":[{"Var":"x"},{"Const":0}]}'

# Dispatch (get solver recommendation)
./target/release/sk-math dispatch '{"Integral":{"expr":{"Pow":[{"Var":"x"},{"Const":2}]},"var":"x"}}'
```

---

## The Solver Zoo (Nix-Isolated)

Each solver runs in a **hermetic Nix derivation**. No `pip install`, no `apt get`.

| Solver | Class | Capabilities | Proof Level |
|--------|-------|--------------|-------------|
| **Z3** | SMT | Quantifiers, non-linear arithmetic, bitvectors | Proof object |
| **SymPy** | Symbolic | Integration, limits, series, matrix | None (free) |
| **CVODE** | Numeric ODE | Stiff, implicit, adjoint sensitivity | Residual check |
| **Singular** | Polynomial | Gröbner bases, primary decomposition | Witness |
| **Lean 4** | Formal | Dependent types, calculus, topology | Full certificate |
| **CGAL** | Geometric | Arrangements, triangulation, Voronoi | None |
| **Julia** | Numeric | DiffEq, optimization, auto-diff | None |
| **DeepONet** | Neural | PDE operators, mesh-free, high-dim | Residual check |

---

## Trust & Verification

```
┌─────────────────────────────────────────────────────────────┐
│                    TRUST POLICY                              │
├─────────────────────────────────────────────────────────────┤
│  Domain          │ Proof Required    │ Verification          │
├──────────────────┼───────────────────┼───────────────────────┤
│  Financial       │ Lean4 full cert   │ Ed25519 + WORM        │
│  Medical         │ Lean4 full cert   │ Ed25519 + WORM        │
│  Safety-critical │ Lean4 full cert   │ Ed25519 + WORM        │
│  Academic        │ Groebner witness  │ Bifrost anchor        │
│  Research        │ Best effort       │ Audit log             │
└─────────────────────────────────────────────────────────────┘
```

Every result carries:
- **MathIR JSON** — reproducible input
- **Proof certificate** — Lean term, Z3 proof object, or Groebner witness
- **WORM receipt** — Bifrost chain hash for audit trail

---

## Mathematical Expressions Supported

### Algebra
```
x² + y² = 1                    // Circle equation
(ax + by + c = 0)              // Linear equation
x³ - 6x² + 11x - 6 = 0        // Polynomial
```

### Calculus
```
∫₀¹ x² dx = 1/3               // Definite integral
d/dx [sin(x²)] = 2x·cos(x²)   // Chain rule
lim_{x→0} sin(x)/x = 1         // Fundamental limit
Σ_{n=0}^∞ xⁿ/n! = eˣ         // Taylor series
```

### Differential Equations
```
y' + y = 0                     // First-order ODE
y'' + ω²y = sin(ωt)           // Driven harmonic oscillator
∂u/∂t = D∇²u                   // Heat equation
```

### Logic & Proofs
```
∀ε>0, ∃δ>0 : |x-a|<δ → |f(x)-L|<ε   // Epsilon-delta
∃x∈ℝ : x² = 2                        // Existence
(P → Q) ∧ (Q → R) ⊢ (P → R)          // Syllogism
```

### Linear Algebra
```
det(A - λI) = 0                // Characteristic polynomial
A = LDLᵀ                       // Cholesky decomposition
```

---

## Project Structure

```
snapkitty-mathrosetta/
├── Cargo.toml                 # Rust crate configuration
├── flake.nix                  # Nix solver zoo
├── src/
│   ├── ast.rs                 # MathIR v0.1 schema
│   ├── normalizer.rs          # TRS rewrite engine
│   ├── dispatcher.rs          # Prolog-embedded dispatch
│   ├── typer.rs               # Domain inference
│   ├── parser/
│   │   ├── latex.rs           # LaTeX frontend
│   │   ├── sympy.rs           # SymPy JSON/Python frontend
│   │   └── lean.rs            # Lean 4 export frontend
│   ├── bin/sk_math.rs         # CLI entry point
│   └── lib.rs                 # Public API
├── policies/
│   ├── solver_policy.pl       # Dispatch rules
│   ├── trust_policy.pl        # Proof requirements
│   └── resource_policy.pl     # Resource limits
└── tests/rosetta_stone/       # Canonical corpus
```

---

## Development

```bash
# Run tests
cargo test

# Build release
cargo build --release

# Generate MathIR schema
./target/release/sk-math schema

# Watch mode
cargo watch -x run
```

---

## License

Apache-2.0

---

*Built by SnapKitty Agent OS — Syntax is Liability, Semantics are Truth.*
