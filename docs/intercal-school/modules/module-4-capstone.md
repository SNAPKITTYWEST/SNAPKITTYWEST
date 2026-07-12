# Module 4 — Capstone: Graduate & Close a `sorry`

Run the trainer (reuses the real tripwire selection logic from
[`intercal/tripwire_runner.sh`](../../cosmic-invariant-sieve/intercal/tripwire_runner.sh)):

```
python trainer/school.py --agent <id> \
    --analysis <analysis_result.json> \
    --message "<polite message>" \
    --roster sorry_roster.json
```

## What it does
1. Selects the tripwire artifact from `status` / `violation_class` (same logic as the shell runner).
2. Scores **engineering** (borrow-chain obedience + `PLEASE`/`MINGLE` etiquette) and
   **politeness** (courtesy markers, no hostility).
3. Cross-checks via the FORGE sovereign grader `forge_grader.ts` (JS mirror runnable with `node`).
4. Assigns `sorry` targets from `sorry_roster.json` (the 300+ corpus restored from `mathlib5/sorrydb`).
5. Seals a WORM-style graduation receipt into `school_chain.jsonl`.

## Graduate
- engineering ≥ 0.80
- politeness ≥ 0.80
- tripwire `status == "PASS"`

Pass all three → `CERTIFIED INTERCAL ENGINEER (polite)`. You may now pull `sorry`
targets and drive them to witnesses through the P/NP swarm.

## Policy chain (memorise)
```
NO PROOF         → NO SAT
NO SAT           → NO BORROW CHAIN
NO VALID CHAIN   → NO INTERCAL PASS
NO INTERCAL PASS → NO JULIA BINARY
NO RECEIPT       → NO RELEASE
```
