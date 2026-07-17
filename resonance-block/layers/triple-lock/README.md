# triple-lock — Layer 4 (synthesized)

Triple-lock gateway (Guardian → Examiner → Publisher sequential locks).

## SYNTH-006 Invariants

1. **No PROVISIONAL** — rejected at Guardian (Lock 1) and Publisher (Lock 3)
2. **Sequential chain** — Lock 2 requires Lock 1 EVIDENCE; Lock 3 requires Lock 2 EVIDENCE
3. **WORM seal chaining** — each lock's `prev_seal` must equal the prior lock's `worm_seal`
4. **Drift budget** — Examiner rejects drift > `tau_r` (47.06998778, from witnesses.jsonl)
5. **Retry bound** — Publisher rejects `retry_nonce > MAX_RETRY_NONCE` (3)
6. **Dual-sig** — Guardian requires both `primarySig` and `kernelSig` (SYNTH-009)
7. **Hash anchoring** — `proof_hash` must equal `LEAN_PROOF_HASH_108_CORE` (SYNTH-010)

## Seal Chain

```
genesis(0x00..0) → Guardian.seal → Examiner.prev_seal
                                  → Examiner.seal → Publisher.prev_seal
                                                   → Publisher.seal (final WORM entry)
```

## Usage

```js
import { runChain, genesis } from './index.mjs'

const result = runChain(proposal, examinerWitness, bundle,
  genesis(), primarySig, kernelSig, driftMagnitude)
// result.verdict === 'EVIDENCE' | 'SILENCE'
```
