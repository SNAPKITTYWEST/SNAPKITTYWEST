---
name: snapkitty-bootstrap
description: Bootstrap sequence for snapkitty-agentos memory system with git integration
source: auto-skill
extracted_at: '2026-07-08T02:52:05.741Z'
---

# SnapKitty Agent OS Bootstrap

## Context
The `snapkitty-agentos` repo (separate from main SNAPKITTYWEST, not a submodule) contains the `.agentos/` runtime with GitBucket memory, P/NP swarm, and inverted skills.

## Bootstrap Sequence

```bash
cd snapkitty-agentos

# 1. Install dependencies
npm ci

# 2. Run verification pipeline (plasma gate + P/NP + skills + APL Fortran)
npm run verify:all

# 3. Load memories into local index
npm run context:bootstrap

# 4. Extract memory buckets from git history
node .agentos/gitbucket/extract.mjs

# 5. Generate Ed25519 Plasma Gate keypair
npm run plasma:keygen

# 6. Re-bootstrap with new bucket
npm run context:bootstrap
```

## What Gets Tracked vs Git-Ignored

**Tracked (committed to git):**
- `.agentos/gitbucket/index/manifest.json` — bucket registry
- `.agentos/plasma_gate/pubkey.pem` — Ed25519 public key
- `.agentos/skills/registry.json` — skill definitions
- `.agentos/pnp/problem_registry.json` — open problems

**Git-ignored (runtime artifacts):**
- `.agentos/gitbucket/buckets/*.json` — memory bucket data
- `.agentos/gitbucket/seals/*.seal.json` — SHA-256 seals
- `.agentos/plasma_gate/private_key.pem` — private key (never commit)
- `.agentos/memory/INDEX.md` — compiled context index

## Common Gotchas

### Git rebase hangs on vim editor
When pulling with rebase and hitting conflicts, the editor opens vim which can hang:
```bash
# BAD: git pull --rebase origin main  # may hang on vim
# GOOD: Use reset --soft instead
git fetch origin
git reset --soft origin/main
# Then selectively add only your changes
git add .agentos/plasma_gate/pubkey.pem
git commit -m "bootstrap: ..."
git push origin main
```

### Plasma Gate modes
- **bootstrap-no-key**: No pubkey.pem exists (initial state)
- **ed25519-public-key**: Pubkey exists, full Ed25519 verification active

After `npm run plasma:keygen`, verify:all switches to ed25519 mode.

### Memory bucket extraction
The `extract.mjs` script creates a bucket from the latest git commit:
- Reads `git rev-parse HEAD` and `git log -1 --pretty=%s`
- Generates bucket ID: `mem_${sha256(gitHash:summary).slice(0,12)}`
- Writes to `.agentos/gitbucket/buckets/` (git-ignored)
- Updates `.agentos/gitbucket/index/manifest.json` (tracked)

Run after each significant commit to build memory history.

## Verification Results

After bootstrap, `npm run verify:all` should show:
```
plasma gate verified (mode: ed25519-public-key)
P/NP: 3 problems verified (no_submissions initially)
Skills: 2 skills verified (ledger_validation_v3, borrow_chain_scheduler_v1)
APL Fortran: 10 files, 6 symbols verified
```

## Next Steps

After bootstrap, the system is ready for:
- `npm run swarm` — run P/NP swarm orchestrator
- `npm run pnp:claim` — claim an open problem
- `npm run context:compile` — compile context clips
