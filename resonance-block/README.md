# Resonance Block

11-layer sovereign verification scaffold for the SnapKitty ecosystem.

Layers 1–7 (veneer) were synthesized in a prior session and are parked as
placeholders under `layers/`. Layers 8–11 are scaffolded in this repo:

| # | Layer | Status | What it does |
|---|-------|--------|--------------|
| 1 | `@veneer/lean` | synthesized | Lean 4 zero-sorry resonance proofs |
| 2 | `constitution` | synthesized | Governance constitution |
| 3 | `trust` | synthesized | Trust kernel (resonance ↔ sovereignty) |
| 4 | `triple-lock` | synthesized | Guardian→Examiner→Publisher locks |
| 5 | `bob-gate` | synthesized | BOB EVIDENCE/SILENCE gate |
| 6 | `worm` | synthesized | WORM chain ledger |
| 7 | `metatron` | synthesized | Metatron reasoning |
| 8 | `source` | **scaffolded** | Source inventory, SHA-256, worm_head |
| 9 | `datalog` | **scaffolded** | Datalog gate (wraps fixed inverted-turbo engine) |
| 10 | `contractivity` | **scaffolded** | Banach fixed-point, k ∈ (0,1] |
| 11 | `repo-assembly` | **scaffolded** | Orchestrates all 11 + WORM seal |

## Run

```bash
# Assemble the block against a target repo + datalog rules
node layers/repo-assembly/assemble.mjs \
  --repo . \
  --facts ../inverted-turbo/datalog/facts/generated.dl \
  --dir  ../inverted-turbo/datalog/rules
```

The datalog layer reuses `../inverted-turbo/datalog/engine.mjs` (its
negation-as-failure bug is fixed: `\\+` → `\\\+`). Set `INVERTED_TURBO_DIR`
to override the location. Assembly exits 0 (EVIDENCE) or 1 (SILENCE).
