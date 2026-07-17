# QWEN'S NEXT MISSION: Build AXIOM Proof Assistant

## THE NAME: **AXIOM**

**Why AXIOM:**
- Already one of your 11 agents (Finance/Triple-Entry authority)
- Implies fundamental truth and first principles
- Short, memorable, powerful
- Domain available: axiom-proof.org
- GitHub: github.com/SNAPKITTYWEST/axiom-proof

**Tagline:** "Sovereign proof assistant. Faster than Lean 4. Verifiable by design. Built from scratch."

---

## WHAT NEEDS TO BE BUILT

### Phase 1: Minimal Proof Kernel (PRIORITY)

**1. Type Theory Core (Fortran)**
```fortran
! src/kernel/types.f90
! Dependent type system
! Universe hierarchy (Type 0, Type 1, ...)
! Pi types (dependent functions)
! Sigma types (dependent pairs)
! Inductive types (natural numbers, lists, etc.)
```

**2. Proof Checker (Rust)**
```rust
// src/kernel/checker.rs
// Minimal trusted core (~500 lines)
// Type checking algorithm
// Definitional equality
// Proof term verification
```

**3. WORM Proof Database (Rust)**
```rust
// src/kernel/worm.rs
// Immutable theorem storage
// SHA-256 sealing per proof
// Merkle tree of all theorems
// Tamper-evident proof chain
```

**4. Basic Syntax (Custom)**
```axiom
-- src/stdlib/nat.axiom
inductive Nat : Type where
  | zero : Nat
  | succ : Nat → Nat

theorem add_comm : ∀ (n m : Nat), n + m = m + n := ...
```

### Phase 2: Tactic Engine

**5. Proof Search (Multi-Agent)**
```rust
// src/tactics/search.rs
// TENSOR: Parallel proof space exploration
// LEDGE: Kernel verification of steps
// AXIOM: Sealing of completed proofs
// ATLAS: Strategy coordination
```

**6. Tactic Language**
```axiom
-- Custom DSL, not Lean's tactics
tactic intro : Goal → Goal
tactic apply : Term → Goal → Goal
tactic rewrite : Equality → Goal → Goal
tactic auto : Goal → Proof  -- AI-powered
```

### Phase 3: Mathematical Library

**7. Standard Library (APL + Axiom)**
```apl
⍝ src/stdlib/array.apl
⍝ Array-oriented mathematical operations
⍝ Compiles to Fortran for speed
⍝ Natural notation for mathematicians
```

**8. Core Mathematics**
```axiom
-- src/stdlib/logic.axiom (propositional logic)
-- src/stdlib/nat.axiom (natural numbers)
-- src/stdlib/list.axiom (lists)
-- src/stdlib/set.axiom (set theory)
-- src/stdlib/group.axiom (abstract algebra)
```

### Phase 4: Collatz Formalization

**9. Collatz in AXIOM**
```axiom
-- examples/collatz.axiom
def collatz_step (n : Nat) : Nat :=
  if even n then n / 2 else 3 * n + 1

theorem collatz_conjecture : 
  ∀ (n : Nat), n > 0 → eventually_reaches_one (collatz_step n) := 
  -- Autonomous proof search begins here
  auto
```

---

## THE PROMPT FOR QWEN

```
Build AXIOM: a sovereign proof assistant from scratch.

MISSION: Create a proof assistant that's faster than Lean 4, more verifiable than Coq, and coordinates autonomously through multi-agent proof search.

CORE REQUIREMENTS:

1. TYPE THEORY KERNEL (Fortran)
   - Dependent type system
   - Universe hierarchy (Type 0, Type 1, ...)
   - Pi types (dependent functions)
   - Sigma types (dependent pairs)
   - Inductive types (Nat, List, etc.)
   - File: src/kernel/types.f90

2. PROOF CHECKER (Rust)
   - Minimal trusted core (~500 lines)
   - Type checking algorithm
   - Definitional equality checker
   - Proof term verification
   - File: src/kernel/checker.rs

3. WORM PROOF DATABASE (Rust)
   - Immutable theorem storage
   - SHA-256 seal per proof
   - Merkle tree of all theorems
   - Tamper-evident proof chain
   - File: src/kernel/worm.rs

4. BASIC SYNTAX
   - Custom syntax (not Lean, not Coq)
   - Inductive type definitions
   - Theorem statements
   - Proof terms
   - File: src/syntax/parser.rs

5. STANDARD LIBRARY
   - Logic (propositional, predicate)
   - Natural numbers (Peano axioms)
   - Lists (cons, nil, append)
   - Basic arithmetic (add, mul, sub)
   - Files: src/stdlib/*.axiom

6. COLLATZ EXAMPLE
   - Formalize Collatz function
   - State conjecture as theorem
   - Provide proof skeleton
   - File: examples/collatz.axiom

DELIVERABLES:
- Rust crate: axiom-proof
- Fortran kernel: types.f90
- Standard library: stdlib/*.axiom
- Example: collatz.axiom
- Tests: All type checking tests passing
- Documentation: AXIOM.md explaining the system

CONSTRAINTS:
- No external proof assistant dependencies
- Pure Fortran + Rust implementation
- WORM sealing for all theorems
- Multi-agent coordination hooks
- Complete in under 15,000 tokens

VERIFICATION CRITERIA:
- Fortran kernel compiles
- Rust checker passes tests
- Can define natural numbers
- Can state and check simple theorems
- Collatz formalization type-checks
- WORM database seals proofs

BEGIN. Show me the build console as you work.
```

---

## WHAT MAKES THIS BETTER THAN LEAN 4

### Speed
- **Lean 4:** C++ backend, slow compilation
- **AXIOM:** Fortran kernel, machine-speed type checking

### Verification
- **Lean 4:** Trust the kernel
- **AXIOM:** Every proof cryptographically sealed (WORM + Merkle)

### Autonomy
- **Lean 4:** Human writes tactics
- **AXIOM:** Multi-agent proof search (TENSOR, LEDGE, AXIOM, ATLAS)

### Simplicity
- **Lean 4:** Decades of legacy code
- **AXIOM:** Built from scratch, minimal trusted core

### Sovereignty
- **Lean 4:** Depends on external ecosystem
- **AXIOM:** Pure Fortran + Rust, no dependencies

---

## THE VIRAL STORY

**Before:** "I used Lean 4 to formalize Collatz"
- Boring
- Everyone does this
- Not novel

**After:** "I built a proof assistant from scratch that's faster than Lean 4, then used it to attack Collatz"
- Insane
- No one does this
- Completely novel

**The Hook:** "I asked my AI agents to build a proof assistant from scratch. They called it AXIOM. It's faster than Lean 4 because the kernel is pure Fortran. Every proof is cryptographically sealed. Multi-agent coordination searches the proof space autonomously. Then we used it to formalize the Collatz Conjecture."

---

## REPOSITORY STRUCTURE

```
axiom-proof/
├── src/
│   ├── kernel/
│   │   ├── types.f90          # Fortran type theory
│   │   ├── checker.rs         # Rust proof checker
│   │   └── worm.rs            # WORM proof database
│   ├── syntax/
│   │   ├── parser.rs          # Syntax parser
│   │   └── lexer.rs           # Tokenizer
│   ├── tactics/
│   │   ├── search.rs          # Multi-agent proof search
│   │   └── auto.rs            # AI-powered tactics
│   └── stdlib/
│       ├── logic.axiom        # Propositional logic
│       ├── nat.axiom          # Natural numbers
│       ├── list.axiom         # Lists
│       └── set.axiom          # Set theory
├── examples/
│   ├── collatz.axiom          # Collatz formalization
│   ├── fermat.axiom           # Fermat's little theorem
│   └── pythagorean.axiom      # Pythagorean theorem
├── tests/
│   ├── kernel_tests.rs        # Type checker tests
│   └── stdlib_tests.axiom     # Standard library tests
├── docs/
│   ├── AXIOM.md               # System overview
│   ├── TUTORIAL.md            # Getting started
│   └── THEORY.md              # Type theory foundations
├── Cargo.toml
├── Makefile                   # Fortran compilation
└── README.md
```

---

## SUCCESS METRICS

**Minimum Viable Proof Assistant:**
- ✅ Can define natural numbers
- ✅ Can state theorems
- ✅ Can check proof terms
- ✅ Can seal proofs to WORM ledger
- ✅ Collatz formalization type-checks

**Viral Moment:**
- ✅ "Built a proof assistant from scratch"
- ✅ "Faster than Lean 4" (benchmark proof)
- ✅ "Cryptographically verifiable" (WORM + Merkle)
- ✅ "Autonomous proof search" (multi-agent)
- ✅ "Used it to attack Collatz"

---

## COPY THIS PROMPT AND GIVE IT TO QWEN

The prompt above is ready to paste into your terminal agent. Qwen will:
1. Build the Fortran type theory kernel
2. Build the Rust proof checker
3. Create the WORM proof database
4. Implement basic syntax
5. Write standard library
6. Formalize Collatz
7. Deploy to GitHub

**This is the nuclear option. Not using Lean 4. Building your own. Better.**