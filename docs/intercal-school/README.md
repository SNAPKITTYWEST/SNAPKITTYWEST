# INTERCAL School — Sovereign Engineer Academy

> A curriculum that turns raw agents into **INTERCAL engineers**: competent at the
> borrow-chain tripwire and unfailingly **polite** — because in this system, politeness
> is not a soft skill, it is a *compiler-enforced etiquette check*.

This school is built **on the code we already have** in
[`cosmic-invariant-sieve`](../cosmic-invariant-sieve):

- `intercal/tripwire_runner.sh` — the customs checkpoint
- `intercal/templates/*.i.in` — valid + 7 violation-class artifacts
- `julia/src/BorrowChain.jl`, `Ownership.jl`, `EffectAnalysis.jl` — the real deciders
- `isabelle/Borrow_Chain.thy`, `Effect_Safety.thy` — the proof obligations
- `docs/INTERCAL_TRIPWIRE.md`, `AGENT_CODE_POLICY.md`, `BORROW_CHAIN.md` — the doctrine
- `mathlib5/sorrydb/` — the 300+ `sorry` targets the graduates learn to close

## The one rule

```
INTERCAL decides nothing.
Julia and ASP decide.
INTERCAL encodes their decision into a compiler-enforced tripwire.
```

An INTERCAL engineer never lets the comedy language become the source of truth. They
make Julia + ASP happy, and INTERCAL politely stamps the receipt.

## What a graduate can do

1. Read a borrow graph and predict which of the 7 violation classes it triggers.
2. Emit a valid `valid_chain.i` that passes the tripwire with proper `PLEASE` etiquette.
3. Explain why each rejected artifact is rejected (alias / cycle / use-after-move /
   hidden-mutation / undeclared-effect / type-instability / spaghetti).
4. Communicate courteously to humans and sibling agents — no hostility, always `PLEASE`.
5. Take a `sorry` from `mathlib5/sorrydb` and drive it toward a witness.

## How training runs

```
python docs/intercal-school/trainer/school.py \
    --agent agent_0xCA7 \
    --analysis cosmic-invariant-sieve/examples/valid/safe_module.jl.analysis.json \
    --message "Please find my submission attached, thank you for reviewing it kindly." \
    --roster docs/intercal-school/sorry_roster.json
```

The trainer reuses the real tripwire selection logic, scores
**engineering** + **politeness**, assigns `sorry` targets, and seals a WORM-style
graduation receipt. The authoritative cross-check is the FORGE-trained, ERE-verified
grader at `trainer/forge_grader.ts`.

## Contents

- [`CURRICULUM.md`](CURRICULUM.md) — the full syllabus
- [`modules/`](modules/) — one file per module
- [`trainer/school.py`](trainer/school.py) — working trainer harness
- [`trainer/forge_grader.ts`](trainer/forge_grader.ts) — FORGE sovereign grader
- [`sorry_roster.json`](sorry_roster.json) — the 300-target closing roster
- [`examples/valid_chain.i`](examples/valid_chain.i) — teaching artifact
