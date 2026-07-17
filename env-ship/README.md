# env-ship

Verifiable script envelope utility for governed agent execution.

## What it does

Wraps shell scripts in structured JSON envelopes with:
- SHA-256 payload hashes
- Optional Ed25519 signatures
- Proof references (Lean/Isabelle theorem IDs, WORM receipts)
- Schema validation
- WORM-compatible provenance metadata

## The goal

No raw script execution without a receipt.
No deployment without verification.
No agent action without provenance.

## Usage

```bash
# Basic encapsulation
./bin/env-ship.sh encapsulate scripts/deploy.sh

# With Lean proof reference and signing
./bin/env-ship.sh encapsulate scripts/deploy.sh deploy.envelope "lean://Sovereign/Theorems/Conduction.lean" keys/ed25519_private.pem

# Verify with signature
./bin/env-ship.sh verify deploy.envelope --verify-signature keys/ed25519_public.pem

# Extract after verification
./bin/env-ship.sh extract deploy.envelope deploy_verified.sh

# Batch process
./bin/env-ship.sh batch ./scripts ./proofs keys/ed25519_private.pem
```

## Commands

| Command | Description |
|---------|-------------|
| `encapsulate` | Create envelope from script |
| `verify` | Verify envelope integrity (hash + optional signature) |
| `extract` | Extract script from envelope (verifies by default) |
| `inspect` | Display envelope metadata as JSON |
| `link-proof` | Attach proof reference to envelope |
| `sign` | Add Ed25519 signature to envelope |
| `batch` | Process all .sh files in directory |

## Architecture

```
script
  → envelope
  → hash
  → optional signature
  → proof reference
  → schema validation
  → verified extraction
  → agent execution
  → audit trail
```

## Directory structure

```
env-ship/
├── bin/
│   ├── env-ship.sh           # Main CLI utility
│   └── validate-envelope.sh  # Schema validator
├── lib/
│   └── agent-envelope-lib.sh # Agent library
├── schemas/
│   └── env-ship.schema.json  # JSON Schema
├── keys/                     # Ed25519 key pairs
├── scripts/                  # Source scripts (.sh)
├── proofs/                   # Lean/Isabelle proof artifacts
├── envelopes/                # Generated envelopes
└── exec/                     # Verified extraction for deployment
```

## Key generation

```bash
mkdir -p keys
openssl genpkey -algorithm ED25519 -out keys/ed25519_private.pem
openssl pkey -in keys/ed25519_private.pem -pubout -out keys/ed25519_public.pem
chmod 600 keys/ed25519_private.pem
```

## Version

v1.0.0 — SnapKitty Sovereign Transformer v2026
