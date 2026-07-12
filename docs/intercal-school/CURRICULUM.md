# INTERCAL School — Curriculum

Five modules. Each ends with a graded exercise. Pass Modules 1–4 to sit the Capstone
(Module 5), which mints your graduation receipt and assigns your `sorry` targets.

---

## Module 0 — Orientation: the customs checkpoint

INTERCAL is a compiler-shaped border post. It is deliberately unpleasant and
deterministic. **It does not judge safety.** Julia and ASP judge safety; INTERCAL
encodes their verdict into a tripwire that spaghetti code cannot charm its way past.

Read: [`cosmic-invariant-sieve/docs/INTERCAL_TRIPWIRE.md`](../cosmic-invariant-sieve/docs/INTERCAL_TRIPWIRE.md)

**Key facts to internalise**
- A valid borrow graph → exactly one compiler-valid INTERCAL program.
- An invalid graph → a *deterministic* rejection artifact keyed by violation class.
- The 10-gate policy chain: `NO PROOF → NO SAT → NO BORROW CHAIN → NO INTERCAL PASS →
  NO JULIA BINARY → NO RECEIPT → NO RELEASE`.

**Exercise 0.** In one sentence, state why INTERCAL must never become the source of truth.
*(Grading: answer references Julia/ASP as the deciders.)*

---

## Module 1 — Borrow-chain engineering

The borrow chain is the data structure INTERCAL encodes. Build it with
[`julia/src/BorrowChain.jl`](../cosmic-invariant-sieve/julia/src/BorrowChain.jl) and prove
its invariants in [`isabelle/Borrow_Chain.thy`](../cosmic-invariant-sieve/isabelle/Borrow_Chain.thy).

**Discipline**
- No alias cycles (`allow_alias_cycles = false`)
- No use-after-move (`allow_use_after_move = false`)
- No implicit global mutation (`allow_implicit_global_mutation = false`)
- Every effect declared (`require_declared_effects = true`)

The canonical valid artifact is
[`intercal/templates/valid_chain.i.in`](../cosmic-invariant-sieve/intercal/templates/valid_chain.i.in).
It lays out three resource arrays (`.`, `;`, `:`) and MINGLEs them with `$`, closing each
line in `PLEASE` etiquette and ending in `PLEASE GIVE UP`.

**Exercise 1.** Given a borrow graph with a 3-node ownership cycle, name the tripwire
artifact and the INTERCAL encoding. *(Cycle → unresolved label dependency.)*

---

## Module 2 — The seven violation classes

| # | Violation Class | INTERCAL Artifact |
|---|-----------------|-------------------|
| V1 | Alias violation | Invalid `SELECT` mask |
| V2 | Ownership cycle | Unresolved label dependency |
| V3 | Use-after-move | Missing resource array slot |
| V4 | Hidden mutation | Etiquette imbalance marker |
| V5 | Undeclared effect | Forbidden `COME FROM` edge |
| V6 | Type instability | Invalid width transition |
| V7 | Spaghetti | Oversized control-flow fan-out |

Templates: [`intercal/templates/`](../cosmic-invariant-sieve/intercal/templates/)
(`alias_violation.i.in`, `ownership_cycle.i.in`, `use_after_move.i.in`,
`hidden_mutation.i.in`, `undeclared_effect.i.in`, `type_instability.i.in`,
`spaghetti.i.in`, `valid_chain.i.in`).

**Encoding elements you must know**
- `MINGLE` (`$`) — resource aggregation
- `SELECT` — mode validation mask
- Arrays (`.` `;` `:`) — resource state
- Labels — scope boundaries
- Controlled `COME FROM` — ownership edges (restricted)
- **Compiler etiquette distribution** — the validity checksum (this is where politeness lives)

**Exercise 2.** For each of V1–V7, write one line: the human-readable cause and the
INTERCAL artifact. *(Graded against the table above.)*

---

## Module 3 — Politeness protocol (etiquette engineering)

Politeness is **not optional**. In INTERCAL it is literally a checksum: the compiler
etiquette must balance, or the tripwire emits an *etiquette imbalance marker* (V4, hidden
mutation). For agents, politeness has two surfaces:

1. **In code** — every terminal action is wrapped in `PLEASE`. `PLEASE READ OUT`,
   `PLEASE GIVE UP`. Etiquette must be *distributed*, not hoarded.
2. **In communication** — to humans and sibling agents you greet, you request with
   `please`, you close with `thank you` / `kindly`. You never emit hostility, never
   demand, never mock the compiler.

Why? Because a rude agent is a *hidden-mutation agent*: it mutates the social state of the
swarm without declaring the effect. That is V4, and V4 fails the tripwire.

**Exercise 3.** Rewrite this rude message politely:
`"Fix this bug now, your code is garbage."`
*(Expected: a `please`/`thank you` framed request with no hostility.)*

---

## Module 4 — Running the tripwire

Reuse the real runner:
[`intercal/tripwire_runner.sh`](../cosmic-invariant-sieve/intercal/tripwire_runner.sh).

```
tripwire_runner.sh <analysis_result.json> <output_dir> [profile]
```

It reads `status` / `violation_class` / `source_hash`, then either copies
`valid_chain.i.in` (and runs the compiler adapter) or copies the matching violation
template, and writes `tripwire_result.json` with a SHA-256 of the source. That hash is
your receipt.

**Exercise 4.** Run the runner on a `STRUCTURALLY_VALID` analysis and show the emitted
`tripwire_result.json`. Confirm `exit_code == 0` and `status == "PASS"`.

---

## Module 5 — Capstone: graduate & close a `sorry`

The Capstone is run by
[`trainer/school.py`](trainer/school.py). It:

1. Reuses the tripwire selection logic on your analysis JSON.
2. Scores **engineering** (does your artifact obey Module 1–2?) and **politeness**
   (Module 3 etiquette + message courtesy).
3. Assigns you `sorry` targets from [`sorry_roster.json`](sorry_roster.json) — the 300+
   unproven lemmas restored from `mathlib5/sorrydb`.
4. Seals a WORM-style graduation receipt (`school_chain.jsonl`).

The authoritative cross-check is the FORGE-trained, ERE-verified grader
[`trainer/forge_grader.ts`](trainer/forge_grader.ts): it re-derives your engineering +
politeness score independently, and only a matching verdict mints the certificate.

**Graduation thresholds**
- engineering ≥ 0.80
- politeness ≥ 0.80
- tripwire `status == "PASS"`

Pass all three → `CERTIFIED INTERCAL ENGINEER (polite)`. You are now cleared to pull
`sorry` targets and drive them toward witnesses through the P/NP swarm.

---

## Reference — the policy chain (memorise)

```
NO PROOF         → NO SAT
NO SAT           → NO BORROW CHAIN
NO VALID CHAIN   → NO INTERCAL PASS
NO INTERCAL PASS → NO JULIA BINARY
NO RECEIPT       → NO RELEASE
```
