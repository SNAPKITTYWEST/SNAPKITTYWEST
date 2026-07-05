#!/usr/bin/env bash
# agent-envelope-lib: Library for agents to consume/produce envelopes
# Source this in agent scripts: source /path/to/agent-envelope-lib.sh

# ──────────────────────────────────────────────
# Agent: Receive envelope, verify, execute
# ──────────────────────────────────────────────
agent_receive_and_execute() {
    local envelope_json="${1:-}"
    local work_dir="${2:-/tmp/agent-work}"

    mkdir -p "$work_dir"
    local envelope_file="$work_dir/incoming.envelope"
    printf '%s\n' "$envelope_json" > "$envelope_file"

    # Validate schema
    validate-envelope.sh "$envelope_file" || {
        agent_send_response "ERROR" "Schema validation failed"
        return 1
    }

    # Verify integrity
    env-ship verify "$envelope_file" --verify-signature "$AGENT_TRUSTED_PUB_KEY" || {
        agent_send_response "ERROR" "Envelope verification failed"
        return 2
    }

    # Extract
    local script_file="$work_dir/script.sh"
    env-ship extract "$envelope_file" "$script_file" true

    # Execute with provenance logging
    local exec_log="$work_dir/execution.log"
    {
        echo "=== EXECUTION START: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
        echo "Envelope: $(jq -r .envelope_id "$envelope_file")"
        echo "Author: $(jq -r .author "$envelope_file")"
        echo "Hash: $(jq -r .hash "$envelope_file")"
        echo "Proof: $(jq -r .proof_ref "$envelope_file")"
        echo "--- OUTPUT ---"
        bash "$script_file" 2>&1
        local exit_code=$?
        echo "--- EXIT CODE: $exit_code ---"
        echo "=== EXECUTION END: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
    } | tee "$exec_log"

    # Return result envelope
    agent_send_response "RESULT" "$exec_log" "$exit_code"
}

# ──────────────────────────────────────────────
# Agent: Create envelope from script content
# ──────────────────────────────────────────────
agent_create_envelope() {
    local script_content="${1:-}"
    local proof_ref="${2:-}"
    local output_file="${3:-}"

    [[ -z "$script_content" ]] && { echo "ERROR: No script content"; return 1; }

    local temp_script
    temp_script=$(mktemp --suffix=.sh)
    printf '%s\n' "$script_content" > "$temp_script"
    chmod +x "$temp_script"

    env-ship encapsulate "$temp_script" "$output_file" "$proof_ref" "$AGENT_SIGN_KEY"
    rm -f "$temp_script"
}

# ──────────────────────────────────────────────
# Agent: Send response (envelope-wrapped)
# ──────────────────────────────────────────────
agent_send_response() {
    local status="${1:-}"
    local payload="${2:-}"
    local exit_code="${3:-0}"

    local response
    response=$(jq -n \
        --arg status "$status" \
        --arg payload "$payload" \
        --arg exit_code "$exit_code" \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg agent_id "$AGENT_ID" \
        '{status: $status, payload: $payload, exit_code: $exit_code, timestamp: $timestamp, agent_id: $agent_id}')

    local temp_resp
    temp_resp=$(mktemp --suffix=.json)
    printf '%s\n' "$response" > "$temp_resp"

    jq -n \
        --arg version "1.0.0" \
        --arg id "resp-$(date +%s)-$$" \
        --arg author "$AGENT_ID" \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg hash "$(sha256sum "$temp_resp" | awk '{print $1}')" \
        --arg payload "$(cat "$temp_resp")" \
        '{
            envelope_version: $version,
            envelope_id: $id,
            author: $author,
            infrastructure: "Local_First_Sovereign_OS",
            trust_protocol: "Bifrost_WORM_Chain",
            audit_spec: "4b565498-9afc-4782-af4a-c6b11a5d0058",
            fiscal_governance: "Codestorm_Hub_Federated",
            timestamp: $timestamp,
            hash: $hash,
            proof_ref: null,
            payload: $payload
        }'

    rm -f "$temp_resp"
}
