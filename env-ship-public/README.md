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
                    ┌─────────────────────────────────────────────────────────────┐
                    │                    IDENTITY PROVIDER FLOW                    │
                    └─────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │   SCRIPT     │───▶│  ENCAPSULATE │───▶│   ENVELOPE   │───▶│   VERIFY     │
    │  (deploy.sh) │    │  (base64 +   │    │  (JSON +     │    │  (hash +     │
    └──────────────┘    │   SHA-256)   │    │   payload)   │    │   signature) │
                        └──────────────┘    └──────────────┘    └──────────────┘
                                 │                   │                   │
                                 ▼                   ▼                   ▼
                        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                        │  PROOF REF   │    │  IDP CLAIM   │    │  EXECUTE     │
                        │ (lean://...) │    │ (OIDC/OAuth) │    │  (governed)  │
                        └──────────────┘    └──────────────┘    └──────────────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        ▼                  ▼                  ▼
                   ┌─────────┐        ┌─────────┐        ┌─────────┐
                   │ GitHub  │        │ Google  │        │Microsoft│
                   │  OAuth  │        │  OAuth  │        │  OAuth  │
                   └─────────┘        └─────────┘        └─────────┘
                        │                  │                  │
                        ▼                  ▼                  ▼
                   ┌─────────────────────────────────────────────────────┐
                   │              GENERIC OIDC (any provider)            │
                   └─────────────────────────────────────────────────────┘
```

```bash
script
  → base64 encode
  → SHA-256 hash
  → JSON envelope
  → optional Ed25519 signature
  → optional proof reference (Lean/Isabelle/WORM)
  → optional IdP claim (GitHub/Google/Microsoft/OIDC)
  → schema validation
  → verified extraction
  → governed execution
```

## Identity Provider Integration

env-ship supports OAuth2/OpenID Connect authentication with major providers:

| Provider | Auth URL | Token URL | UserInfo URL |
|----------|----------|-----------|--------------|
| GitHub   | `github.com/login/oauth/authorize` | `github.com/login/oauth/access_token` | `api.github.com/user` |
| Google   | `accounts.google.com/o/oauth2/v2/auth` | `oauth2.googleapis.com/token` | `googleapis.com/oauth2/v3/userinfo` |
| Microsoft| `login.microsoftonline.com/.../authorize` | `login.microsoftonline.com/.../token` | `graph.microsoft.com/oidc/userinfo` |
| GitLab   | `gitlab.com/oauth/authorize` | `gitlab.com/oauth/token` | `gitlab.com/oauth/userinfo` |
| Bitbucket| `bitbucket.org/site/oauth2/authorize` | `bitbucket.org/site/oauth2/access_token` | `api.bitbucket.org/2.0/user` |
| Generic OIDC | Custom | Custom | Custom |

### Configuration

```bash
# Required
export ENVELOPE_IDP_CLIENT_ID="your-client-id"
export ENVELOPE_IDP_CLIENT_SECRET="your-client-secret"

# Optional (defaults shown)
export ENVELOPE_IDP_PROVIDER="github"          # github|google|microsoft|gitlab|bitbucket|oidc
export ENVELOPE_IDP_REDIRECT_URI="http://localhost:8080/callback"
export ENVELOPE_IDP_SCOPES="openid email profile"

# For generic OIDC
export ENVELOPE_IDP_DISCOVERY_URL="https://your-idp.com/.well-known/openid-configuration"
export ENVELOPE_IDP_TOKEN_URL="https://your-idp.com/oauth/token"
export ENVELOPE_IDP_USERINFO_URL="https://your-idp.com/oidc/userinfo"
```

### Usage

```bash
# 1. Authenticate with IdP (opens browser)
env-ship idp-auth github
# Output: JSON claims with access_token, id_token, userinfo

# 2. Save claims to file
env-ship idp-auth github > idp_claims.json

# 3. Attach IdP claim to envelope
env-ship idp-claim deploy.envelope idp_claims.json

# 4. Verify envelope includes IdP claim
env-ship inspect deploy.envelope
# Shows: "idp_claim": { "provider": "github", "identity_id": "...", "email": "...", "name": "..." }
```

### IdP Claim Format (added to envelope)

```json
{
  "idp_claim": {
    "provider": "github",
    "identity_id": "12345678",
    "email": "user@example.com",
    "name": "User Name",
    "verified_at": "2026-07-05T12:34:56Z"
  }
}
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

# Run with IdP mock (requires local server)
# ENVELOPE_IDP_CLIENT_ID=test ENVELOPE_IDP_CLIENT_SECRET=test bash tests/test.sh
```

## CI/CD

GitHub Actions workflow validates on every push:
- Encapsulate → Verify → Extract → Diff
- Batch processing
- Schema validation
- IdP claim attachment (mocked)

## License

MIT
