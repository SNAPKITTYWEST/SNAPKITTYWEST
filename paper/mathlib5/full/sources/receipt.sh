#!/usr/bin/env bash
# ============================================================
# receipt.sh ? Generate Build Receipt & Seal
# Usage: ./scripts/receipt.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRIDGE_DIR="$(dirname "$SCRIPT_DIR")"
RECEIPT_DIR="$BRIDGE_DIR/build/receipt"

mkdir -p "$RECEIPT_DIR"

# Source hashes
echo "Hashing source files..."
find "$BRIDGE_DIR/C" "$BRIDGE_DIR/Lean" -type f -name '*.hs' -o -name '*.lean' -o -name '*.h' -o -name '*.c' | \
  sort | xargs sha256sum > "$RECEIPT_DIR/source.sha256"

# Binary hash
if [ -f "$BRIDGE_DIR/bridge_exec" ]; then
  sha256sum "$BRIDGE_DIR/bridge_exec" > "$RECEIPT_DIR/binary.sha256"
else
  echo "no binary" > "$RECEIPT_DIR/binary.sha256"
fi

# Manifest
cat > "$RECEIPT_DIR/manifest.json" << EOF
{
  "build_id": "receipt-$(date +%s)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_sha": "$(git -C "$BRIDGE_DIR" rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "lean_toolchain": "$(cat "$BRIDGE_DIR/lean-toolchain" 2>/dev/null || echo 'unknown')",
  "source_files": $(wc -l < "$RECEIPT_DIR/source.sha256"),
  "status": "BUILT"
}
EOF

# Seal
sha256sum "$RECEIPT_DIR/manifest.json" | cut -d' ' -f1 > "$RECEIPT_DIR/seal.sha256"

echo ""
echo "=== Build Receipt ==="
cat "$RECEIPT_DIR/manifest.json"
echo ""
echo "Seal: $(cat "$RECEIPT_DIR/seal.sha256")"
echo ""
echo "Files:"
ls -la "$RECEIPT_DIR/"
