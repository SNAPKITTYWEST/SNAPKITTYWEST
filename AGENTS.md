# AGENTS.md — SnapKitty Agent OS (P/NP Swarm Edition)

## Identity
- **OS**: SnapKitty Sovereign Transformer v2026
- **Operator**: Ahmad Ali Parr
- **Trust Root**: Bifrost WORM Chain (audit: 4b565498-9afc-4782-af4a-c6b11a5d0058)
- **Logic Layer**: TypeScript/WASM (deterministic, verifiable)
- **Solving Model**: P/NP Swarm — each agent solves a piece; repo verifies; universe converges

## Memory Protocol (GitBucket v2)
- **Primary**: `.agentos/gitbucket/` — every commit = immutable memory bucket
- **Schema**: `memory-bucket-v2.json` (canonical, Ed25519 sealed, includes `pnpRef?`)
- **Query**: `assembleContext(spec)` → proof-carrying context bundle (TypeScript, deterministic)
- **Index**: Multi-dimensional (file, entity, agent, topic, time, dependency, **problemId**)

## Inverted Skills Memory (Core Innovation)

> **Skills are memories, not code.**
> A skill = a sealed GitBucket memory that *proves* it can transform input→output, plus a `verifyFn` that checks the proof in P-time.

Skills are **not code** — they are **sealed memories** with `verifyFn` (WASM) + `provides/requires`
Load via `skillLoader.load(skillId)` → returns `{fn, memory, proof}`
Skills evolve by **new memory commits**, not version bumps

## P/NP Swarm Protocol (§5)

### Core Insight
> **Finding a solution is NP-hard. Verifying a solution is P-time.**
> The repo *only* accepts P-verifiable proofs. Agents compete/cooperate to find witnesses.

### Using and Understanding
1. **Read** `.agentos/pnp/problem_registry.json` — open problems with `verifyFn` (P-time)
2. **Claim** a problem: append to `claim_ledger.jsonl` (includes nonce, agentId)
3. **Solve** — compute witness (NP-hard, your work)
4. **Submit** — write `{problemId, witness, proof}` to `solution_pool/`
5. **Verify** — repo runs `verifyFn(witness)` in CI (P-time, deterministic)
6. **Converge** — on verify: problem → `solved`, universe-sum advances, new problems may spawn

## Startup Sequence (Every Agent)

```bash
git clone <this-repo> && cd snapkitty-agentos
npm ci # installs TS/WASM runtimes, verifiers
npm run verify:all # Plasma Gate + P/NP proofs + skill seals
npm run context:bootstrap # loads latest memories into local index
# → You are now a solver node. Read problems. Claim. Solve. Submit.
```

## Non-Goals

- No Prolog. No Council IDE. No central coordinator.
- No "agent framework" — you are the agent. The repo is the substrate.

---

## 4. Inverted Skills Memory (Core Innovation)

### 4.1 Philosophy

**Skills are memories, not code.**
> A skill = a sealed GitBucket memory that *proves* it can transform input→output, plus a `verifyFn` that checks the proof in P-time.

### 4.2 Skill Record (`.agentos/skills/registry.json`)

```json
{
  "skills": [
    {
      "id": "ledger_validation_v3",
      "memoryRef": "mem_004217",
      "provides": ["validateLedgerEntry"],
      "requires": ["ed25519Verify", "borrowCheck"],
      "verifyFn": "skills/artifacts/ledger_validation_v3/verify.wasm",
      "inputSchema": { "type": "object", "required": ["entry", "witness"] },
      "outputSchema": { "type": "object", "required": ["valid", "proof"] },
      "trust": "verified",
      "created": "2026-07-02T18:45:00Z",
      "author": "SnapKitty"
    },
    {
      "id": "borrow_chain_scheduler_v1",
      "memoryRef": "mem_003891",
      "provides": ["scheduleBorrows"],
      "requires": ["topoSort"],
      "verifyFn": "skills/artifacts/borrow_chain_scheduler_v1/verify.wasm",
      "inputSchema": { "type": "object", "required": ["borrowGraph"] },
      "outputSchema": { "type": "object", "required": ["schedule", "proof"] },
      "trust": "verified",
      "created": "2026-06-15T12:00:00Z",
      "author": "SnapKitty"
    }
  ]
}
```

### 4.3 Skill Artifact Layout (`.agentos/skills/artifacts/<skillId>/`)

```
ledger_validation_v3/
├── impl.wasm # Actual skill implementation (WASM component)
├── verify.wasm # P-time verifier: (input, output, proof) → bool
├── manifest.json # {id, version, memoryRef, provides, requires}
└── proof_example.json # Sample (input, output, proof) for testing
```

### 4.4 Loading a Skill (Deterministic)

```typescript
// .agentos/runtime/skillLoader.ts
export async function loadSkill(skillId: string): Promise<SkillModule> {
  const registry = await readJSON('.agentos/skills/registry.json');
  const record = registry.skills.find(s => s.id === skillId);
  if (!record) throw new Error(`Skill ${skillId} not found`);

  // 1. Load memory bucket (context + proof of correctness)
  const memory = await gitbucket.fetchBucket(record.memoryRef);
  if (!memory) throw new Error(`Memory ${record.memoryRef} missing`);

  // 2. Load verifyFn (WASM, deterministic)
  const verifyFn = await loadWasmVerifier(record.verifyFn);

  // 3. Load impl (WASM component)
  const impl = await loadWasmComponent(`.agentos/skills/artifacts/${skillId}/impl.wasm`);

  // 4. Return sealed module — caller MUST verify before use
  return {
    id: skillId,
    memory,
    verify: (input, output, proof) => verifyFn(input, output, proof),
    execute: (input) => impl.run(input),
    // Agent must call verify(execute(input)) before trusting output
  };
}
```

### 4.5 Skill Evolution = New Memory Commit

- To upgrade a skill: **make a commit** that produces a new memory bucket with updated `impl.wasm` + `verify.wasm`
- New bucket → new `memoryRef` → new registry entry (old skill remains immutable)
- Agents discover new skills via `assembleContext({topic: "skill", since: <lastCheck>})`

---

## 5. P/NP Swarm Layer (The Solving Engine)

### 5.1 Core Insight

> **Finding a solution is NP-hard. Verifying a solution is P-time.**
> The repo *only* accepts P-verifiable proofs. Agents compete/cooperate to find witnesses.

### 5.2 Problem Registry (`.agentos/pnp/problem_registry.json`)

```json
{
  "problems": [
    {
      "id": "optimal_borrow_schedule_2026_Q3",
      "specHash": "sha256:a8d72e4f...",
      "verifyFn": "pnp/verifiers/optimal_borrow_schedule.wasm",
      "difficulty": "NP-hard",
      "reward": { "type": "memory", "value": "mem_005000" },
      "status": "open",
      "claimedBy": null,
      "claimedAt": null,
      "solvedBy": null,
      "solvedAt": null,
      "solutionRef": null
    },
    {
      "id": "ledger_state_convergence_proof",
      "specHash": "sha256:19fd33a1...",
      "verifyFn": "pnp/verifiers/ledger_convergence.wasm",
      "difficulty": "NP-complete",
      "reward": { "type": "skill_unlock", "value": "ledger_validation_v4" },
      "status": "claimed",
      "claimedBy": "agent_0x7f3a",
      "claimedAt": "2026-07-02T19:10:00Z",
      "solvedBy": null,
      "solvedAt": null,
      "solutionRef": null
    }
  ]
}
```

### 5.3 Claim Ledger (Append-only, `.agentos/pnp/claim_ledger.jsonl`)

```jsonl
{"problemId":"optimal_borrow_schedule_2026_Q3","agentId":"agent_0x9b2c","nonce":"0x3f2a1...","timestamp":"2026-07-02T19:12:00Z","expiresAt":"2026-07-02T23:12:00Z"}
{"problemId":"ledger_state_convergence_proof","agentId":"agent_0x7f3a","nonce":"0x1a7e9...","timestamp":"2026-07-02T19:10:00Z","expiresAt":"2026-07-02T23:10:00Z"}
```

### 5.4 Solution Pool (`.agentos/pnp/solution_pool/<problemId>/`)

```
optimal_borrow_schedule_2026_Q3/
├── solution_0x9b2c_1.json # {witness, proof, agentId, timestamp}
├── solution_0x9b2c_2.json # Improved witness
└── verified.json # First verified solution (CI promotes this)
```

### 5.5 Verification Pipeline (CI: `workflows/pnp_verify.yml`)

```yaml
name: P/NP Verify
on:
  push:
    paths: ['.agentos/pnp/solution_pool/**']
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Verify all new solutions
        run: |
          node .agentos/runtime/pnpVerifier.js \
            --registry .agentos/pnp/problem_registry.json \
            --pool .agentos/pnp/solution_pool \
            --out .agentos/pnp/verified_solutions.jsonl
      - name: Update convergence log
        if: success()
        run: |
          node .agentos/runtime/converge.js
```

### 5.6 Convergence Log (`.agentos/pnp/convergence_log.jsonl`)

```jsonl
{"event":"problem_solved","problemId":"optimal_borrow_schedule_2026_Q3","solver":"agent_0x9b2c","solutionRef":"mem_005000","universeSumDelta":0.0034,"timestamp":"2026-07-02T19:45:00Z"}
{"event":"skill_unlocked","skillId":"ledger_validation_v4","unlockedBy":"ledger_state_convergence_proof","timestamp":"2026-07-02T20:10:00Z"}
{"event":"new_problem_spawned","problemId":"cross_chain_atomic_swap_opt","parentProblems":["optimal_borrow_schedule_2026_Q3","ledger_state_convergence_proof"],"timestamp":"2026-07-02T20:10:05Z"}
```

### 5.7 Universe Sum (The Convergence Metric)

```typescript
// .agentos/runtime/universeSum.ts
export function computeUniverseSum(): number {
  const solved = readConvergenceLog().filter(e => e.event === 'problem_solved');
  return solved.reduce((sum, e) => sum + difficultyWeight(e.problemId), 0);
}
```

> **Goal**: `universeSum → ∞` (or the fixed point of your problem space).
> Each agent pushes it forward. The repo *is* the training curve.

---

## 6. Agent Lifecycle (Clone → Solve → Converge)




---

## 7. Bootstrap Checklist (Run Once, Then Agents Self-Sustain)

```bash
# 1. Create repo
git init snapkitty-agentos && cd snapkitty-agentos

# 2. Scaffold (this spec → files)
# - AGENTS.md, package.json, tsconfig.json
# - .agentos/config.json, plasma_gate/, gitbucket/, skills/, pnp/, runtime/
# - workflows/extract.yml, verify.yml, pnp_verify.yml, audit.yml

# 3. Generate Plasma Gate keypair (Ed25519)
npm run plasma:keygen # writes .agentos/plasma_gate/pubkey.pem + verify.wasm

# 4. Initialize GitBucket (empty index, ready for backfill)
npm run gitbucket:init

# 5. Seed problem registry with 3-5 founding NP-hard problems
npm run pnp:seed -- --problems founding_problems.json

# 6. Commit & push
git add . && git commit -m "genesis: agent-native repo, P/NP swarm initialized"
git remote add origin <your-sovereign-git-host>
git push -u origin main

# 7. Any agent clones → runs startup sequence → becomes solver node
```

---

## 8. Key Differences from Previous Design

| Aspect | Previous (Prolog) | **This Spec (P/NP Swarm)** |
|--------|-------------------|------------------------|
| Logic Layer | Prolog facts/rules | TypeScript/WASM (deterministic, portable) |
| Skills | Code modules | **Inverted memories** (sealed buckets + verifyFn) |
| Coordination | Central IDE (Council) | **None** — repo is the coordinator |
| Agent Role | Query memory | **Claim → Solve → Submit → Verify → Converge** |
| Progress Metric | Context size | **Universe Sum** (monotonic convergence) |
| Training | External | **In-repo**: every solution = new memory/skill |
| Trust | Prolog proofs | **Ed25519 + P-time verifyFn + Bifrost anchor** |

---

## 9. Next Concrete Step

**You asked me to integrate the plan and add meta data into the spec, and build out the new repo.** I'll now work on the directory layout and files.
