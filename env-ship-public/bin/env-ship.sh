#!/usr/bin/env bash
# env-ship: Verifiable script envelope utility
# Part of: Sovereign Transformer
# Trust Protocol: WORM_Chain
# License: MIT

set -euo pipefail

# ──────────────────────────────────────────────
# Configuration (override via environment)
# ──────────────────────────────────────────────
readonly ENVELOPE_VERSION="1.0.0"
readonly ENVELOPE_EXT=".envelope"
readonly AUTHOR_ID="${ENVELOPE_AUTHOR:-$(whoami)}"
readonly INFRASTRUCTURE="${ENVELOPE_INFRASTRUCTURE:-Local_First}"
readonly TRUST_PROTOCOL="${TRUST_PROTOCOL:-WORM_Chain}"
readonly AUDIT_SPEC="${ENVELOPE_AUDIT_SPEC:-$(uuidgen 2>/dev/null || echo "00000000-0000-0000-0000-000000000000")}"

# Dependencies check
for cmd in jq sha256sum date base64 openssl; do
    command -v "$cmd" >/dev/null || {
        echo "ERROR: Required dependency '$cmd' not found" >&2
        exit 1
    }
done

# ──────────────────────────────────────────────
# Core Functions
# ──────────────────────────────────────────────

generate_envelope_id() {
    local hash="$1"
    echo "env-${hash:0:16}-$(date -u +%s)"
}

compute_hash() {
    local file="$1"
    sha256sum "$file" | awk '{print $1}'
}

get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# ──────────────────────────────────────────────
# Encapsulate: Script → Envelope
# ──────────────────────────────────────────────

encapsulate() {
    local script_path="${1:-}"
    local output_file="${2:-}"
    local proof_ref="${3:-}"
    local sign_key="${4:-}"

    [[ -z "$script_path" ]] && { usage; exit 1; }
    [[ -f "$script_path" ]] || { echo "ERROR: Script not found: $script_path" >&2; exit 1; }

    local hash
    hash=$(compute_hash "$script_path")
    local timestamp
    timestamp=$(get_timestamp)
    local envelope_id
    envelope_id=$(generate_envelope_id "$hash")

    [[ -z "$output_file" ]] && output_file="${script_path%.sh}${ENVELOPE_EXT}"

    # Base64 encode payload for exact byte preservation
    local payload_b64
    payload_b64=$(base64 -w0 "$script_path")

    # Build envelope JSON
    local envelope
    envelope=$(jq -n \
        --arg version "$ENVELOPE_VERSION" \
        --arg id "$envelope_id" \
        --arg author "$AUTHOR_ID" \
        --arg infrastructure "$INFRASTRUCTURE" \
        --arg trust_protocol "$TRUST_PROTOCOL" \
        --arg audit_spec "$AUDIT_SPEC" \
        --arg timestamp "$timestamp" \
        --arg hash "$hash" \
        --arg payload_b64 "$payload_b64" \
        --arg proof_ref "$proof_ref" \
        '{
            envelope_version: $version,
            envelope_id: $id,
            author: $author,
            infrastructure: $infrastructure,
            trust_protocol: $trust_protocol,
            audit_spec: $audit_spec,
            timestamp: $timestamp,
            hash: $hash,
            proof_ref: $proof_ref,
            payload_b64: $payload_b64
        }')

    # Sign if key provided
    if [[ -n "$sign_key" && -f "$sign_key" ]]; then
        local canonical
        canonical=$(printf '%s' "$envelope" | jq -cS '.')
        local signature
        signature=$(printf '%s' "$canonical" | openssl dgst -sha256 -sign "$sign_key" | base64 -w0)
        envelope=$(printf '%s' "$envelope" | jq --arg sig "$signature" '. + {signature: $sig}')
    fi

    printf '%s\n' "$envelope" > "$output_file"
    echo "Envelope created: $output_file"
    echo "Envelope ID: $envelope_id"
    echo "SHA-256: $hash"
}

# ──────────────────────────────────────────────
# Verify: Envelope → Integrity Check
# ──────────────────────────────────────────────

verify() {
    local envelope_file="${1:-}"
    local verify_signature="${2:-false}"
    local verify_key="${3:-}"

    [[ -z "$envelope_file" ]] && { usage; exit 1; }
    [[ -f "$envelope_file" ]] || { echo "ERROR: Envelope not found: $envelope_file" >&2; exit 1; }

    local envelope
    envelope=$(cat "$envelope_file")

    local hash payload_b64 proof_ref signature author timestamp
    hash=$(printf '%s' "$envelope" | jq -r '.hash')
    payload_b64=$(printf '%s' "$envelope" | jq -r '.payload_b64')
    proof_ref=$(printf '%s' "$envelope" | jq -r '.proof_ref // ""')
    signature=$(printf '%s' "$envelope" | jq -r '.signature // ""')
    author=$(printf '%s' "$envelope" | jq -r '.author')
    timestamp=$(printf '%s' "$envelope" | jq -r '.timestamp')

    # Verify hash
    local computed_hash
    computed_hash=$(printf '%s' "$payload_b64" | base64 -d | sha256sum | awk '{print $1}')

    if [[ "$computed_hash" != "$hash" ]]; then
        echo "VERIFICATION FAILED: Hash mismatch"
        echo " Expected: $hash"
        echo " Computed: $computed_hash"
        return 1
    fi

    echo "Hash verified: $hash"

    # Verify signature if requested
    if [[ "$verify_signature" == "true" ]]; then
        [[ -z "$signature" ]] && { echo "VERIFICATION FAILED: No signature present"; return 1; }
        [[ -z "$verify_key" ]] && { echo "VERIFICATION FAILED: Public key required"; return 1; }
        [[ -f "$verify_key" ]] || { echo "VERIFICATION FAILED: Public key not found: $verify_key"; return 1; }

        local canonical
        canonical=$(printf '%s' "$envelope" | jq -cS 'del(.signature)')

        if printf '%s' "$canonical" | openssl dgst -sha256 -verify "$verify_key" -signature <(echo "$signature" | base64 -d) >/dev/null 2>&1; then
            echo "Signature verified"
        else
            echo "VERIFICATION FAILED: Signature invalid"
            return 1
        fi
    fi

    if [[ -n "$proof_ref" && "$proof_ref" != "null" ]]; then
        echo "Proof reference attached: $proof_ref"
    fi

    echo "Envelope verified successfully"
    echo " Author: $author"
    echo " Timestamp: $timestamp"
    return 0
}

# ──────────────────────────────────────────────
# Extract: Envelope → Script
# ──────────────────────────────────────────────

extract() {
    local envelope_file="${1:-}"
    local output_file="${2:-}"
    local force_verify="${3:-true}"

    [[ -z "$envelope_file" ]] && { usage; exit 1; }

    if [[ "$force_verify" == "true" ]]; then
        verify "$envelope_file" || { echo "ERROR: Verification failed, refusing to extract" >&2; exit 1; }
    fi

    local payload_b64
    payload_b64=$(jq -r '.payload_b64' "$envelope_file")

    [[ -z "$output_file" ]] && output_file="$(basename "$envelope_file" $ENVELOPE_EXT).sh"

    printf '%s' "$payload_b64" | base64 -d > "$output_file"
    chmod +x "$output_file"
    echo "Extracted script: $output_file"
}

# ──────────────────────────────────────────────
# Inspect: Show envelope metadata
# ──────────────────────────────────────────────

inspect() {
    local envelope_file="${1:-}"
    [[ -z "$envelope_file" ]] && { usage; exit 1; }
    [[ -f "$envelope_file" ]] || { echo "ERROR: Envelope not found: $envelope_file" >&2; exit 1; }
    jq '.' "$envelope_file"
}

# ──────────────────────────────────────────────
# Link Proof: Attach proof reference
# ──────────────────────────────────────────────

link_proof() {
    local envelope_file="${1:-}"
    local proof_ref="${2:-}"

    [[ -z "$envelope_file" || -z "$proof_ref" ]] && { usage; exit 1; }
    [[ -f "$envelope_file" ]] || { echo "ERROR: Envelope not found: $envelope_file" >&2; exit 1; }

    local updated
    updated=$(jq --arg ref "$proof_ref" '.proof_ref = $ref' "$envelope_file")
    printf '%s\n' "$updated" > "$envelope_file"
    echo "Proof reference linked: $proof_ref"
}

# ──────────────────────────────────────────────
# Sign: Add Ed25519 signature
# ──────────────────────────────────────────────

sign() {
    local envelope_file="${1:-}"
    local sign_key="${2:-}"

    [[ -z "$envelope_file" || -z "$sign_key" ]] && { usage; exit 1; }
    [[ -f "$envelope_file" ]] || { echo "ERROR: Envelope not found: $envelope_file" >&2; exit 1; }
    [[ -f "$sign_key" ]] || { echo "ERROR: Sign key not found: $sign_key" >&2; exit 1; }

    local envelope
    envelope=$(cat "$envelope_file")
    envelope=$(printf '%s' "$envelope" | jq 'del(.signature)')

    local canonical
    canonical=$(printf '%s' "$envelope" | jq -cS '.')

    local signature
    signature=$(printf '%s' "$canonical" | openssl dgst -sha256 -sign "$sign_key" | base64 -w0)

    envelope=$(printf '%s' "$envelope" | jq --arg sig "$signature" '. + {signature: $sig}')
    printf '%s\n' "$envelope" > "$envelope_file"
    echo "Envelope signed: $envelope_file"
}

# ──────────────────────────────────────────────
# Batch: Process multiple scripts
# ──────────────────────────────────────────────

batch_encapsulate() {
    local dir="${1:-.}"
    local proof_dir="${2:-}"
    local sign_key="${3:-}"

    [[ -d "$dir" ]] || { echo "ERROR: Directory not found: $dir" >&2; exit 1; }

    local count=0
    for script in "$dir"/*.sh; do
        [[ -f "$script" ]] || continue

        local proof_ref=""
        if [[ -n "$proof_dir" && -d "$proof_dir" ]]; then
            local base_name
            base_name=$(basename "$script" .sh)
            if [[ -f "$proof_dir/$base_name.lean" || -f "$proof_dir/$base_name.thy" ]]; then
                proof_ref="proof://$proof_dir/$base_name"
            fi
        fi

        encapsulate "$script" "" "$proof_ref" "$sign_key"
        count=$((count + 1))
    done

    echo "Processed $count scripts"
}

# ──────────────────────────────────────────────
# Usage
# ──────────────────────────────────────────────

usage() {
    cat <<EOF
env-ship v$ENVELOPE_VERSION — Verifiable Script Envelope Utility

USAGE:
    env-ship <command> [arguments]

COMMANDS:
    encapsulate <script.sh> [output.envelope] [proof_ref] [sign_key]
        Create envelope from script.

    verify <envelope> [--verify-signature] [public_key]
        Verify envelope integrity.

    extract <envelope> [output.sh] [--no-verify]
        Extract script from envelope.

    inspect <envelope>
        Display envelope metadata.

    link-proof <envelope> <proof_ref>
        Attach proof reference.

    sign <envelope> <private_key>
        Add Ed25519 signature.

    batch <directory> [proof_directory] [sign_key]
        Process all .sh files.

EXAMPLES:
    env-ship encapsulate deploy.sh
    env-ship verify deploy.envelope
    env-ship extract deploy.envelope

ENVIRONMENT:
    ENVELOPE_AUTHOR       Override author (default: whoami)
    ENVELOPE_INFRASTRUCTURE Override infrastructure
    TRUST_PROTOCOL        Override trust protocol
    ENVELOPE_AUDIT_SPEC   Override audit spec UUID
EOF
}

# ──────────────────────────────────────────────
# Main Dispatch
# ──────────────────────────────────────────────

main() {
    local cmd="${1:-}"
    shift || { usage; exit 3; }

    case "$cmd" in
        encapsulate) encapsulate "$@" ;;
        verify)
            local envelope=""
            local verify_sig=false
            local pub_key=""

            while [[ $# -gt 0 ]]; do
                case "$1" in
                    --verify-signature) verify_sig=true ;;
                    *)
                        if [[ -z "$envelope" ]]; then
                            envelope="$1"
                        else
                            pub_key="$1"
                        fi
                        ;;
                esac
                shift
            done

            verify "$envelope" "$verify_sig" "$pub_key"
            ;;
        extract)
            local force_verify=true
            local envelope=""
            local output=""
            while [[ $# -gt 0 ]]; do
                case "$1" in
                    --no-verify) force_verify=false ;;
                    *) [[ -z "$envelope" ]] && envelope="$1" || output="$1" ;;
                esac
                shift
            done
            extract "$envelope" "$output" "$force_verify"
            ;;
        inspect) inspect "$@" ;;
        link-proof) link_proof "$@" ;;
        sign) sign "$@" ;;
        batch) batch_encapsulate "$@" ;;
        *) usage; exit 3 ;;
    esac
}

main "$@"
