# env-ship

Verifiable script envelope utility for governed execution.

[![Envelope Verification](https://github.com/your-org/env-ship/actions/workflows/envelope-verification.yml/badge.svg)](https://github.com/your-org/env-ship/actions/workflows/envelope-verification.yml)

## What it does

Wraps shell scripts in structured JSON envelopes with:
- SHA-256 payload hashes
- Optional Ed25519 signatures
- Proof references (Lean/Isabelle theorem IDs, WORM receipts)
- Schema validation
- Provenance metadata

## The goal

No raw script execution without a receipt.
No deployment without verification.
No action without provenance.

## Install

```bash
git clone https://github.com/your-org/env-ship.git
cd env-ship
chmod +x bin/*.sh
export PATH="$PWD/bin:$PATH"
```

Or install globally:

```bash
sudo cp bin/env-ship.sh /usr/local/bin/env-ship
sudo cp bin/validate-envelope.sh /usr/local/bin/validate-envelope
```

## Quick start

```bash
# Create a script
cat > deploy.sh <<'EOF'
#!/bin/bash
set -euo pipefail
echo "Deploying..."
EOF
chmod +x deploy.sh

# Wrap it in an envelope
env-ship encapsulate deploy.sh

# Verify the envelope
env-ship verify deploy.envelope

# Extract and run
env-ship extract deploy.envelope verified.sh
./verified.sh
```

## Commands

| Command | Description |
|---------|-------------|
| `encapsulate` | Create envelope from script |
| `verify` | Verify envelope integrity |
| `extract` | Extract script from envelope |
| `inspect` | Display envelope metadata |
| `link-proof` | Attach proof reference |
| `sign` | Add Ed25519 signature |
| `batch` | Process all .sh files |

## Examples

### Basic encapsulation

```bash
env-ship encapsulate deploy.sh
# Creates: deploy.envelope
```

### With proof reference

```bash
env-ship encapsulate deploy.sh deploy.envelope "lean://Theorems/Conduction.lean"
```

### With signing

```bash
# Generate keys
openssl genpkey -algorithm ED25519 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem

# Sign envelope
env-ship encapsulate deploy.sh deploy.envelope "" private.pem

# Verify with signature
env-ship verify deploy.envelope --verify-signature public.pem
```

### Batch processing

```bash
env-ship batch ./scripts ./proofs private.pem
```

## Configuration

Override defaults via environment variables:

```bash
export ENVELOPE_AUTHOR="your-name"
export ENVELOPE_INFRASTRUCTURE="your-infra"
export TRUST_PROTOCOL="your-protocol"
export ENVELOPE_AUDIT_SPEC="your-uuid"
```

## How it works

```
script
  → base64 encode
  → SHA-256 hash
  → JSON envelope
  → optional Ed25519 signature
  → optional proof reference
  → schema validation
  → verified extraction
  → governed execution
```

## Envelope format

```json
{
  "envelope_version": "1.0.0",
  "envelope_id": "env-a1b2c3d4e5f6g7h8-1720000000",
  "author": "your-name",
  "infrastructure": "your-infra",
  "trust_protocol": "your-protocol",
  "audit_spec": "uuid",
  "timestamp": "2026-07-05T00:00:00Z",
  "hash": "sha256-of-original-script",
  "proof_ref": "lean://Theorems/Proof.lean",
  "payload_b64": "base64-encoded-script",
  "signature": "optional-ed25519-signature"
}
```

## Dependencies

- `jq` - JSON processing
- `sha256sum` - Hash computation
- `base64` - Payload encoding
- `openssl` - Signature operations

Install on Ubuntu/Debian:

```bash
sudo apt-get install jq coreutils openssl
```

Install on macOS:

```bash
brew install jq
```

## Interactive Demo

```bash
# Run the full interactive walkthrough
./demo/interactive.sh

# Or quick one-liner
./demo/quick.sh
```

## Test Suite

```bash
# Run all tests
bash tests/test.sh
```

## CI/CD

GitHub Actions workflow validates on every push:
- Encapsulate → Verify → Extract → Diff
- Batch processing
- Schema validation

## License

MIT
