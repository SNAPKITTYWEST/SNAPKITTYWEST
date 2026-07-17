# MathRosetta Survey Results

## Overview

**Repository:** https://github.com/SNAPKITTYWEST/mathrosetta  
**Purpose:** Universal mathematical translation engine (LaTeX ↔ Formal proof languages)  
**Language:** Rust with WASM bindings  
**Status:** Active development, has interactive playground

## Architecture

```
mathrosetta/
├── src/
│   ├── ast.rs                 # MathIR v0.1 schema (canonical intermediate representation)
│   ├── normalizer.rs          # TRS rewrite engine (sin²(x) + cos²(x) → 1)
│   ├── dispatcher.rs          # Prolog-embedded solver dispatch
│   ├── typer.rs               # Domain inference
│   ├── wasm.rs                # WASM bindings (wasm-bindgen)
│   ├── parser/
│   │   ├── latex.rs           # LaTeX frontend
│   │   ├── sympy.rs           # SymPy JSON/Python frontend
│   │   └── lean.rs            # Lean 4 export frontend
│   ├── bin/sk_math.rs         # CLI entry point
│   └── lib.rs                 # Public API
├── playground/                # Browser-based interactive playground
│   ├── index.html             # Main UI
│   ├── style.css              # Dark theme styles
│   ├── playground.js          # Client-side logic + WASM bridge
│   └── package.json           # Dev server config
├── policies/
│   ├── solver_policy.pl       # Dispatch rules
│   ├── trust_policy.pl        # Proof requirements
│   └── resource_policy.pl     # Resource limits
├── proofs/                    # Formal proof examples
├── Cargo.toml                 # Rust crate configuration
├── flake.nix                  # Nix solver zoo
├── index.html                 # Playground entry point
├── playground.js              # Playground logic
└── style.css                  # Playground styles
```

## Core Components

### 1. MathIR v0.1 (ast.rs)

Canonical intermediate representation for all mathematical expressions:

```rust
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

### 2. TRS Normalizer (normalizer.rs)

Term Rewriting System with confluent rewrite rules:

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

### 3. Prolog Dispatcher (dispatcher.rs + policies/)

Solver selection based on problem classification:

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

### 4. Solver Zoo (flake.nix)

Nix-isolated solver environment:

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

### 5. Trust Policy (policies/trust_policy.pl)

Proof requirements by domain:

```
┌──────────────────┬───────────────────┬───────────────────────┐
│  Domain          │ Proof Required    │ Verification          │
├──────────────────┼───────────────────┼───────────────────────┤
│  Financial       │ Lean4 full cert   │ Ed25519 + WORM        │
│  Medical         │ Lean4 full cert   │ Ed25519 + WORM        │
│  Safety-critical │ Lean4 full cert   │ Ed25519 + WORM        │
│  Academic        │ Groebner witness  │ Bifrost anchor        │
│  Research        │ Best effort       │ Audit log             │
└──────────────────┴───────────────────┴───────────────────────┘
```

## Supported Mathematical Expressions

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

## CLI Interface

```bash
# Translate LaTeX → MathIR
echo 'x^2 + y^2 = 1' | ./target/release/sk-math translate --from latex

# Normalize
./target/release/sk-math normalize '{"Add":[{"Var":"x"},{"Const":0}]}'

# Dispatch (get solver recommendation)
./target/release/sk-math dispatch '{"Integral":{"expr":{"Pow":[{"Var":"x"},{"Const":2}]},"var":"x"}}'
```

## Interactive Playground

Browser-based UI with:
- Real-time parsing (LaTeX, Python/SymPy, Natural language)
- Live KaTeX rendering
- MathIR visualization
- Normalization display
- Solver dispatch preview
- AST tree visualization

## Integration Points with AXIOM

1. **LaTeX → AXIOM Translation:** Import theorems from papers/books
2. **AXIOM → LaTeX Export:** Publish proofs in standard notation
3. **MathIR as Bridge:** Canonical representation between systems
4. **Solver Dispatch:** Route AXIOM problems to optimal solvers
5. **Trust Policy:** Enforce proof requirements by domain
6. **WORM Receipts:** Seal verification results to immutable ledger

## Gaps & Extensions Needed

1. **AXIOM Frontend:** Add `parser/axiom.rs` for AXIOM syntax
2. **AXIOM Backend:** Add Lean 4 → AXIOM translation
3. **Batch Import:** Import 100+ theorems from textbooks
4. **Round-Trip Tests:** LaTeX → AXIOM → LaTeX consistency
5. **Proof Sketch Generation:** Auto-generate AXIOM proof skeletons
6. **Integration Tests:** Test with existing AXIOM proof assistant

## Strategic Value

- **Literature Mining:** Import theorems from papers without manual translation
- **Publication:** Export AXIOM proofs to LaTeX for arXiv/journals
- **Interoperability:** Bridge between AXIOM and other proof assistants
- **Productivity:** 10x faster theorem import vs manual translation
- **Verification:** Round-trip translation ensures correctness

## References

- MathIR v0.1 schema (src/ast.rs)
- TRS normalizer (src/normalizer.rs)
- Prolog dispatcher (src/dispatcher.rs + policies/)
- Solver zoo (flake.nix)
- Interactive playground (playground/)
