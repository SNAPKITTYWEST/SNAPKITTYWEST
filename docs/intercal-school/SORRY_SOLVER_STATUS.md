# SORRY SOLVER — Mission Status (hy3 handoff)

**Date:** 2026-07-12 · **Operator:** Ahmad Ali Parr · **Verifier:** Claude (Sonnet 4.6)
**Repo:** SNAPKITTYWEST `main`

## CORRECTION (same day) — toolchain IS installed

My first pass wrongly assumed no proof assistant was installed. Correction, engine-verified:

- `elan` + `lake` + `lean` **are installed** at `C:\Users\jessi\.elan\bin` (Lean 4.14.0, x86_64-w64-windows-gnu). They were simply off the session `PATH`.
- `lake build SAUTOCODE.MTheory` **succeeds** — the in-repo I₄ certificate builds clean with 2 expected `sorry`s.
- I extracted a **numeric witness** with the engine (`S_AUTOCODE/SAUTOCODE/CheckI4.lean`) proving `I4_homogeneous` is **false as written** (see below).

So the engine works. What remains is mathematics, not tooling.

## Engine-backed finding: `I4_homogeneous` is false as currently defined

`S_AUTOCODE/SAUTOCODE/CheckI4.lean` builds a concrete state (every component = 1.0) and
prints, via `lake env lean`:

```
I4(Ψ)        = 14926192320.0
I4(2·Ψ)      = 60635607833856.0
16·I4(Ψ)     = 238819077120.0
ratio I4(2Ψ)/I4(Ψ) = 4062.36      (should be 16 if degree-4 homogeneous)
```

The current `I4` is **not quartic**: `I4term1 = Σ_μ N(Ψ_μ)²` and `cubicNorm` is degree 3,
so term1 is degree 6. The stated `I4_homogeneous` theorem therefore cannot be proven —
it is mathematically false for this definition. This is now established by the engine, not
by assumption.

### Why the `Float → ℝ` refactor alone does not fix it
- Core Lean 4.14.0 has **no `Real` and no `Rat`** in library scope; the only exact-rational
  type would come from Mathlib.
- The pinned Mathlib in `lake-manifest.json` (rev `f057047…`) is **incompatible** with
  Lean 4.14.0 (its lakefile references `String.trimAscii` / `Lake.NPackage.baseName`, absent
  in this Lake). A compatible Mathlib rev for 4.14.0 would be needed to use `Real`.
- Even with `Real`, the theorem stays false until `I4` is redefined as the *correct*
  Günaydin–Koepsell–Nicolai quartic invariant (the current formula is degree 6).

### `I4_E7_Invariant`
Plausibly **true** (the current `I4` is built from sign/permutation-symmetric terms, so it
is invariant under the `relocate` signed-permutation action). But a full proof is
research-scale (show each of the 4 terms invariant under arbitrary signed permutations of the
108 components). Not closed this session; left as `sorry` with an honest note.

## Genuinely closed & sealed proofs (real, 0 sorry)

| Proof | Where | Sealed? |
|---|---|---|
| 12 normalization theorems | `docs/paper/GatesNormalization.lean` | ✅ (FORGE `certified:true`) |
| `drumOptimizerEOM` | `S_AUTOCODE/SAUTOCODE/MTheory.lean` | ✅ |
| `Sovereign_Compiler_Correct` | `S_AUTOCODE/SAUTOCODE/MTheory.lean` | ✅ |

Receipts appended to `docs/intercal-school/trainer/school_chain.jsonl`.

## The 1,367 roster targets
The three rosters are **pointers** to external GitHub repos (PutnamBench, HOL Light, UniMath,
mathlib4, seL4, …). Their sources are not in this repo, and only Lean is installed here
(Isabelle/Coq/HOL not present). To close any of them you must: (1) clone the specific repo,
(2) install its toolchain, (3) author + verify the proof. Not attempted this session — it is
a logistics task, not a doubt.

## Next concrete steps to actually close the in-repo sorries
1. Pin a Mathlib rev compatible with Lean 4.14.0 (or bump Lean) so `Real` is usable.
2. Substitute the **correct quartic** `I4` (genuine Günaydin–Koepsell–Nicolai invariant).
3. Then `I4_homogeneous` becomes true and is provable by construction; `I4_E7_Invariant`
   remains a large but tractable symmetry proof.

The cage holds — no false certificate minted.
