#!/bin/bash
# Quick one-liner demo for README

set -euo pipefail

echo "=== env-ship quick demo ==="
echo ""

cat > /tmp/hello.sh <<'EOF'
#!/bin/bash
echo "Hello from verified script!"
echo "Payload hash: $(sha256sum /tmp/hello.sh | cut -d' ' -f1)"
EOF

chmod +x /tmp/hello.sh

echo "1. Encapsulate:"
./bin/env-ship.sh encapsulate /tmp/hello.sh /tmp/hello.envelope

echo ""
echo "2. Verify:"
./bin/env-ship.sh verify /tmp/hello.envelope

echo ""
echo "3. Extract & run:"
./bin/env-ship.sh extract /tmp/hello.envelope /tmp/hello_verified.sh
/tmp/hello_verified.sh

echo ""
echo "✓ Demo complete!"