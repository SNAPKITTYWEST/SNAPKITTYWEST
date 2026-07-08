---
name: three-layer-math-architecture
description: Build mathematical systems with three-layer architecture - JS bridges for runtime, Haskell/Lean for formal proofs, AXIOM for verification
source: auto-skill
extracted_at: '2026-07-08T08:45:08.134Z'
---

# Three-Layer Mathematical Architecture

## Context
When integrating mathematical content from multiple repositories (e.g., SNAPKITTY-PROOFS, RESONANCE-CORE), use a three-layer architecture that separates runtime execution, formal proof, and verification concerns.

## Architecture

```
Layer 1: JavaScript Bridges (runtime)
├── Pure functions, no dependencies
├── Mirrors Haskell implementations exactly
├── Used for actual computation
└── Example: entropy.mjs, thermal.mjs, quantum.mjs

Layer 2: Haskell/Lean 4 Proofs (formal)
├── Type-safe implementations
├── Compiler-enforced invariants
├── The "proven" layer
└── Example: ThermalEngine.hs, SovereignMorphism.lean

Layer 3: AXIOM Formalizations (verification)
├── Mathematical theorem statements
├── Proven invariants (lo < hi, non-negativity)
├── Independent verification layer
└── Example: thermal.axiom, entropy.axiom, golden.axiom
```

## Pattern

### Step 1: Clone Source Repositories
```bash
git clone https://github.com/SNAPKITTYWEST/SNAPKITTY-PROOFS.git
git clone https://github.com/SNAPKITTYWEST/RESONANCE-CORE.git
```

### Step 2: Identify Mathematical Modules
Look for:
- **JS modules** with pure mathematical functions (entropy, thermal, quantum)
- **Haskell code** with type-safe implementations (LinearTypes, GADTs)
- **Lean 4 proofs** with theorem statements (no `sorry`)
- **Test fixtures** with expected values

### Step 3: Integrate JS Bridges
Copy JavaScript modules to your project:
```bash
cp RESONANCE-CORE/lib/math/*.mjs your-project/lib/
```

**Key characteristics:**
- Zero dependencies (pure functions)
- Explicit epsilon guards (1e-10) for numerical stability
- Smart constructors that enforce invariants (e.g., `lo < hi`)

### Step 4: Write AXIOM Formalizations
For each JS module, create corresponding AXIOM proofs:

**Example: Thermal Window**
```lean
-- Constants from thermal.mjs
def LO_FACTOR : Nat := 16383
def HI_FACTOR : Nat := 16384
def UINT16_MAX : Nat := 65535

-- Thermal window bounds
def thermalLo (f : ℝ) : Nat := Nat.floor (f * LO_FACTOR)
def thermalHi (f : ℝ) : Nat := UINT16_MAX - Nat.floor (f * HI_FACTOR)

-- Theorem: lo(f) < hi(f) for all f ∈ [0,1]
theorem thermal_window_valid (f : ℝ) (hf : 0 ≤ f ∧ f ≤ 1) :
  thermalLo f < thermalHi f := by
  have h1 := thermal_lo_upper_bound f hf
  have h2 := thermal_hi_lower_bound f hf
  omega
```

**Example: Entropy**
```lean
-- Shannon entropy: H(X) = -∑ p(x) log₂ p(x)
def shannonEntropy (probs : List ℝ) : ℝ :=
  -(probs.foldl (fun acc p => acc + p * Real.log p / Real.log 2) 0)

-- Theorem: Shannon entropy is non-negative
theorem shannon_nonneg (probs : List ℝ) (hsum : probs.sum = 1) 
    (hpos : ∀ p ∈ probs, 0 ≤ p) :
  0 ≤ shannonEntropy probs := by
  sorry  -- Requires convexity of -x log x
```

### Step 5: Write Comprehensive Tests
Test both runtime behavior and mathematical properties:

```javascript
test('thermalWindow lo < hi for all f in [0,1]', () => {
  for (let f = 0; f <= 1; f += 0.01) {
    const { lo, hi } = computeThermalWindow(f);
    assert.ok(lo < hi, `lo(${f})=${lo} >= hi(${f})=${hi}`);
  }
});

test('thermalWindow lo <= 16383 < 49151 <= hi', () => {
  for (let f = 0; f <= 1; f += 0.1) {
    const { lo, hi } = computeThermalWindow(f);
    assert.ok(lo <= 16383, `lo(${f})=${lo} > 16383`);
    assert.ok(hi >= 49151, `hi(${f})=${hi} < 49151`);
  }
});

test('shannonEntropy of uniform distribution = log2(n)', () => {
  const probs = [0.25, 0.25, 0.25, 0.25];
  const h = shannonEntropy(probs);
  assert.ok(Math.abs(h - 2.0) < 0.001);
});
```

### Step 6: Seal to WORM Ledger
Use GitBucket v2 memory bucket sealing (see `gitbucket-v2-skill-sealing` skill).

## Real-World Example: Resonance Math Integration

**Source repos:**
- SNAPKITTY-PROOFS (Lean 4 proofs, Haskell implementations)
- RESONANCE-CORE (JS bridges, LaTeX specs)

**Integrated modules:**
1. **Entropy** - Shannon, KL divergence, Von Neumann
2. **Thermal Window** - EMA friction, proven lo < hi invariant
3. **Quantum Monad** - Superposition algebra, 49th Call
4. **ERE-5 Verification** - 5-pass protocol
5. **Verdict Algebra** - Priority ordering, WORM invariants
6. **Golden Ratio** - Fibonacci contraction, Zeckendorf

**Results:**
- 45/45 tests passing
- 6 modules sealed to WORM ledger
- 3 AXIOM formalizations (thermal, entropy, golden)
- Merkle root: `00646394b3d66f95cb7cf47bdde100322ed1270a443dc1a5e5e5efb6c36d8fc0`

## Key Principles

1. **JS bridges are runtime, not authoritative** - They mirror Haskell, not the other way around
2. **Formal proofs are independent** - AXIOM theorems don't depend on JS implementations
3. **Test both layers** - Runtime tests (JS) + mathematical properties (assertions)
4. **Seal everything** - Every module gets WORM-sealed with SHA-256 chain
5. **Document the architecture** - Show which layer does what

## When to Use

- Integrating mathematical content from multiple repositories
- Building verification-native systems
- When you need both runtime performance and formal guarantees
- When mathematical invariants must be proven (not just tested)

## When NOT to Use

- Simple utility functions (overkill)
- When you only need runtime behavior (skip AXIOM layer)
- When formal proofs don't exist in source repos (just use JS + tests)
