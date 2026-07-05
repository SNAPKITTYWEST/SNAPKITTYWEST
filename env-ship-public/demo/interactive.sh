#!/bin/bash
# env-ship interactive demo — walks user through the full workflow

set -euo pipefail

SCRIPT="bin/env-ship.sh"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${BLUE}▶${NC} $1"; }
info() { echo -e "  ${YELLOW}→${NC} $1"; }
success() { echo -e "  ${GREEN}✓${NC} $1"; }
pause() { read -p "  Press Enter to continue..."; }

clear
echo "========================================="
echo "  env-ship interactive demo"
echo "========================================="
echo ""
echo "This demo walks you through:"
echo "  1. Creating a script"
echo "  2. Wrapping it in an envelope"
echo "  3. Verifying the envelope"
echo "  4. Extracting and running the script"
echo "  5. Adding a proof reference"
echo "  6. Signing with Ed25519"
echo ""
pause

# ---- Step 1: Create a script ----
step "Step 1: Create a deploy script"
cat > demo_deploy.sh <<'EOF'
#!/bin/bash
set -euo pipefail

echo "========================================"
echo "  Deploying Application v1.0.0"
echo "========================================"
echo ""
echo "Target: production"
echo "Region: us-east-1"
echo ""

# Simulate deployment steps
echo "[1/4] Pulling container image..."
sleep 0.5
echo "[2/4] Running database migrations..."
sleep 0.5
echo "[3/4] Starting services..."
sleep 0.5
echo "[4/4] Health check..."
sleep 0.5
echo ""
echo "✓ Deployment complete!"
EOF
chmod +x demo_deploy.sh
cat demo_deploy.sh
pause

# ---- Step 2: Encapsulate ----
step "Step 2: Encapsulate — wrap in verifiable envelope"
info "Running: ./bin/env-ship.sh encapsulate demo_deploy.sh"
./bin/env-ship.sh encapsulate demo_deploy.sh
success "Created demo_deploy.envelope"
info "Envelope contents:"
jq . demo_deploy.envelope
pause

# ---- Step 3: Verify ----
step "Step 3: Verify — check integrity"
info "Running: ./bin/env-ship.sh verify demo_deploy.envelope"
./bin/env-ship.sh verify demo_deploy.envelope
success "Envelope verified — hash matches, structure valid"
pause

# ---- Step 4: Extract & Run ----
step "Step 4: Extract and run the verified script"
info "Running: ./bin/env-ship.sh extract demo_deploy.envelope verified_deploy.sh"
./bin/env-ship.sh extract demo_deploy.envelope verified_deploy.sh
success "Extracted to verified_deploy.sh"
info "Running the verified script:"
echo ""
./verified_deploy.sh
pause

# ---- Step 5: Add proof reference ----
step "Step 5: Add proof reference (Lean theorem)"
info "Running: ./bin/env-ship.sh link-proof demo_deploy.envelope \"lean://Theorems/DeploySafety.lean\""
./bin/env-ship.sh link-proof demo_deploy.envelope "lean://Theorems/DeploySafety.lean"
success "Proof reference attached"
info "Updated envelope:"
jq . demo_deploy.envelope
pause

# ---- Step 6: Sign with Ed25519 ----
step "Step 6: Sign with Ed25519 (optional)"
info "Generating Ed25519 keypair..."
openssl genpkey -algorithm ED25519 -out demo_private.pem 2>/dev/null
openssl pkey -in demo_private.pem -pubout -out demo_public.pem 2>/dev/null
success "Keys generated: demo_private.pem, demo_public.pem"

info "Re-encapsulating with signature..."
./bin/env-ship.sh encapsulate demo_deploy.sh demo_deploy_signed.envelope "" demo_private.pem
success "Signed envelope created"

info "Verifying signature with public key..."
./bin/env-ship.sh verify demo_deploy_signed.envelope --verify-signature demo_public.pem
success "Signature verified!"
pause

# ---- Cleanup ----
step "Demo complete!"
echo ""
echo "Files created:"
ls -la *.envelope *.sh *.pem 2>/dev/null | grep -v "^d"
echo ""
info "Cleaning up demo files..."
rm -f demo_deploy.sh demo_deploy.envelope demo_deploy_signed.envelope verified_deploy.sh demo_private.pem demo_public.pem
success "Cleaned up"
echo ""
echo "========================================="
echo "  Try it with your own scripts!"
echo "========================================="