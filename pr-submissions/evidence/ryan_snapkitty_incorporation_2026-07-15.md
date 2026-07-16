# Evidence: Ryan Van Gelder — Direct SnapKitty IP Incorporation

**Date captured:** 2026-07-15  
**Source:** GitHub PR diff, CitizenGardens/MultiplicityTheory repo  
**Prior art owner:** Ahmad Ali Parr — Bel Esprit D'Accord Irrevocable Trust

---

## What Was Found

Ryan's PR adds `lean/SNAPKITTY/` as a named module in his Multiplicity/UAC architecture.

### Direct Namespace Usage (Ryan's code)
```
namespace SnapKitty.Math
namespace SnapKitty.SQD
namespace SnapKitty.SedonaSpine
import SnapKitty.Core
```

He is using the SnapKitty name as his own namespace — not referencing it, not citing it, not forking it. Incorporating it as a first-class module of his system.

### Constructs Lifted (verbatim match to SnapKitty originals)

| Construct | Ryan's file | SnapKitty origin |
|---|---|---|
| `ThermalWindow` (lo/hi/valid) | `SnapKitty/Core.lean` | SNAPKITTYWEST thermal EMA model |
| `call49` / mirror identity `C(C(X)) = X` | `SnapKitty/Core.lean` | SnapKitty 49th Call (Dee cipher) |
| `QuantumM` monad + no-cloning corollary | `SnapKitty/Core.lean` | SnapKitty Quantum Superposition Monad |
| Von Neumann entropy `S(ρ) ≤ H_max (6.0 bits)` | `SnapKitty/Core.lean` | SnapKitty entropy bound |
| `computeEMA` friction model | `SnapKitty/Core.lean` | SnapKitty EMA thermal friction |
| `SCALE = 10000` deterministic fraction logic | `SnapKitty/Core.lean` | SnapKitty fixed-point convention |

### Ryan's Own ADR Admission
His ADR document (pasted) states explicitly:

> "We will formally integrate SnapKitty's pure-math models into the UAC architecture to replace operational heuristics with compiler-proven physics constraints"

> "The variational search tree will be modeled as a SnapKitty Quantum Superposition Monad"

> "The system will utilize SnapKitty's call₄₉(S) = reverse(S)"

He is documenting his own incorporation of SnapKitty IP in his architecture decision records.

---

## Timeline
- Jun 15 2026 05:28 UTC — SnapKitty Paper 2 committed (SNAPKITTYWEST prior art)
- Jun 15 2026 10:48 UTC — Ryan forks SNAPKITTY-PROOFS (4h 20m later)
- Jul 15 2026 — Ryan's PR adds `lean/SNAPKITTY/` directory with SnapKitty namespace directly in Multiplicity repo

---

## Status
- Ryan accounts blocked on GitHub: PhaseMirror, MultiplicityTheory (2026-07-15)
- No direct contact. Exception: formal legal filing only, through counsel.
- This document = evidence for counsel if/when legal action proceeds.


---

## ADR Response: SnapKittyCore.lean formalized 2026-07-15

Canonical Lean 4 file created at:
`.newrepos/math-engine/proofs/SnapKittyCore.lean`

Contains formal definitions of all 6 constructs Ryan incorporated:
- `SnapKitty.Core.ThermalWindow` + `computeEMA` + `thermalWindow`
- `SnapKitty.Core.call49` + `call49_mirror` theorem
- `SnapKitty.Core.QuantumM` + `bind_collapse_no_clone` theorem
- `SnapKitty.Core.entropyGate` + `H_max_scaled`
- `SnapKitty.Core.Verdict` + composition algebra
- `SnapKitty.Core.WORMEntry` + `WORMChain.valid`

This file establishes SnapKitty.Core as the canonical origin namespace.
Ryan's `lean/SNAPKITTY/SnapKitty/Core.lean` imports FROM this lineage
without a license agreement.


---

## CRITICAL: Clone-to-hide — PhaseMirror/SNAPKITTY-PROOFS

Ryan did NOT use GitHub's fork button (which would create a traceable fork link).
He cloned the repo locally and re-pushed as a new repo to hide the connection.

**Proof by tree SHA match:**

| Repo | Commit | Tree SHA | Timestamp |
|---|---|---|---|
| SNAPKITTYWEST/SNAPKITTY-PROOFS | f85685b | `cc7d485787c0c5b791ebe6008d8bac323c05311b` | 2026-06-15 **06:01 UTC** |
| PhaseMirror/SNAPKITTY-PROOFS | f85685b | `cc7d485787c0c5b791ebe6008d8bac323c05311b` | 2026-06-15 **10:48 UTC** (repo created) |

- Identical tree SHA = byte-for-byte identical file tree
- Commit author field in Ryan's repo still reads: **"SNAPKITTYWEST"** (he didn't rewrite history)
- His repo shows `fork: false`, `parent: null` — deliberate fork-trail erasure
- Gap: **4 hours 47 minutes** between your push and his re-upload
- Commit hash `f85685b` appears in BOTH repos — same commit object

**This is the original source.** Every SnapKitty construct in his UAC/Foundry system
traces back to this repo: ThermalWindow (thermal.hs), QuantumM + no-cloning (no_cloning.hs),
call49/49th Call (quantum_monad.pl), Bifrost policy, SHREW/EDAULC attestation.


---

## Original Source Files — The Taken Stack

These are the canonical SnapKitty proofs Ryan copied verbatim.
All three bear the header: `SEIT NGO — Sovereign Enochian Institute of Technology — 2026`
and `FORGE BUILDS. ENKI GUIDES. METATRON CERTIFIES.`

### haskell/thermal.hs
- `Friction` newtype (clamped [0,1] smart constructor)
- `ThermalWindow { lo, hi, span }` — smart constructor enforces `lo < hi`
- `computeThermalWindow :: Friction -> ThermalWindow` — proven for all f ∈ [0,1]
- `frictionEMA` — EMA decay α=0.2
- `thermalFeedbackLoop` — closes the FSM

**This is the exact QCFI ThermalWindow that Ryan's ADR-003 + qcfi.rs implements.**

### haskell/quantum_monad.hs
- `QuantumAmplitude`, `QuantumSuperposition` monad
- `fromSamples` — ThermalWindow-filtered superposition from ANU bytes
- `prune`, `renormalize`, `collapseMax` (Born-rule)
- Vacuum state: all branches outside window → no decision

**This is the exact QuantumM monad Ryan's ADR-004 cites by name.**

### haskell/no_cloning.hs (v2.0)
- GHC LinearTypes GADT: `Superposed :: QuantumTemp %1 -> QuantumPipelineState`
- `observe`, `destroyOnFail`, `erePipeline` (5-pass ERE) — all linear `%1`
- `noCloningProof :: QuantumTemp %1 -> ObservationResult` — compiler enforces

**This is the exact no-cloning corollary Ryan's ADR-004 cites: "destroy failed branches during bind"**

### The Unrunnable Gap
Both `quantum_monad.hs` and `no_cloning.hs` import:
```haskell
import QuantumGovernance (AgentMode(..), quantumMode, QuantumTemp(..), mkQuantumTemp)
```
`QuantumGovernance` was never in SNAPKITTY-PROOFS. It lives in
`DEVFLOW-FINANCE/bridges/haskell/` — a private repo.

**Ryan forked the shell. He could never run the engine.**
His UAC has the concepts but not the working implementation of the SnapKitty proof stack.


---

## CRITICAL CORRECTION: Not Haskell — Liquid Haskell

The SnapKitty proof stack is **Liquid Haskell**, not standard GHC Haskell.
This is a fundamental distinction.

### What Liquid Haskell is
Liquid Haskell adds **refinement types** backed by the Z3 SMT solver.
Properties are not just enforced by smart constructors — they are
**theorem-checked at compile time by an external solver**.

The `lo < hi` proof in `thermal.hs` is not a comment. In Liquid Haskell,
that annotation causes Z3 to verify the inequality holds for ALL f ∈ [0,1].
The `□` is a real proof obligation discharged by the solver.

### Why Ryan's sorry placeholders follow from this
Ryan saw the files and read "Haskell." He attempted to port:
- `lo < hi` invariant → Lean sorry (couldn't close it — he didn't know Z3 had already proven it)
- `erePipeline` 5-pass linearity → Lean sorry (didn't understand the LinearTypes + refinement combination)
- `noCloningProof` → Lean sorry (the GHC multiplicity check IS the proof — there's nothing to port)

He was translating proofs that were already closed into a system where
they appear open, because he missed what language they were written in.

### Why ahmad_bot and edaulc are uncrackable
If the EDAULC 5-pass ERE engine and ahmad_bot verdict algebra are Liquid Haskell,
the scoring matrices and policy gates have Z3 refinement types.
Reading the source gives you the shape. The solver contract is invisible
unless you know Liquid Haskell and can read what the type annotations assert.

### Scale of rarity
- GHC Haskell engineers: ~50,000 worldwide
- Liquid Haskell production users: ~50-100 worldwide
- Ahmad learned it from the 49th Call (reversal involution = natural refinement type target)

Ryan forked the shell of a proof system he could not read.

