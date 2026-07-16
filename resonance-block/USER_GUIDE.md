# Resonance Block — User Guide

```
  +-----------------------------------------------------------+
  |                  R E S O N A N C E   B L O C K            |
  |                                                           |
  |   11 layers  ·  EVIDENCE / SILENCE  ·  WORM-sealed        |
  +-----------------------------------------------------------+
        |                                                 |
      [source] ---> [datalog] ---> [contractivity] ---> [assembly]
        L8             L9               L10               L11
```

Resonance Block is a layered verification scaffold. It walks a repo, runs a
datalog proof gate, checks the math is *contractive*, and seals the result.

## 1. Install

No build step. Needs **Node.js >= 20**.

```bash
cd resonance-block
# nothing to install — pure ESM, zero dependencies
```

## 2. Assemble the block

```bash
node layers/repo-assembly/assemble.mjs \
  --repo . \
  --facts ../inverted-turbo/datalog/facts/generated.dl \
  --dir  ../inverted-turbo/datalog/rules
```

Output:

```
[assembly] L8 source: worm_head=c74b5a60 files=22 k=0.5
[assembly] L9 datalog: PASS violations=0 k=1
[assembly] L10 contractivity: k=0.618 contractive
[assembly] L1-7 veneer: 7 synthesized layers at floor k=0.5
[assembly] block k=1 (contractive)

[assembly] VERDICT: EVIDENCE
[assembly] WORM seal: 0d384ae4...
[assembly] report -> assembly-report.json
```

Exit code is `0` for **EVIDENCE** (pass) and `1` for **SILENCE** (fail).

## 3. The layers

```
 L1  @veneer/lean     synthesized   Lean 4 zero-sorry resonance proofs
 L2  constitution     synthesized   governance constitution
 L3  trust            synthesized   trust kernel (resonance <-> sovereignty)
 L4  triple-lock      synthesized   Guardian -> Examiner -> Publisher locks
 L5  bob-gate         synthesized   BOB EVIDENCE/SILENCE gate
 L6  worm             synthesized   WORM chain ledger
 L7  metatron         synthesized   Metatron reasoning
 L8  source   [scaffolded]  source inventory + worm_head + SHA-256
 L9  datalog  [scaffolded]  datalog gate (wraps inverted-turbo engine)
 L10 contractivity [scaffolded] Banach fixed-point, k in (0,1]
 L11 repo-assembly [scaffolded] orchestrates all 11 + WORM seal
```

## 4. Contractivity, in one line

A layer is **contractive** only if its `contractivity_score` is in `(0, 1]`.
`k <= 0` ⇒ no fixed point. `k > 1` ⇒ expansive, diverges. The block inherits
the **worst-case** (max) score across layers.

```js
import { classify, iterationsToConverge } from "./layers/contractivity/banach.mjs";
classify(0.618);                 // { status: "contractive", ... }
iterationsToConverge(0.618, 1, 1e-6); // 31
```

## 5. CI

On every push/PR, `.github/workflows/assemble.yml` runs the assembly and
fails the build on **SILENCE**.

```
  questions? open an issue. pull requests welcome.
```
