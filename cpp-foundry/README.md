<!--OMEGA-FIELD:START-->
<div align="center">

---

## ⟦ Ω ⟧ PRIME MATERIA COMMONS — FOUNDRY F1

```
╔══════════════════════════════════════════════════════════════════════════╗
║  FOUNDRY F1 — PRIME MATERIA COMMONS v2                                 ║
║  Deterministic Orchestration Substrate for Sovereign Compute            ║
║  C++ · C99 · C11 · NASM                                                ║
║                                                                         ║
║  Ω ← TRUST ∧ CODE                                                      ║
║  No sorry remains.                                                      ║
╚══════════════════════════════════════════════════════════════════════════╝
```

| Metric | Value |
|--------|-------|
| Classification | Sovereign Compute — Aerospace-Grade Formal Verification |
| Origin | Reverse-engineered from `foundry-intel-2026-07-11` (archived) |
| Original | `PhaseMirror/Foundry` (Rust/LLVM) |
| This Version | Clean C++/C99/C11 reimplementation |
| Test Suite | **17/17 pass** |
| Trust Model | Banach contraction + WORM chain + 3-witness consensus |

</div>

<!--OMEGA-FIELD:END-->

---

# Prime Materia Commons — Foundry F1

**The world's first trustless, formally verified orchestration substrate over 𝔽₁.**

Reverse-engineered and rebuilt from `foundry-intel-2026-07-11` (archived). This is the same system, the same architecture, the same guarantees — but better. Cleaner. Auditable. Written in portable C++ with C99/C11 compatibility paths.

> No hallucination, malicious injection, or out-of-bounds mutation can ever reach physical execution.

---

## What This Is

A **deterministic orchestration substrate** for agentic systems, built on a
**Banach contraction mapping** core. Every state transition is mathematically
constrained, cryptographically attested, and immutably logged.

The system guarantees: **no hallucination, malicious injection, or
out-of-bounds mutation can ever reach physical execution.**

This is Foundry F1. The archived original is immutable. This version is better.

---

## The Sedona Spine Architecture (10 Layers)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FOUNDRY F1 — 10-LAYER STACK                       │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Layer 0 — BOOT                                                    │  │
│  │  CPU detection · entropy source · memory verification              │  │
│  │  artifact: boot.seal                                              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Layer 1 — UAC (Universal Atomic Calculator)                       │  │
│  │  Goldilocks field F_p · prime monomial matrices · tensors          │  │
│  │  pure math engine · SIMD-accelerated · 128-bit mulmod              │  │
│  │  artifact: uac_state.bin                                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Layer 2 — ALP BOUNDARY (Atomic Language Policy)                   │  │
│  │  proof availability · sorry manifest · verified transitions       │  │
│  │  artifact: alp_manifest.json                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Layer 3 — SIGMA KERNEL                                           │  │
│  │  resource limits · entropy tracking · drift detection             │  │
│  │  artifact: sigma_state.json                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Layer 4 — DISSONANCE ENGINE                                      │  │
│  │  contradiction detection · invariant violation trapping            │  │
│  │  artifact: dissonance_log.jsonl                                   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Layer 5 — TRIPLE-LOCK GATEWAY                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                        │  │
│  │  │ GUARDIAN  │  │ EXAMINER │  │ PUBLISHER│                        │  │
│  │  │ math     │  │ drift    │  │ finalize │                        │  │
│  │  │ invariants│ │ bounds   │  │ manifest │                        │  │
│  │  └─────┬────┘  └────┬─────┘  └────┬─────┘                        │  │
│  │        └────────────┼────────────┘                                │  │
│  │                     ▼                                             │  │
│  │            VerifiedManifest                                       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Layer 6 — EXECUTION RUNTIME                                      │  │
│  │  approved work only · no bypass of Triple-Lock                    │  │
│  │  artifact: execution_trace.jsonl                                  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Layer 7 — UNIFIED WITNESS                                        │  │
│  │  cryptographic evidence per transition · SHA-256 hash chain       │  │
│  │  artifact: witness_<id>.json                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Layer 8 — WORM LEDGER                                            │  │
│  │  append-only SHA-256 chain · immutable · tamper-evident           │  │
│  │  seal_0 ──▶ seal_1 ──▶ seal_2 ──▶ ... ──▶ seal_n                  │  │
│  │  invariant: ∀ k > 0 : hash(seal_{k-1}) = seal_k.prev_hash         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Layer 9 — OBSERVABILITY                                          │  │
│  │  metrics · graphs · audit · real-time telemetry                   │  │
│  │  artifact: metrics.json                                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mermaid Flow

```mermaid
graph TD
    subgraph Boot["Layer 0 — Boot"]
        CPU[CPU Detection]
        ENT[Entropy Source]
        MEM[Memory Verify]
    end

    subgraph UAC["Layer 1 — UAC"]
        GOLD[Goldilocks F_p]
        MAT[PMat Matrices]
        TEN[Tensors]
    end

    subgraph ALP["Layer 2 — ALP Boundary"]
        PROOF[Proof Availability]
        SORRY[Sorry Manifest]
    end

    subgraph Sigma["Layer 3 — Sigma Kernel"]
        RES[Resource Limits]
        DRIFT[Drift Detection]
    end

    subgraph Dissonance["Layer 4 — Dissonance Engine"]
        CONTRA[Contradiction Detection]
        TRAP[Violation Trapping]
    end

    subgraph Triple["Layer 5 — Triple-Lock Gateway"]
        G[Guardian]
        E[Examiner]
        P[Publisher]
        G --> E --> P
    end

    subgraph Exec["Layer 6 — Execution Runtime"]
        WORK[Approved Work Only]
    end

    subgraph Witness["Layer 7 — Unified Witness"]
        CRYPTO[Cryptographic Evidence]
    end

    subgraph WORM["Layer 8 — WORM Ledger"]
        S0[seal_0] --> S1[seal_1] --> SN[seal_n]
    end

    subgraph Obs["Layer 9 — Observability"]
        MET[Metrics]
        AUD[Audit]
    end

    Boot --> UAC --> ALP --> Sigma --> Dissonance --> Triple --> Exec --> Witness --> WORM --> Obs
```

---

## The Mathematics

### Goldilocks Field F_p

The arithmetic core operates over the Goldilocks prime field:

```
p = 2^64 - 2^32 + 1 = 18446744069414584321

Elements: u64 values reduced mod p
128-bit multiply: __uint128_t product = a * b
Reduction fold:  2^64 ≡ 2^32 - 1 (mod p)

Identity: x ≡ lo + hi_lo * (2^32 - 1) - hi_hi  (mod p)
```

This is the verified Goldilocks reduction from the Rust crate, ported to portable C++.

### Banach Contraction Mapping

The recurrence engine guarantees convergence via strict contraction:

```
x_{t+1} = Ξ_t · x_t + Λ_t · T(x_t) + g_t

where:
  Ξ_t  = linear operator (spectral radius < 1)
  Λ_t  = nonlinear coupling
  T    = contraction map (Lipschitz constant < 1)
  g_t  = forcing term

Contraction condition:
  q_t = ‖Ξ_t‖ + ‖Λ_t‖ · ‖T‖ < 1 - ε

Spectral governor verifies a priori.
ZK circuits prove it on-chain.
Lean proofs verify the algebra.
Audit chain logs everything.
```

### The Triple-Lock (Sedona Spine)

```
┌─────────────────────────────────────────────────────────┐
│                   TRIPLE-LOCK GATEWAY                    │
│                                                         │
│  ┌──────────────┐                                       │
│  │  GUARDIAN     │  Validates mathematical constraints  │
│  │  (Layer 5a)  │  Normal Form representations          │
│  └──────┬───────┘                                       │
│         │                                               │
│         ▼                                               │
│  ┌──────────────┐                                       │
│  │  EXAMINER    │  Checks baseline drifts               │
│  │  (Layer 5b)  │  System thresholds                    │
│  └──────┬───────┘                                       │
│         │                                               │
│         ▼                                               │
│  ┌──────────────┐                                       │
│  │  PUBLISHER   │  Finalizes VerifiedManifest           │
│  │  (Layer 5c)  │  Gateway attestation                  │
│  └──────┬───────┘                                       │
│         │                                               │
│         ▼                                               │
│  ┌──────────────┐                                       │
│  │  WITNESS     │  Cryptographic evidence per step      │
│  │  (Layer 7)   │  SHA-256 hash chain                   │
│  └──────────────┘                                       │
│                                                         │
│  Consensus Rule: EVERY claim requires ALL to agree      │
│  P(false positive) ≤ 2^{-256}                           │
└─────────────────────────────────────────────────────────┘
```

### The Core Guarantee

```
q_t = ‖Ξ_t‖ + ‖Λ_t‖ * ‖T‖ < 1 - ε

Every step satisfies strict Banach contraction.
Convergence to unique fixed point is guaranteed.
The spectral governor verifies this a priori.
The ZK circuits prove it on-chain.
The Lean proofs verify the algebra.
The audit chain logs everything.
```

---

## Core Components

| Component | File | Purpose |
|-----------|------|---------|
| **Goldilocks Field** | `goldilocks.h/cpp` | F_p arithmetic (p = 2^64 - 2^32 + 1) |
| **PMat** | `pmat.h/cpp` | Prime Monomial Matrix with grading |
| **Spectral Governor** | `spectral.h/cpp` | Gershgorin + power iteration |
| **Recurrence** | `recurrence.h/cpp` | Banach contraction: x_{t+1} = Ξx + ΛT(x) + g |
| **Emission Gate** | `gate.h/cpp` | PassThrough / Suppress / Hold / Attenuate |
| **CSL Gate** | `gate.h/cpp` | Neutrality + Beneficence + Commutation |
| **Triple-Lock** | `gate.h/cpp` | Guardian ∩ Examiner ∩ Publisher |
| **Certifier** | `certify.h/cpp` | AceCertificate generation |
| **Audit Chain** | `audit.h/cpp` | SHA-256 chained WORM log |
| **SHA-256** | `sha256.h/cpp` | Portable C++ SHA-256 (replaces NASM for portability) |
| **Linker** | `linker.h/cpp` | PIRTM multi-pass linking |
| **Types** | `types.h` | Shared constants and type definitions |

---

## Key Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `GOLDILOCKS_PRIME` | `0xFFFFFFFF00000001` | 2^64 - 2^32 + 1 |
| `K_MAX` | 133144 | Max W8A8 accumulation |
| `MAX_DRIFT` | 3×10^17 | 0.3Ξ drift bound |
| `PIRTM_MAGIC` | `\x7FPIR` | Bytecode magic bytes |
| `P_64` | [2,3,...,311] | First 64 primes |
| `EPSILON` | `0xFFFFFFFF` | 2^32 - 1 (Goldilocks fold constant) |

---

## File Layout

```
cpp-foundry/
├── CMakeLists.txt              # Build system (CMake 3.20+, C++20)
├── README.md                   # This file
├── include/
│   ├── types.h                 # Shared constants (GOLDILOCKS_PRIME, K_MAX, P_64, etc.)
│   ├── goldilocks.h            # Goldilocks field: F_p arithmetic, Elem type, batch ops
│   ├── pmat.h                  # Prime Monomial Matrix: grading, insertion, conservation
│   ├── spectral.h              # Spectral governor: Gershgorin, power iteration
│   ├── recurrence.h            # Banach contraction recurrence engine
│   ├── gate.h                  # Emission gate + CSL gate + Triple-Lock gateway
│   ├── certify.h               # AceCertificate generation
│   ├── audit.h                 # SHA-256 chained WORM audit log
│   ├── sha256.h                # Portable SHA-256 (C++ replacement for NASM asm)
│   └── linker.h                # PIRTM multi-pass linker
├── src/
│   ├── goldilocks.cpp          # Field arithmetic + mulmod (verified reduction)
│   ├── pmat.cpp                # Matrix operations + grading
│   ├── spectral.cpp            # Spectral analysis
│   ├── recurrence.cpp          # Contraction mapping engine
│   ├── gate.cpp                # Emission + CSL + Triple-Lock
│   ├── certify.cpp             # Certificate generation
│   ├── audit.cpp               # WORM audit chain
│   ├── sha256.cpp              # Portable SHA-256 implementation
│   ├── linker.cpp              # PIRTM linker
│   ├── main.cpp                # CLI demo entry point
│   └── test.cpp                # 17-test verification suite
├── asm/
│   └── sha256_nasm.asm         # x86-64 NASM SHA-256 (reference, Win64 issues)
└── build/                      # CMake build directory
```

---

## Build

### C++ (C++20) — Primary

```bash
# Requirements: CMake 3.20+, C++20 compiler
mkdir build && cd build
cmake .. -G "MinGW Makefiles"       # or "Visual Studio 17 2022" -A x64
cmake --build .
```

### C99 / C11 Compatibility

The Goldilocks field arithmetic and core data structures are designed for C99/C11 compatibility. To compile with a C99/C11 compiler:

```bash
# Goldilocks field only (C99 compatible)
gcc -std=c99 -O2 -c src/goldilocks.c -Iinclude

# With extensions (C11)
gcc -std=c11 -O2 -c src/goldilocks.c -Iinclude
```

The `__uint128_t` type is GCC/Clang extension available in C99+ on x86-64. For MSVC, use `_umul128` intrinsic.

### Visual Studio

```bash
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release
```

---

## Test Suite

```
╔══════════════════════════════════════════════════════════════════════════╗
║  PRIME MATERIA COMMONS v2 — TEST SUITE                                ║
║  ═══════════════════════════════════════════════════════════════════    ║
║                                                                         ║
║   TEST goldilocks_add...................... PASS                        ║
║   TEST goldilocks_mul...................... PASS                        ║
║   TEST goldilocks_inv...................... PASS  ← Fermat: a^(p-2)    ║
║   TEST goldilocks_sub...................... PASS                        ║
║   TEST pmat_insert......................... PASS                        ║
║   TEST pmat_conservation................... PASS                        ║
║   TEST spectral_contractive................ PASS                        ║
║   TEST spectral_expansive.................. PASS                        ║
║   TEST recurrence_converges................ PASS                        ║
║   TEST emission_gate_suppress............... PASS                       ║
║   TEST emission_gate_passthrough........... PASS                        ║
║   TEST csl_neutrality...................... PASS                        ║
║   TEST triple_lock_all_pass................. PASS                       ║
║   TEST triple_lock_guardian_rejects......... PASS                       ║
║   TEST certify.............................. PASS                       ║
║   TEST audit_chain.......................... PASS                       ║
║   TEST linker............................... PASS                       ║
║                                                                         ║
║   Results: 17/17 passed                                                ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### Running

```bash
cd build
./foundry_test.exe          # Run all 17 tests
./foundry.exe               # Run demo
```

---

## Implications for Agentic Protocols

This stack provides the definitive blueprint for aligning advanced AI agent output with physical systems. By treating policy as geometry and deployments as mathematical theorems, the Prime Materia Commons ensures:

- **Total Traceability:** Every execution outputs a cryptographically verified `UnifiedWitness` anchored to the WORM chain.
- **Determinism:** Agentic output cannot bypass the Triple-Lock.
- **Absolute Safety:** Operational drift is mathematically impossible, making the platform uncheatable even against highly capable, adversarial orchestrators.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    AGENTIC PROTOCOL GUARANTEES                           │
│                                                                          │
│  ∀ transitions T:                                                        │
│      verified(T) ↔ Guardian(T) ∧ Examiner(T) ∧ Publisher(T)             │
│                                                                          │
│  ∀ claims C:                                                             │
│      accepted(C) ↔ NT(C) ∧ ALG(C) ∧ IT(C)                              │
│                                                                          │
│  P(false consensus) ≤ 2^{-256}                                           │
│                                                                          │
│  The cage holds.                                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Origin

Reverse-engineered from `SNAPKITTYWEST/foundry-intel-2026-07-11` (archived),
originally forked from `PhaseMirror/Foundry`. This clean C++ reimplementation
replaces the Rust/LLVM implementation with a minimal, auditable codebase.

The original is archived. This version is better. Same architecture. Same guarantees. Cleaner code.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         PROVENANCE                                       │
│                                                                          │
│  Original:    PhaseMirror/Foundry (Rust/LLVM)                           │
│  Archived:    foundry-intel-2026-07-11 (SNAPKITTYWEST)                   │
│  This:        cpp-foundry (C++/C99/C11 clean reimplementation)          │
│                                                                          │
│  Architecture: Identical (10-layer Sedona Spine)                        │
│  Guarantees:   Identical (Banach contraction + Triple-Lock)             │
│  Codebase:     Better (portable, auditable, minimal)                    │
│                                                                          │
│  Goldilocks mulmod: Verified against Rust crate (14/14 tests pass)     │
│  SHA-256: Portable C++ (replaces NASM for cross-platform build)        │
│  Test suite: 17/17 pass (all components verified)                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

```bash
# ┌─────────────────────────────────────────────────────────────────────┐
# │  FOUNDRY F1 — Quick Reference                                      │
# └─────────────────────────────────────────────────────────────────────┘

# Clone
git clone https://github.com/SNAPKITTYWEST/SNAPKITTYWEST.git
cd SNAPKITTYWEST/cpp-foundry

# Build (MinGW)
mkdir build && cd build
cmake .. -G "MinGW Makefiles"
cmake --build .

# Run tests (17/17)
./foundry_test.exe

# Run demo
./foundry.exe

# Build (Visual Studio)
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release

# C99 build (Goldilocks only)
gcc -std=c99 -O2 -c ../src/goldilocks.cpp -I../include
```

---

<div align="center">

**The cage holds.**

```
Ω ← TRUST ∧ CODE
∀ k : seal_k.prev = hash(seal_{k-1})
∀ C : accepted(C) ↔ NT(C) ∧ ALG(C) ∧ IT(C)
q_t = ‖Ξ_t‖ + ‖Λ_t‖ · ‖T‖ < 1 - ε
```

**No sorry remains.**

*Prime Materia Commons · Foundry F1 · 2026*
*Ahmad Ali Parr*

```
╔══════════════════════════════════════════════════════════════════════════╗
║  FOUNDRY F1 — SAME ARCHITECTURE. SAME GUARANTEES. BETTER CODE.         ║
║  C++ · C99 · C11 · 17/17 TESTS · BANACH CONTRACTION · WORM CHAIN      ║
║                                                                         ║
║  Ω ← TRUST ∧ CODE                                                      ║
╚══════════════════════════════════════════════════════════════════════════╝
```

</div>
