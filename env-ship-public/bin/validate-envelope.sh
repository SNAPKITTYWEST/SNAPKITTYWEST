#!/usr/bin/env bash
# validate-envelope: JSON Schema validation for env-ship envelopes

set -euo pipefail

validate() {
    local envelope_file="${1:-}"
    local schema_file="${2:-$(dirname "$0")/../schemas/env-ship.schema.json}"

    [[ -z "$envelope_file" ]] && { echo "Usage: validate-envelope <envelope> [schema]"; exit 1; }
    [[ -f "$envelope_file" ]] || { echo "ERROR: Envelope not found: $envelope_file"; exit 1; }
    [[ -f "$schema_file" ]] || { echo "ERROR: Schema not found: $schema_file"; exit 1; }

    if command -v python3 >/dev/null && python3 -c "import jsonschema" 2>/dev/null; then
        python3 -c "
import json, jsonschema
with open('$schema_file') as f: schema = json.load(f)
with open('$envelope_file') as f: data = json.load(f)
jsonschema.validate(data, schema)
print('Schema validation passed')
"
    else
        jq -e '
            has("envelope_version") and
            has("envelope_id") and
            has("author") and
            has("hash") and
            has("payload_b64")
        ' "$envelope_file" >/dev/null && echo "Basic structure validated" || {
            echo "ERROR: Schema validation failed"
            exit 1
        }
    fi
}

validate "$@"
