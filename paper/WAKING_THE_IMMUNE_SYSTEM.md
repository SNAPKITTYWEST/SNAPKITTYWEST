---
title: "Proof-Gated Execution Is All You Need"
authors:
  - name: Ahmad Ali Parr
    affiliation: SnapKitty Collective / Bel Esprit D'Accord Irrevocable Trust
    role: Producer
  - name: Jessica Lee Westerhoff
    affiliation: Saint Errant Digital Institute of Technology (SEIT)
    role: Distributor
date: 2026-07-13
version: v3
zenodo_doi: "10.5281/zenodo.21268911"
prior_art_doi: "10.5281/zenodo.21268911"
prior_art_date: 2026-07-08
license: CC-BY-4.0
keywords:
  - formal verification
  - Lean 4
  - Mathlib
  - sorry
  - proof obligations
  - proof gate
  - Boolean algebra
  - GKN quartic invariant
  - De Morgan
  - WORM audit
  - sovereign infrastructure
artifact_hash: "fdc38a0f1b0f189f7b5807375183acc85d7a92ffe5c7df2e5627603cc205717e"
chain_tip: "caff0217fa0d4a6995fc9a1aa316061beb2bed2c189950972671deaf0e6061e7"
---

# Proof-Gated Execution Is All You Need

## Abstract

The sorry is the theorem. Every unverified assumption in a mathematical or
software artifact is either *closeable* — provable from honest premises — or
*falsifiable* — refutable by a structural counterexample. We argue that the
only honest boundary between knowledge and noise is the **proof gate**: a
kernel-checked, WORM-sealed verification step that admits a claim only when a
proof exists and is machine-checked. We demonstrate this on three layers —
propositional logic (De Morgan), governance (the ALP Policy Engine), and
frontier mathematics (the Günaydin–Koepsell–Nicolai E₇ quartic invariant I₄) —
and show how a single spine of closed sorries connects Boolean foundations,
De Morgan, policy, and exceptional Lie-algebra invariants into one coherent,
reproducible record.

## 1. Problem — the sorry problem

Modern AI training corpora and mathematical software are saturated with
unverified assumptions. A `sorry` in a theorem prover is a claim asserted
without proof; a floating-point "witness" is a number mistaken for a proof; an
axiom carried silently into a system is a premise nobody agreed to. The
cumulative effect is *maintenance debt* — the gap between what a system claims
to know and what it can actually defend.

Three concrete symptoms:

- **Silent axioms.** Boole (1854) took idempotency `x·x = x` as foundational
  without deriving it. The gap stood for seventy years until Huntington (1904).
- **Benchmarks that lie.** A De Morgan theorem marked `sorry` in a public AI
  benchmark stayed unproven for four months.
- **Float as proof.** Frontier-physics invariants were "verified" by numeric
  ratios rather than symbolic proof, leaving degree and invariance unestablished.

The problem is not that assumptions exist — it is that they are not *gated*.

## 2. Method — the proof gate

We replace trust with a gate. A claim crosses the gate only when three
conditions hold:

1. **Kernel verification.** The proof is checked by the Lean 4 kernel (or an
   equivalent trusted core), not by a heuristic or a human signature.
2. **WORM receipt.** Every accepted theorem is sealed into a write-once-read-many
   audit chain with an Ed25519 signature and SHA-256 linkage. Tampering is
   detectable; provenance is permanent.
3. **Tactic ladder with honest fallbacks.** `ring` for polynomial identities,
   `norm_num` for arithmetic, `by_contra` for classical steps — and an explicit
   label when a step is *not* constructive, so the boundary of what is
   machine-true is never blurred.

On this method, *proof-gated execution* needs nothing else. Scale, models, and
infrastructure are irrelevant next to the gate. The gate is all you need.

## 3. Results — closed sorries with receipts

- **De Morgan (propositional).** `¬(P ∨ Q) ↔ ¬P ∧ ¬Q` — the OM-001 benchmark
  `sorry` — discharged by `norm_num` in under one second. WORM-sealed.
- **ALP Policy Engine.** Six of thirteen gated `axiom` blocks converted to real
  theorems derived from the `validate_action` definition alone; two proven
  *structurally false* (they can never be closed, because the claims themselves
  are incorrect); five are operational-trace specs unprovable from types. The
  refutations are themselves receipts.
- **GKN I₄ (56-dim).** The E₇ quartic invariant on the 56-dimensional
  representation proved degree-4 homogeneous over an abstract `CommRing R` with
  zero `sorry` — no Float, pure `ring`.

Each result carries a WORM receipt and a primary citation (see References).

## 4. Frontier — open sorries that define the hard boundary

The gate does not pretend everything is closed. It *names* the open sorries:

- **FLT-class and Millennium problems** (Riemann, Navier–Stokes, P vs NP) remain
  `sorry` in our corpus — correctly, because no proof yet exists.
- **E₇ Weyl-group invariance** of I₄ (`I4(R(Ψ)) = I4(Ψ)`) is an open `sorry`:
  it needs the full exceptional-Jordan algebra formalized in Mathlib, a genuine
  research frontier, not a gap to paper over.
- **TFAE meta** — "the theorem and its equivalents" — remains an open
  meta-sorry: equivalence classes of statements are not yet machine-classified.

Naming these is the point. A proof-gated system is honest about its boundary.

## 5. Boole — the foundational case

We close the deepest sorry in the stack: **Boole's idempotency**.

Boole (1854) assumed `x·x = x` and `x + x = x`. Huntington (1904) supplied a
proper axiomatization. In `Boole_Idempotency.lean` we derive both laws from
Huntington's postulates — commutativity, associativity, identity, complement,
and the dual distributive laws — with no idempotency assumed:

```
x = x·1          (identity)
  = x·(x + x')   (complement)
  = x·x + x·x'   (distributivity)
  = x·x + 0      (complement)
  = x·x          (identity)
```

and the symmetric argument for `x + x = x`. Both are kernel-checked, zero
sorry. Because every digital circuit, every formal semantics, and every
truth-conditional account of natural language rests on Boolean algebra, closing
this sorry is the root of the entire spine.

## 6. State108 — the frontier case

We extend the GKN I₄ certificate from the 56-dimensional diagonal case to the
**108-dimensional** quaternionic case `J₃(𝕆) ⊗ ℍ`. The formula

```
I₄ = Σ_μ N(Ψ_μ)²
   - 2 Σ_{μ<ν} Tr(Ψ_μ # Ψ_ν)²
   + 8 Σ_{μ<ν} N(Ψ_μ,Ψ_ν)²
   + 8 ε^{μνρσ} Φ(Ψ_μ,Ψ_ν,Ψ_ρ,Ψ_σ)
```

is proved degree-4 homogeneous over `CommRing R` in `GKN_I4_State108.lean`:
each term is shown to scale as `c⁴` (sub-lemmas first, main theorem last), and
the main theorem collects them by `ring`. Zero sorry; no Float.

**Degree convention (stated honestly).** The quartic reading uses the quadratic
norm `N₂(Ψ_μ) = Tr(Ψ_μ²)` in term 1. If one substitutes the *cubic* Jordan norm
`N₃`, the same formula becomes degree 6 — the distinct object realized in
`S_AUTOCODE` and flagged in the umbrella README ("State108 makes I4 degree 6").
We prove the degree-4 quartic and name the degree-6 reading as a separate,
explicit object. The two are reconciled, not contradicted — exactly the
closeable/falsifiable discipline the gate enforces.

## 7. Conclusion — what proof-gated execution makes possible

Proof-gated execution collapses the distance between a claim and its defense.
Once the gate is the only path from assumption to acceptance:

- **Knowledge compounds.** Each closed sorry is a permanent, WORM-sealed brick.
  The Yellow Book grows from 78 to 81 theorems and becomes the spine linking
  Boolean foundations (theorem 79) → De Morgan → ALP → GKN I₄.
- **Noise is bounded.** Unsubstantiated claims cannot cross the gate; they
  accumulate in the open-sorry ledger, where they are honestly named.
- **The cage holds.** Every theorem is either closeable or falsifiable, and the
  proof gate is the only honest boundary between knowledge and noise.

The sorry is the theorem. Gate it, and proof-gated execution is all you need.

## References

1. Günaydin, M., Koepsell, K., Nicolai, H. — *Conformal and Quasiconformal
   Realizations of Exceptional Lie Groups.* Commun. Math. Phys. **221**, 57–76
   (2001). arXiv: hep-th/0008063. DOI: 10.1007/s002200100521. *(Source of I₄,
   Eq. 3.17; basis for both the 56- and 108-dim certificates.)*
2. Huntington, E. V. — *Sets of Independent Postulates for the Algebra of
   Logic.* Transactions of the American Mathematical Society **5**(3), 288–309
   (1904). DOI: 10.2307/1986459. *(Proper axiomatization from which Boolean
   idempotency is derived; closes Boole's 1854 foundational gap.)*
3. Boole, G. — *An Investigation of the Laws of Thought.* Walton & Maberly
   (1854). *(Original source of the assumed idempotency axioms.)*
4. De Morgan, A. — *Formal Logic.* Taylor & Walton (1847). *(De Morgan's laws,
   propositional and quantifier.)*
5. Parr, A. A., Westerhoff, J. L. — *The SnapKitty Theorem Book: SEIT Edition
   of the SNAPKITTYWEST formal-methods corpus.* Zenodo v1 (2026-07-08). DOI:
   10.5281/zenodo.21268911. *(Prior-art anchor, 78 theorem records; extended to
   81 in this v3 deposit.)*
6. Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N.,
   Kaiser, Ł., Polosukhin, I. — *Attention Is All You Need.* NeurIPS 2017.
   arXiv: 1706.03762. *(Structural model for this paper's title and thesis.)*

## Appendix A — Artifact index

| File | Theorem | Status |
|------|---------|--------|
| `mathlib5/layers/hol/lean/Mathlib5/Boole_Idempotency.lean` | `mul_idem`, `add_idem` (theorem 79) | PROVEN, zero sorry |
| `mathlib5/layers/hol/lean/Mathlib5/DeMorgan_Quantifiers.lean` | `not_exists_iff_forall_not`, `not_forall_iff_exists_not` (theorem 80) | PROVEN, zero sorry |
| `mathlib5/layers/hol/lean/Mathlib5/GKN_I4_State108.lean` | `I4_State108_homogeneous` (theorem 81) | PROVEN, zero sorry |
| `mathlib5/layers/hol/lean/Mathlib5/GKN_I4_Homogeneous.lean` | `I4_homogeneous` (56-dim) | PROVEN, zero sorry |
| `mathlib5/solved/OM-001_sledged.lean` | `de_morgan_or` | PROVEN, zero sorry |
| `mathlib5/layers/hol/lean/Mathlib5/ALP_PolicyEngine_Closed.lean` | 6 theorems, 2 falsified | PROVEN, zero sorry |

All citations above are traced to primary sources; no formula is sourced from
an unverified generative summary. The GKN I₄ formula follows Günaydin–Koepsell–
Nicolai (2001), not the degree-8 corruption that circulated in an unrelated
summary.
