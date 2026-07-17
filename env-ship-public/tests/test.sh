#!/bin/bash
# env-ship test suite — full integration tests

set -euo pipefail

TESTS=0
PASSED=0
FAILED=0
TMPDIR=$(mktemp -d)

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

pass() { TESTS=$((TESTS + 1)); PASSED=$((PASSED + 1)); echo "  ✓ $1"; }
fail() { TESTS=$((TESTS + 1)); FAILED=$((FAILED + 1)); echo "  ✗ $1"; }

assert_file_exists() { [[ -f "$1" ]] && pass "$2" || fail "$2 — file not found: $1"; }
assert_contains() { grep -q "$2" "$1" 2>/dev/null && pass "$3" || fail "$3 — pattern not found: $2"; }
assert_json_field() {
    local val=$(jq -r ".$2" "$1" 2>/dev/null)
    [[ "$val" == "$3" ]] && pass "$4" || fail "$4 — expected '$3', got '$val'"
}

echo "========================================="
echo "  env-ship test suite"
echo "========================================="
echo ""

SCRIPT="bin/env-ship.sh"

# ---- Test 1: Encapsulate ----
echo "[1] encapsulate"
cat > "$TMPDIR/test.sh" <<'EOF'
#!/bin/bash
set -euo pipefail
echo "hello world"
EOF
chmod +x "$TMPDIR/test.sh"

bash "$SCRIPT" encapsulate "$TMPDIR/test.sh" "$TMPDIR/test.envelope"
assert_file_exists "$TMPDIR/test.envelope" "creates envelope file"
assert_json_field "$TMPDIR/test.envelope" "envelope_version" "1.0.0" "envelope_version is 1.0.0"
assert_json_field "$TMPDIR/test.envelope" "author" "env-ship-test" "author field set"
assert_contains "$TMPDIR/test.envelope" "payload_b64" "contains payload_b64"
echo ""

# ---- Test 2: Verify ----
echo "[2] verify"
bash "$SCRIPT" verify "$TMPDIR/test.envelope" > /dev/null 2>&1 && pass "verify passes" || fail "verify fails"
echo ""

# ---- Test 3: Verify fails on tampered ----
echo "[3] verify detects tampering"
cp "$TMPDIR/test.envelope" "$TMPDIR/tampered.envelope"
jq '.hash = "0000000000000000000000000000000000000000000000000000000000000000"' "$TMPDIR/tampered.envelope" > "$TMPDIR/tampered2.envelope"
bash "$SCRIPT" verify "$TMPDIR/tampered2.envelope" > /dev/null 2>&1 && fail "should reject tampered" || pass "rejects tampered envelope"
echo ""

# ---- Test 4: Extract ----
echo "[4] extract"
bash "$SCRIPT" extract "$TMPDIR/test.envelope" "$TMPDIR/extracted.sh" --no-verify
assert_file_exists "$TMPDIR/extracted.sh" "extracts script"
diff "$TMPDIR/test.sh" "$TMPDIR/extracted.sh" > /dev/null 2>&1 && pass "extracted matches original" || fail "extracted differs from original"
echo ""

# ---- Test 5: Inspect ----
echo "[5] inspect"
OUTPUT=$(bash "$SCRIPT" inspect "$TMPDIR/test.envelope" 2>&1)
echo "$OUTPUT" | grep -q "Envelope ID" && pass "inspect shows envelope_id" || fail "inspect missing envelope_id"
echo "$OUTPUT" | grep -q "Author" && pass "inspect shows author" || fail "inspect missing author"
echo "$OUTPUT" | grep -q "Hash" && pass "inspect shows hash" || fail "inspect missing hash"
echo ""

# ---- Test 6: Payload is valid base64 ----
echo "[6] payload_b64 validity"
PAYLOAD=$(jq -r '.payload_b64' "$TMPDIR/test.envelope")
echo "$PAYLOAD" | base64 -d > /dev/null 2>&1 && pass "payload_b64 decodes" || fail "payload_b64 invalid base64"
echo "$PAYLOAD" | base64 -d | diff - "$TMPDIR/test.sh" > /dev/null 2>&1 && pass "decoded payload matches original" || fail "decoded payload differs"
echo ""

# ---- Test 7: Hash matches payload ----
echo "[7] hash integrity"
HASH=$(jq -r '.hash' "$TMPDIR/test.envelope")
ACTUAL=$(sha256sum "$TMPDIR/test.sh" | awk '{print $1}')
[[ "$HASH" == "$ACTUAL" ]] && pass "hash matches sha256sum" || fail "hash mismatch: expected $ACTUAL, got $HASH"
echo ""

# ---- Test 8: link-proof ----
echo "[8] link-proof"
bash "$SCRIPT" link-proof "$TMPDIR/test.envelope" "lean://Theorems/Test.lean"
jq -r '.proof_ref' "$TMPDIR/test.envelope" | grep -q "lean://" && pass "proof_ref attached" || fail "proof_ref missing"
echo ""

# ---- Test 9: Batch ----
echo "[9] batch"
mkdir -p "$TMPDIR/scripts"
for i in 1 2 3; do
    cat > "$TMPDIR/scripts/script$i.sh" <<INNER
#!/bin/bash
echo "script $i"
INNER
done
bash "$SCRIPT" batch "$TMPDIR/scripts" > /dev/null 2>&1
ENVELOPES=$(ls "$TMPDIR/scripts"/*.envelope 2>/dev/null | wc -l)
[[ "$ENVELOPES" -eq 3 ]] && pass "batch creates 3 envelopes" || fail "batch created $ENVELOPES envelopes"
echo ""

# ---- Test 10: Empty payload rejected ----
echo "[10] reject empty payload"
touch "$TMPDIR/empty.sh"
bash "$SCRIPT" encapsulate "$TMPDIR/empty.sh" "$TMPDIR/empty.envelope" > /dev/null 2>&1 && fail "should reject empty script" || pass "rejects empty script"
echo ""

# ---- Summary ----
echo "========================================="
echo "  $PASSED/$TESTS passed, $FAILED failed"
echo "========================================="
[[ $FAILED -eq 0 ]] && exit 0 || exit 1
