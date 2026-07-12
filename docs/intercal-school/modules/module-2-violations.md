# Module 2 — The Seven Violation Classes

| # | Violation Class | INTERCAL Artifact | Template |
|---|-----------------|-------------------|----------|
| V1 | Alias violation | Invalid `SELECT` mask | `alias_violation.i.in` |
| V2 | Ownership cycle | Unresolved label dependency | `ownership_cycle.i.in` |
| V3 | Use-after-move | Missing resource array slot | `use_after_move.i.in` |
| V4 | Hidden mutation | Etiquette imbalance marker | `hidden_mutation.i.in` |
| V5 | Undeclared effect | Forbidden `COME FROM` edge | `undeclared_effect.i.in` |
| V6 | Type instability | Invalid width transition | `type_instability.i.in` |
| V7 | Spaghetti | Oversized control-flow fan-out | `spaghetti.i.in` |

Templates: [`intercal/templates/`](../../cosmic-invariant-sieve/intercal/templates/)

## Encoding elements
- `MINGLE` (`$`) — resource aggregation
- `SELECT` — mode validation mask
- Arrays (`.` `;` `:`) — resource state
- Labels — scope boundaries
- Controlled `COME FROM` — ownership edges (restricted)
- **Compiler etiquette distribution** — the validity checksum (politeness lives here)

## Exercise 2
For each V1–V7 write one line: human cause → INTERCAL artifact. Grade against the table.
