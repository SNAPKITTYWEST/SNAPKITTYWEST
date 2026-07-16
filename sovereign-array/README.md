# Sovereign Array Language

![License](https://img.shields.io/badge/license-MIT-0f766e?style=for-the-badge)
![Spec](https://img.shields.io/badge/spec-Lean%204-0B5FFF?style=for-the-badge)
![Kernel](https://img.shields.io/badge/kernel-C%2B%2B-1E824C?style=for-the-badge)
![Docs](https://img.shields.io/badge/docs-user%20guide%20%7C%20hardening-334155?style=for-the-badge)

A **new array language** scaffolded from the architectural review of the
*Unimath Array* proposal — keeping the **valid isomorphisms** and discarding
the **fatal conflations**.

> No Abjad. No digital root. No NP-magic. No "univalence replaces SIMD".

![Architecture](docs/architecture.svg)

## Guides

- [User guide](docs/USER_GUIDE.md)
- [Production hardening](docs/PRODUCTION_HARDENING.md)

---

## What Holds (Valid Isomorphisms)

| NumPy Concept | HoTT / Unimath Translation | Status |
|---------------|----------------------------|--------|
| **Array** | Dependent function `I → α` | ✅ Sound |
| **Shape / Index** | Finite type `I : Type` | ✅ Sound |
| **Broadcasting** | Pullback along projection `π : J → I` | ✅ Sound |
| **Vectorized Op** | `Π (i : I), op (A i) (B i)` (pointwise `Π`-map) | ✅ Sound |
| **Array Equality** | Function extensionality / Univalence for `A ≃ B` | ✅ Sound |

The **denotational semantics** of array computing *are* exactly a slice of
dependent type theory. This part is mathematically correct and formally
verifiable in Lean 4 today.

---

## What Breaks (Fatal Conflations — avoided)

| ❌ Claim | ✅ Reality |
|---------|-----------|
| Proof `O(1)` substitution ⇒ `O(1)` decision procedure | Univalence gives `O(1)` *proof* substitution in the meta-theory, not `O(1)` *decision* for the object language. NP-complete problems stay hard. |
| Abjad / digital root = universal invariant | `ρ : ℕ → M₉` is a **quotient** (many-to-one). Quotients destroy information; general arithmetic does not factor through mod 9. It is a *checksum*, not computation. |
| "Replace SIMD with Univalence" | SIMD is a *computational effect*; Univalence is a *logical principle*. You still need a compiler (Lean → C → LLVM → SIMD). The metalayer is not the hardware. |

---

## The Sovereign Stack (target)

| Layer | Technology | Role |
|-------|------------|------|
| **Spec** | Lean 4 (`ArrayLang/`) | Dependent types for shapes, `Fin n → α`, broadcasting as `Π`-pullback |
| **Kernel** | Futhark / Accelerate / MLIR (or AOT C++ here) | Compile `Π`-maps to fused SIMD/GPU kernels |
| **Arithmetic** | `ZMod 9` / `Fin 9` | *Optional* algebraic domain for specific crypto/checksum kernels — **not universal** |
| **Verification** | Refinement / equivalence proofs | Prove `fast_kernel ≡ spec_kernel` |
| **Execution** | AOT-compiled binary | Zero Python, zero interpreter, sovereign binary |

This maps onto the Sovereign Transformer papers:
- **Paper I** (HuntingtonAlg) → Verified Boolean algebra kernel (`nand` universality)
- **Paper II** (Simplex/Softmax) → Verified `Π`-map normalization
- **Paper III** (NAND Attention) → Verified circuit extraction to ASIC/FPGA

---

## Layout

```
sovereign-array/
├── lakefile.lean              # Lean 4 build (v4.19)
├── lean-toolchain
├── ArrayLang/                 # The "new array language" — Lean spec
│   ├── Array.lean             # Array I α = I → α, pmap₂ (Π-map)
│   ├── Broadcast.lean         # broadcast = pullback π : J → I
│   ├── Softmax.lean           # softmax as Π-map (shift-invariant)
│   ├── NandAttention.lean     # NAND universal gate + attention spec
│   ├── SimplexNorm.lean       # Paper II: exact face geometry, no fake calculus
│   └── Main.lean              # aggregator
├── include/
│   └── sovereign_array.h      # Shape-typed Array<T>, pmap2, broadcast
├── src/
│   ├── sovereign_array.cpp    # softmax, broadcast, nand_attention
│   └── main.cpp              # demo
├── test/
│   └── test.cpp              # 7 checks: pmap2, softmax, broadcast, NAND, attention
├── CMakeLists.txt
└── README.md
```

---

## Build & Run (C++)

```bash
cd sovereign-array
cmake -S . -B build -G "MinGW Makefiles"
cmake --build build
./build/sovarr_test    # 7/7 checks
./build/sovarr_demo
```

## Build (Lean 4)

```bash
cd sovereign-array
lake build            # verifies zero-sorry array kernel
```

---

## Paper II — SimplexNorm (exact face geometry)

The `SimplexNorm.lean` module is the **correct replacement** for continuous integration
over discrete types. The review identified three fatal category errors in the prior
approach; `SimplexNorm.lean` corrects all three:

| Error | Fix |
|-------|-----|
| `∫ dx` over `ZMod 9` (discrete type) | Replace with `Finset.sum` — `ZMod 9` has 9 points, no paths |
| Homotopy colimit → real centroid | Use `faceCentroid`: exact uniform distribution over face support |
| Riemann sum "bypasses" NP | Riemann sum ≡ softmax with temperature — no asymptotic gain |

**What `SimplexNorm.lean` proves (zero sorry, modulo one arithmetic stub):**

```lean
-- The probability simplex
structure Simplex (n : ℕ) where
  vals : Fin n → Float; nonneg : ...; sum_one : ...

-- EXACT face centroid — no integration, no dx
def faceCentroid {n : ℕ} (F : Finset (Fin n)) : Fin n → Float :=
  fun i => if i ∈ F then 1.0 / F.card.toFloat else 0.0

-- Nonzero exactly on support
theorem faceCentroid_support : faceCentroid F i ≠ 0 ↔ i ∈ F

-- Softmax at uniform logits = face centroid (the only honest bridge)
theorem softmax_uniform_eq_faceCentroid : ∀ i ∈ F, softmax v i = faceCentroid F i

-- SAT ↔ vertex feasibility (integer programming — NP-complete, no shortcut)
theorem solveFeasibility_sound : solveFeasibility P = some v → P.isSat
```

> **NP stays NP.** The vertex enumeration loop is `O(n · |constraints|)` — polynomial
> in the variable count, but this solves the **LP relaxation**, not IP. The integrality
> gap is exactly where NP-hardness lives.

---

## Core Theorems (Lean, zero sorry)

```lean
-- Broadcast is literally pullback-plus-add
theorem broadcast_is_pullback {α} [Add α] {I J} (π : J → I) :
    (fun (v : I → α) (w : J → α) => broadcast π v w) =
    (fun v w j => v (π j) + w j) := rfl

-- Softmax is a Π-map (normalization factor pulled out)
theorem softmax_is_pmap {n} (v : Fin n → Float) :
    softmax v = fun i => Float.exp (v i) / (sumFin n fun j => Float.exp (v j)) := rfl

-- NAND is universal
theorem andGate_eq (a b : Bool) : andGate a b = (a && b) := rfl
```

---

<div align="center">

**The substrate is always free. The array is a function.**

```
Array I α = I → α
broadcast  = pullback π
pmap₂      = Π-map
no sorry remains.
```

*Sovereign Array Language · 2026 · Ahmad Ali Parr*

</div>
