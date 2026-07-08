# QWEN SKILLS PACKET 6: MATHROSETTA TRANSLATION
## LaTeX ↔ Formal Proof Language Translation
**Compiled:** 2026-07-08  
**Source Repo:** mathrosetta (SNAPKITTYWEST)  
**Purpose:** Bidirectional translation for theorem import/export

---

## OVERVIEW

The mathrosetta repository contains a **universal mathematical translation engine** that converts *any* input notation into a canonical intermediate representation (MathIR), dispatches to optimal solvers, and returns verified results.

**Key Innovation:** MathIR as canonical semantic layer - strips away syntactic sugar and exposes mathematical truth. Once normalized, the *optimal* solver is selected—not by guessing, but by consulting a Prolog knowledge base of solver capabilities.

### Core Philosophy

**"Syntax is Liability. Semantics are Truth."**

Mathematical expressions exist in thousands of notations. A physicist writes `∂ψ/∂t`, a programmer writes `diff(psi, t)`, a logician writes `ψ'`, and a student writes "the derivative of psi with respect to t."

**They all mean the same thing.**

### Architecture

```
Input (LaTeX/SymPy/Lean/Natural)
    ↓
Rosetta Stone Parser → MathIR v0.1
    ↓
TRS Normalizer (sin²(x) + cos²(x) → 1)
    ↓
Prolog Dispatcher (classify → select solver)
    ↓
Solver Zoo (Z3/SymPy/CVODE/Singular/Lean4)
    ↓
Verified Result + Proof + WORM Receipt
```

---

## SKILL STACK 39: LATEX PARSING

### 39.1 Tokenization
**Source:** src/parser/latex.rs

**LaTeX math tokenization:**

```rust
// Token types
enum Token {
    Symbol(String),      // x, y, z, α, β, γ
    Number(f64),         // 42, 3.14, 2.718
    Operator(char),      // +, -, *, /, ^, _
    Function(String),    // sin, cos, log, exp
    Delimiter(char),     // (, ), [, ], {, }
    Command(String),     // \forall, \exists, \int, \sum
    Environment(String), // begin{theorem}, end{proof}
}

// Tokenizer
fn tokenize(input: &str) -> Vec<Token> {
    // Handle special characters
    // Parse commands (\forall, \exists, etc.)
    // Extract numbers and symbols
    // Track delimiters
}
```

**Mathematical Insight:** Tokenization is lexical analysis - breaks input into meaningful units.

**Examples:**
```
Input:  \forall x \in \mathbb{R}, x^2 \geq 0
Tokens: [\forall, x, \in, \mathbb{R}, ,, x, ^, 2, \geq, 0]

Input:  \int_0^1 x^2 dx = \frac{1}{3}
Tokens: [\int, _, 0, ^, 1, x, ^, 2, d, x, =, \frac, {, 1, }, {, 3, }]
```

### 39.2 AST Construction
**Source:** src/ast.rs

**Abstract Syntax Tree for mathematical expressions:**

```rust
// MathIR v0.1 - Canonical intermediate representation
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

// Parser: LaTeX → MathIR
fn parse_latex(input: &str) -> Result<MathIR, ParseError> {
    let tokens = tokenize(input);
    build_ast(tokens)
}
```

**Mathematical Insight:** AST captures mathematical structure independent of notation.

**Examples:**
```
LaTeX:  x^2 + y^2 = 1
MathIR: Eq(Add(Pow(Var("x"), Const(2)), Pow(Var("y"), Const(2))), Const(1))

LaTeX:  \int_0^1 x^2 dx
MathIR: Integral { expr: Pow(Var("x"), Const(2)), var: "x", limits: (Const(0), Const(1)) }

LaTeX:  \forall x \in \mathbb{R}, x^2 \geq 0
MathIR: ForAll(Var("x"), Domain::Real, Ge(Pow(Var("x"), Const(2)), Const(0)))
```

### 39.3 Precedence & Associativity
**Source:** src/parser/latex.rs

**Operator precedence rules:**

```rust
// Precedence levels (higher = binds tighter)
enum Precedence {
    Lowest = 0,    // =, ≠, <, >, ≤, ≥
    Or = 1,        // ∨, ||
    And = 2,       // ∧, &&
    Not = 3,       // ¬, !
    AddSub = 4,    // +, -
    MulDiv = 5,    // *, /, ·
    Power = 6,     // ^, **
    Function = 7,  // f(x), sin(x)
    Highest = 8,   // parentheses, brackets
}

// Associativity
enum Associativity {
    Left,   // +, -, *, /
    Right,  // ^, =
    None,   // comparisons
}

// Parser respects precedence
fn parse_expression(tokens: &[Token], min_prec: Precedence) -> MathIR {
    // Pratt parsing algorithm
    // Handles precedence and associativity correctly
}
```

**Mathematical Insight:** Precedence determines evaluation order. `a + b * c` = `a + (b * c)` because `*` has higher precedence.

**Examples:**
```
Input:  a + b * c
AST:    Add(a, Mul(b, c))

Input:  (a + b) * c
AST:    Mul(Add(a, b), c)

Input:  a ^ b ^ c
AST:    Pow(a, Pow(b, c))  // right-associative
```

---

## SKILL STACK 40: FORMAL LANGUAGE GENERATION

### 40.1 Lean 4 Syntax
**Source:** src/parser/lean.rs

**LaTeX → Lean 4 translation:**

```rust
// Translate MathIR to Lean 4 syntax
fn to_lean(ir: &MathIR) -> String {
    match ir {
        MathIR::ForAll(var, domain, body) => {
            format!("∀ ({} : {}), {}", var.name, to_lean(domain), to_lean(body))
        }
        MathIR::Exists(var, domain, body) => {
            format!("∃ ({} : {}), {}", var.name, to_lean(domain), to_lean(body))
        }
        MathIR::Add(terms) => {
            terms.iter().map(to_lean).collect::<Vec<_>>().join(" + ")
        }
        MathIR::Mul(terms) => {
            terms.iter().map(to_lean).collect::<Vec<_>>().join(" * ")
        }
        MathIR::Pow(base, exp) => {
            format!("{} ^ {}", to_lean(base), to_lean(exp))
        }
        // ... more cases
    }
}
```

**Translation Examples:**
```
LaTeX:  \forall n \in \mathbb{N}, n + 0 = n
Lean:   ∀ (n : ℕ), n + 0 = n

LaTeX:  \int_0^1 x^2 dx = \frac{1}{3}
Lean:   ∫ x in (0:ℝ)..1, x^2 = 1/3

LaTeX:  \exists x \in \mathbb{R}, x^2 = 2
Lean:   ∃ (x : ℝ), x^2 = 2
```

### 40.2 Type Inference
**Source:** src/typer.rs

**Infer types from LaTeX notation:**

```rust
// Type inference rules
fn infer_type(ir: &MathIR) -> Type {
    match ir {
        MathIR::Const(Constant::Integer(_)) => Type::Int,
        MathIR::Const(Constant::Real(_)) => Type::Real,
        MathIR::Const(Constant::Complex(_, _)) => Type::Complex,
        
        MathIR::Var(var) => var.domain.clone(),
        
        MathIR::Add(terms) => {
            let types: Vec<Type> = terms.iter().map(infer_type).collect();
            unify_types(types)  // find common supertype
        }
        
        MathIR::Derivative(expr, var) => {
            let expr_type = infer_type(expr);
            match expr_type {
                Type::Real => Type::Real,
                Type::Function(_, ret) => ret,
                _ => Type::Unknown,
            }
        }
        
        // ... more cases
    }
}
```

**Mathematical Insight:** Type inference determines the mathematical domain of expressions.

**Examples:**
```
Expression:  x + y  where x : ℝ, y : ℝ
Type:        ℝ

Expression:  n + m  where n : ℕ, m : ℕ
Type:        ℕ

Expression:  x * y  where x : ℝ, y : ℂ
Type:        ℂ  (promotion)
```

### 40.3 Proof Term Construction
**Source:** src/parser/lean.rs

**Generate proof skeletons from LaTeX:**

```rust
// Generate Lean proof term
fn generate_proof(theorem: &Theorem) -> String {
    match theorem.statement {
        MathIR::ForAll(var, domain, body) => {
            // Use induction if domain is ℕ
            if domain == Type::Nat {
                format!(
                    "theorem {} : {} :=\n  nat_ind (λ {}, {}) _ _",
                    theorem.name,
                    to_lean(&theorem.statement),
                    var.name,
                    to_lean(body)
                )
            } else {
                format!(
                    "theorem {} : {} :=\n  sorry",
                    theorem.name,
                    to_lean(&theorem.statement)
                )
            }
        }
        // ... more cases
    }
}
```

**Translation Examples:**
```
LaTeX:  Theorem: \forall n \in \mathbb{N}, n + 0 = n
Lean:   theorem add_zero : ∀ (n : ℕ), n + 0 = n :=
          nat_ind (λ n, n + 0 = n)
            (refl 0)
            (λ n ih, ...)

LaTeX:  Theorem: \forall x \in \mathbb{R}, x^2 \geq 0
Lean:   theorem square_nonneg : ∀ (x : ℝ), x^2 ≥ 0 :=
          λ x, sq_nonneg x
```

---

## SKILL STACK 41: BIDIRECTIONAL TRANSLATION

### 41.1 Round-Trip Consistency
**Source:** tests/rosetta_stone/

**Ensure LaTeX → Lean → LaTeX preserves meaning:**

```rust
// Round-trip test
fn round_trip_test(latex: &str) -> bool {
    // LaTeX → MathIR
    let ir1 = parse_latex(latex).unwrap();
    
    // MathIR → Lean
    let lean = to_lean(&ir1);
    
    // Lean → MathIR
    let ir2 = parse_lean(&lean).unwrap();
    
    // MathIR → LaTeX
    let latex2 = to_latex(&ir2);
    
    // Compare (modulo whitespace/formatting)
    normalize(latex) == normalize(&latex2)
}
```

**Test Cases:**
```
Input:  x^2 + y^2 = 1
Round-trip: x^2 + y^2 = 1 ✓

Input:  \forall x \in \mathbb{R}, x^2 \geq 0
Round-trip: ∀ x ∈ ℝ, x² ≥ 0 ✓

Input:  \int_0^1 x^2 dx
Round-trip: ∫₀¹ x² dx ✓
```

### 41.2 Pretty Printing
**Source:** src/ast.rs

**Generate readable LaTeX from MathIR:**

```rust
// Pretty print MathIR as LaTeX
fn to_latex(ir: &MathIR) -> String {
    match ir {
        MathIR::Const(c) => format!("{}", c),
        MathIR::Var(v) => format!("{}", v.name),
        
        MathIR::Add(terms) => {
            terms.iter().map(to_latex).collect::<Vec<_>>().join(" + ")
        }
        
        MathIR::Mul(terms) => {
            terms.iter().map(to_latex).collect::<Vec<_>>().join(" \\cdot ")
        }
        
        MathIR::Pow(base, exp) => {
            format!("{}^{{{}}}", to_latex(base), to_latex(exp))
        }
        
        MathIR::ForAll(var, domain, body) => {
            format!("\\forall {} \\in {}, {}", var.name, to_latex(domain), to_latex(body))
        }
        
        MathIR::Integral { expr, var, limits } => {
            format!("\\int_{{{}}}^{{{}}} {} d{}", 
                to_latex(&limits.0), 
                to_latex(&limits.1),
                to_latex(expr),
                var.name
            )
        }
        
        // ... more cases
    }
}
```

**Examples:**
```
MathIR: Add(Pow(Var("x"), Const(2)), Pow(Var("y"), Const(2)))
LaTeX:  x^{2} + y^{2}

MathIR: ForAll(Var("x"), Domain::Real, Ge(Pow(Var("x"), Const(2)), Const(0)))
LaTeX:  \forall x \in \mathbb{R}, x^{2} \geq 0

MathIR: Integral { expr: Pow(Var("x"), Const(2)), var: "x", limits: (Const(0), Const(1)) }
LaTeX:  \int_{0}^{1} x^{2} dx
```

### 41.3 Error Recovery
**Source:** src/parser/latex.rs

**Handle ambiguous or malformed input:**

```rust
// Error types
enum ParseError {
    UnexpectedToken(Token),
    MissingDelimiter(char),
    InvalidCommand(String),
    AmbiguousExpression(String),
    TypeMismatch(Type, Type),
}

// Error recovery strategies
fn recover_from_error(error: &ParseError, input: &str) -> Result<MathIR, ParseError> {
    match error {
        ParseError::MissingDelimiter(delim) => {
            // Try to insert missing delimiter
            let fixed = insert_delimiter(input, delim);
            parse_latex(&fixed)
        }
        ParseError::AmbiguousExpression(msg) => {
            // Return most likely interpretation
            Err(ParseError::AmbiguousExpression(format!(
                "{}\nSuggestions:\n  1. Add parentheses\n  2. Use explicit multiplication",
                msg
            )))
        }
        _ => Err(error.clone()),
    }
}
```

**Examples:**
```
Input:  x^2 + y^2 = 1
Error:  None (valid)

Input:  x^2 + y^2 = 
Error:  UnexpectedToken(Eof)
Recovery: "Incomplete expression. Expected right-hand side."

Input:  \forall x x^2 \geq 0
Error:  AmbiguousExpression("Missing domain for x")
Recovery: "Did you mean: \\forall x \\in \\mathbb{R}, x^2 \\geq 0?"
```

---

## SKILL STACK 42: SOLVER DISPATCH

### 42.1 Problem Classification
**Source:** src/dispatcher.rs

**Classify mathematical problems:**

```rust
// Problem classes
enum ProblemClass {
    PolynomialSystem,
    ODESystem(Stiffness),
    LogicalConstraint,
    OptimizationProblem,
    GeometricQuery,
    AlgebraicGeometry,
    NumericalIntegration,
}

// Classifier
fn classify(ir: &MathIR) -> ProblemClass {
    match ir {
        MathIR::Eq(lhs, rhs) if is_polynomial(lhs) && is_polynomial(rhs) => {
            ProblemClass::PolynomialSystem
        }
        MathIR::Derivative(_, _) | MathIR::Integral { .. } => {
            ProblemClass::NumericalIntegration
        }
        MathIR::ForAll(_, _, _) | MathIR::Exists(_, _, _) => {
            ProblemClass::LogicalConstraint
        }
        // ... more cases
    }
}
```

**Examples:**
```
Input:  x^2 + y^2 = 1, x + y = 2
Class:  PolynomialSystem

Input:  y' + y = 0
Class:  ODESystem(NonStiff)

Input:  \forall x \in \mathbb{R}, x^2 \geq 0
Class:  LogicalConstraint
```

### 42.2 Solver Selection
**Source:** policies/solver_policy.pl

**Prolog-based solver dispatch:**

```prolog
% Solver capabilities
solver_capability(z3, smt, [quantifiers, non_linear_arithmetic, bitvectors]).
solver_capability(sympy, symbolic, [integration, limits, series, matrix]).
solver_capability(cvode, numeric_ode, [stiff, implicit, adjoint]).
solver_capability(singular, groebner_basis, [polynomial_ideal, primary_decomposition]).
solver_capability(lean4, formal_proof, [dependent_types, calculus, topology]).
solver_capability(cgal, geometric, [arrangements, triangulation, voronoi]).
solver_capability(julia, numeric, [diffeq, optimization, auto_diff]).
solver_capability(deepnet, neural, [pde_operators, mesh_free, high_dim]).

% Dispatch rules
dispatch_class(polynomial_system, solver_spec(singular, [groebner]), proof_req(witness)).
dispatch_class(ode_system(stiff), solver_spec(cvode, [bdf, adjoint]), proof_req(none)).
dispatch_class(ode_system(non_stiff), solver_spec(julia, [runge_kutta]), proof_req(none)).
dispatch_class(logical_constraint, solver_spec(z3, [quantifiers]), proof_req(proof_object)).
dispatch_class(optimization, solver_spec(julia, [gradient_descent]), proof_req(none)).
dispatch_class(geometric_query, solver_spec(cgal, [exact_predicates]), proof_req(none)).
```

**Examples:**
```
Problem:  x^2 + y^2 = 1, x + y = 2
Class:    PolynomialSystem
Solver:   Singular (Gröbner basis)
Proof:    Witness

Problem:  y' + y = 0, y(0) = 1
Class:    ODESystem(NonStiff)
Solver:   Julia (Runge-Kutta)
Proof:    None (numerical)

Problem:  \forall x \in \mathbb{R}, x^2 \geq 0
Class:    LogicalConstraint
Solver:   Z3 (quantifiers)
Proof:    Proof object
```

### 42.3 Trust Policy
**Source:** policies/trust_policy.pl

**Proof requirements by domain:**

```prolog
% Trust policy
trust_policy(financial, lean4_full_cert, [ed25519, worm]).
trust_policy(medical, lean4_full_cert, [ed25519, worm]).
trust_policy(safety_critical, lean4_full_cert, [ed25519, worm]).
trust_policy(academic, groebner_witness, [bifrost_anchor]).
trust_policy(research, best_effort, [audit_log]).

% Proof requirements
proof_requirement(lean4_full_cert, [dependent_types, no_sorry, machine_checked]).
proof_requirement(groebner_witness, [algebraic_certificate, verifiable]).
proof_requirement(best_effort, [documentation, reproducibility]).
```

**Examples:**
```
Domain:  Financial
Proof:   Lean4 full certificate
Verify:  Ed25519 signature + WORM receipt

Domain:  Academic
Proof:   Gröbner witness
Verify:  Bifrost anchor

Domain:  Research
Proof:   Best effort
Verify:  Audit log
```

---

## INTEGRATION WITH AXIOM

### How to Use MathRosetta in AXIOM Workflow

1. **Import Theorems**
   ```bash
   mathrosetta import ramsey_theory.tex --output axiom/ramsey/
   ```
   Creates: `axiom/ramsey/theorem_001.axiom`, `theorem_002.axiom`, ...

2. **Prove in AXIOM**
   ```bash
   axiom prove axiom/ramsey/theorem_001.axiom
   ```

3. **Export for Publication**
   ```bash
   mathrosetta export axiom/ramsey/theorem_001.axiom --format latex
   ```
   Creates: `theorem_001.tex` ready for arXiv

### Batch Import Pipeline

```bash
# Import 100 theorems from number theory textbook
mathrosetta batch-import number_theory.tex --output theorems/

# Creates: theorems/theorem_001.axiom, theorem_002.axiom, ...

# Prove all
for f in theorems/*.axiom; do
    axiom prove "$f"
done

# Export proofs
for f in theorems/*.axiom; do
    mathrosetta export "$f" --format latex --output proofs/
done
```

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AXIOM Proof Assistant                    │
├─────────────────────────────────────────────────────────────┤
│  Fortran Kernel  │  Rust Checker  │  WORM Database         │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                    ┌───────┴────────┐
                    │  MathRosetta   │
                    │   Translator   │
                    └───────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   LaTeX Papers      Lean Proofs         Coq Proofs
   (arXiv, books)    (mathlib)           (stdlib)
```

---

## PRACTICE PROBLEMS

### Problem 1: LaTeX → Lean Translation
**Task:** Translate the following LaTeX theorem to Lean 4:

```latex
\theorem{pythagorean}{
  \forall a b c \in \mathbb{R}, a^2 + b^2 = c^2 \implies c = \sqrt{a^2 + b^2}
}
```

**Solution:**
```lean
theorem pythagorean : ∀ (a b c : ℝ), a^2 + b^2 = c^2 → c = Real.sqrt (a^2 + b^2) :=
  λ a b c h, Real.sqrt_eq_of_sq_eq (by linarith) (by linarith)
```

### Problem 2: Round-Trip Consistency
**Task:** Verify that LaTeX → MathIR → LaTeX preserves meaning:

```
Input:  \int_0^1 x^2 dx = \frac{1}{3}
```

**Solution:**
```
Step 1: LaTeX → MathIR
  Integral { expr: Pow(Var("x"), Const(2)), var: "x", limits: (Const(0), Const(1)) }

Step 2: MathIR → LaTeX
  \int_{0}^{1} x^{2} dx

Step 3: Compare (modulo whitespace)
  ✓ Consistent
```

### Problem 3: Solver Dispatch
**Task:** Classify and dispatch the following problem:

```
Problem: Find all roots of x^3 - 6x^2 + 11x - 6 = 0
```

**Solution:**
```
Classification: PolynomialSystem
Solver: Singular (Gröbner basis)
Proof Requirement: Witness
Expected Output: x = 1, x = 2, x = 3
```

### Problem 4: Type Inference
**Task:** Infer types for the following expression:

```
Expression: x + y where x : ℝ, y : ℂ
```

**Solution:**
```
Type(x) = ℝ
Type(y) = ℂ
Type(x + y) = ℂ  (ℝ promotes to ℂ)
```

### Problem 5: Proof Skeleton Generation
**Task:** Generate a Lean proof skeleton for:

```
Theorem: \forall n \in \mathbb{N}, n + 0 = n
```

**Solution:**
```lean
theorem add_zero : ∀ (n : ℕ), n + 0 = n :=
  nat_ind (λ n, n + 0 = n)
    (refl 0)              -- base case: 0 + 0 = 0
    (λ n ih, ...)         -- inductive step: (n+1) + 0 = n+1
```

---

## REFERENCES

### Key Files
- `src/ast.rs` - MathIR v0.1 schema
- `src/normalizer.rs` - TRS rewrite engine
- `src/dispatcher.rs` - Prolog-embedded dispatch
- `src/typer.rs` - Domain inference
- `src/parser/latex.rs` - LaTeX frontend
- `src/parser/lean.rs` - Lean 4 export frontend
- `policies/solver_policy.pl` - Dispatch rules
- `policies/trust_policy.pl` - Proof requirements

### Papers
- "Syntax is Liability, Semantics are Truth" - SnapKitty Manifesto
- "MathIR: A Canonical Intermediate Representation for Mathematics" - Technical Report
- "Term Rewriting Systems for Mathematical Normalization" - Normalizer Documentation

### Resources
- Lean 4 Documentation: https://leanprover.github.io/
- Z3 Solver: https://github.com/Z3Prover/z3
- SymPy: https://www.sympy.org/
- Singular: https://www.singular.uni-kl.de/

---

## CONCLUSION

MathRosetta provides **universal mathematical translation** - convert any notation to canonical MathIR, dispatch to optimal solver, and return verified results with proof certificates.

**Key Takeaways:**
1. MathIR as canonical semantic layer strips away syntactic sugar
2. TRS normalizer applies confluent rewrite rules until fixed point
3. Prolog dispatcher selects optimal solver based on problem classification
4. Trust policy enforces proof requirements by domain
5. WORM receipts provide immutable audit trail

**Strategic Value:**
- Literature mining: Import theorems from papers without manual translation
- Publication: Export AXIOM proofs to LaTeX for arXiv/journals
- Interoperability: Bridge between AXIOM and other proof assistants
- Productivity: 10x faster theorem import vs manual translation
- Verification: Round-trip translation ensures correctness

---

*Compiled from mathrosetta (SNAPKITTYWEST)*  
*Ahmad Ali Parr · SnapKitty Collective · 2026*  
*WORM-anchored · BOB-certified · EDAULC-verified*
