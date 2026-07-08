---
name: deterministic-envelope
description: Pattern for cryptographic envelope sealing with deterministic verification
source: auto-skill
extracted_at: '2026-07-08T02:52:05.741Z'
---

# Deterministic Envelope Sealing

## Problem
When sealing data with cryptographic hashes (SHA-256), the seal must be **reproducible** from the same input. If the seal includes non-deterministic elements (timestamps, random values), verification will fail because the seal changes on every computation.

## Anti-Pattern: Non-Deterministic Seal

```javascript
// BAD: Seal includes Date.now() which changes every call
generateEnvelope(data) {
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
  return `env-${hash.slice(0, 16)}-${Date.now()}`;  // ❌ Timestamp breaks verification
}
```

**Why it fails:**
1. Seal data at time T1: `env-abc123-1234567890`
2. Verify at time T2: `env-abc123-1234567891` (different timestamp)
3. Verification fails: `env-abc123-1234567890 !== env-abc123-1234567891`

## Correct Pattern: Pure Data-Driven Seal

```javascript
// GOOD: Seal is purely a function of the data
generateEnvelope(data) {
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
  return `env-${hash.slice(0, 32)}`;  // ✅ Deterministic
}

// Store timestamp in the record, but include it in the seal data
submitSolution(problemId, solution) {
  const solvedAt = new Date().toISOString();
  const sealData = { problemId, solution, solvedAt };  // ✅ Timestamp is part of data
  const seal = this.generateEnvelope(sealData);
  
  return {
    problemId,
    solution,
    envelope_seal: seal,
    solvedAt,  // Stored for verification
    verified: false
  };
}

// Verification re-computes seal from stored data
verifyAll() {
  for (const sol of this.solutions) {
    const sealData = {
      problemId: sol.problemId,
      solution: sol.solution,
      solvedAt: sol.solvedAt  // ✅ Use stored timestamp
    };
    const expected = this.generateEnvelope(sealData);
    sol.verified = (expected === sol.envelope_seal);
  }
}
```

## Key Principles

1. **Seal = f(data)** — The seal must be a pure function of the input data
2. **Store metadata separately** — Timestamps, agent IDs, etc. go in the record, not the seal string
3. **Include metadata in hash input** — If you need timestamps for ordering, include them in the JSON that gets hashed
4. **Verify with stored data** — Re-compute the seal from the stored record, not from fresh computation

## Application: P/NP Swarm

In the SnapKitty math engine:
- **Problem**: Seal solutions to git buckets with SHA-256 envelopes
- **Solution**: Include `solvedAt` in the seal data, store it in the solution record
- **Verification**: Re-compute seal from stored `{problemId, solution, solvedAt}`

Result: 6/6 solutions verified with deterministic envelopes.

## When to Use

- Cryptographic commitment schemes
- Immutable audit logs
- Git bucket sealing
- Solution verification in P/NP swarm
- Any scenario where seal must be reproducible from stored data

## When NOT to Use

- When you need unique seals per computation (use UUIDs instead)
- When the seal is a one-time proof (non-reusable)
- When you're generating nonces or challenges
