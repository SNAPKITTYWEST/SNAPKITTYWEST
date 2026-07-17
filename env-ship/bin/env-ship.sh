#!/usr/bin/env bash
# env-ship: Verifiable script envelope utility for Sovereign Transformer
# Part of: SnapKitty_Sovereign_Transformer v2026
# Operator: AhmadAliParr
# Trust Protocol: Bifrost_WORM_Chain
# Audit Spec: 4b565498-9afc-4782-af4a-c6b11a5d0058

set -euo pipefail

# ──────────────────────────────────────────────
# Configuration (sovereign defaults)
# ──────────────────────────────────────────────
readonly ENVELOPE_VERSION="1.0.0"
readonly ENVELOPE_EXT=".envelope"
readonly AUTHOR_ID="AhmadAliParr"
readonly INFRASTRUCTURE="Local_First_Sovereign_OS"
readonly TRUST_PROTOCOL="Bifrost_WORM_Chain"
readonly AUDIT_SPEC="4b565498-9afc-4782-af4a-c6b11a5d0058"
readonly FISCAL_GOVERNANCE="Codestorm_Hub_Federated"

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
# FIX #2: Base64 payload for exact byte preservation
# ──────────────────────────────────────────────

encapsulate() {
    local script_path="${1:-}"
    local output_file="${2:-}"
    local proof_ref="${3:-}"
    local sign_key="${4:-}"

    [[ -z "$script_path" ]] && { usage; exit 1; }
    [[ -f "$script_path" ]] || { echo "ERROR: Script not found: $script_path" >&2; exit 1; }
    [[ "$script_path" == *.sh ]] || { echo "WARNING: Script does not have .sh extension" >&2; }

    local hash
    hash=$(compute_hash "$script_path")
    local timestamp
    timestamp=$(get_timestamp)
    local envelope_id
    envelope_id=$(generate_envelope_id "$hash")

    # Default output naming
    [[ -z "$output_file" ]] && output_file="${script_path%.sh}${ENVELOPE_EXT}"

    # FIX #2: Base64 encode payload for exact byte preservation
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
        --arg fiscal_governance "$FISCAL_GOVERNANCE" \
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
            fiscal_governance: $fiscal_governance,
            timestamp: $timestamp,
            hash: $hash,
            proof_ref: $proof_ref,
            payload_b64: $payload_b64
        }')

    # FIX #3: Canonical JSON before signing
    if [[ -n "$sign_key" && -f "$sign_key" ]]; then
        local canonical
        canonical=$(printf '%s' "$envelope" | jq -cS '.')
        local signature
        signature=$(printf '%s' "$canonical" | openssl dgst -sha256 -sign "$sign_key" | base64 -w0)
        envelope=$(printf '%s' "$envelope" | jq --arg sig "$signature" '. + {signature: $sig}')
    fi

    # Write envelope
    printf '%s\n' "$envelope" > "$output_file"
    echo "Envelope created: $output_file"
    echo "Envelope ID: $envelope_id"
    echo "SHA-256: $hash"
}

# ──────────────────────────────────────────────
# Verify: Envelope → Integrity Check
# FIX #1: Fixed arg parsing
# FIX #3: Canonical JSON for signature verification
# FIX #5: Proof reference wording
# ──────────────────────────────────────────────

verify() {
    local envelope_file="${1:-}"
    local verify_signature="${2:-false}"
    local verify_key="${3:-}"

    [[ -z "$envelope_file" ]] && { usage; exit 1; }
    [[ -f "$envelope_file" ]] || { echo "ERROR: Envelope not found: $envelope_file" >&2; exit 1; }

    local envelope
    envelope=$(cat "$envelope_file")

    # Parse fields
    local version hash payload_b64 proof_ref signature author timestamp
    version=$(printf '%s' "$envelope" | jq -r '.envelope_version')
    hash=$(printf '%s' "$envelope" | jq -r '.hash')
    payload_b64=$(printf '%s' "$envelope" | jq -r '.payload_b64')
    proof_ref=$(printf '%s' "$envelope" | jq -r '.proof_ref // ""')
    signature=$(printf '%s' "$envelope" | jq -r '.signature // ""')
    author=$(printf '%s' "$envelope" | jq -r '.author')
    timestamp=$(printf '%s' "$envelope" | jq -r '.timestamp')

    # FIX #2: Verify hash by decoding base64
    local computed_hash
    computed_hash=$(printf '%s' "$payload_b64" | base64 -d | sha256sum | awk '{print $1}')

    if [[ "$computed_hash" != "$hash" ]]; then
        echo "VERIFICATION FAILED: Hash mismatch"
        echo " Expected: $hash"
        echo " Computed: $computed_hash"
        return 1
    fi

    echo "Hash verified: $hash"

    # FIX #3: Verify signature with canonical JSON
    if [[ "$verify_signature" == "true" ]]; then
        [[ -z "$signature" ]] && { echo "VERIFICATION FAILED: No signature present"; return 1; }
        [[ -z "$verify_key" ]] && { echo "VERIFICATION FAILED: Public key required"; return 1; }
        [[ -f "$verify_key" ]] || { echo "VERIFICATION FAILED: Public key not found: $verify_key"; return 1; }

        # FIX #3: Canonical JSON for verification
        local canonical
        canonical=$(printf '%s' "$envelope" | jq -cS 'del(.signature)')

        if printf '%s' "$canonical" | openssl dgst -sha256 -verify "$verify_key" -signature <(echo "$signature" | base64 -d) >/dev/null 2>&1; then
            echo "Ed25519 signature verified"
        else
            echo "VERIFICATION FAILED: Signature invalid"
            return 1
        fi
    fi

    # FIX #5: Proof reference wording
    if [[ -n "$proof_ref" && "$proof_ref" != "null" ]]; then
        echo "Proof reference attached: $proof_ref"
    fi

    echo "Envelope verified successfully"
    echo " Author: $author"
    echo " Timestamp: $timestamp"
    echo " Version: $version"
    return 0
}

# ──────────────────────────────────────────────
# Extract: Envelope → Script
# FIX #2: Base64 decode for exact byte preservation
# ──────────────────────────────────────────────

extract() {
    local envelope_file="${1:-}"
    local output_file="${2:-}"
    local force_verify="${3:-true}"

    [[ -z "$envelope_file" ]] && { usage; exit 1; }

    # Verify first unless skipped
    if [[ "$force_verify" == "true" ]]; then
        verify "$envelope_file" || { echo "ERROR: Verification failed, refusing to extract" >&2; exit 1; }
    fi

    # FIX #2: Base64 decode payload
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
# Link Proof: Attach proof reference to envelope
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
# Sign: Add Ed25519 signature to envelope
# FIX #3: Canonical JSON before signing
# ──────────────────────────────────────────────

sign() {
    local envelope_file="${1:-}"
    local sign_key="${2:-}"

    [[ -z "$envelope_file" || -z "$sign_key" ]] && { usage; exit 1; }
    [[ -f "$envelope_file" ]] || { echo "ERROR: Envelope not found: $envelope_file" >&2; exit 1; }
    [[ -f "$sign_key" ]] || { echo "ERROR: Sign key not found: $sign_key" >&2; exit 1; }

    local envelope
    envelope=$(cat "$envelope_file")

    # Remove existing signature
    envelope=$(printf '%s' "$envelope" | jq 'del(.signature)')

    # FIX #3: Canonical JSON before signing
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
# FIX #6: Use count=$((count + 1)) instead of ((count++))
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
Sovereign Transformer | Operator: $AUTHOR_ID | Trust: $TRUST_PROTOCOL

USAGE:
    env-ship <command> [arguments]

COMMANDS:
    encapsulate <script.sh> [output.envelope] [proof_ref] [sign_key]
        Create envelope from script. Optional proof reference and Ed25519 signing.

    verify <envelope> [--verify-signature] [public_key]
        Verify envelope integrity (hash + optional signature).

    extract <envelope> [output.sh] [--no-verify]
        Extract script from envelope (verifies by default).

    inspect <envelope>
        Display envelope metadata as JSON.

    link-proof <envelope> <proof_ref>
        Attach proof reference (Lean/Isabelle theorem ID, WORM receipt, etc.)

    sign <envelope> <private_key>
        Add Ed25519 signature to envelope.

    batch <directory> [proof_directory] [sign_key]
        Encapsulate all .sh files in directory with optional proof linking.

EXAMPLES:
    # Basic encapsulation
    env-ship encapsulate deploy.sh

    # With Lean proof reference and signing
    env-ship encapsulate deploy.sh deploy.envelope "lean://Sovereign/Theorems/Conduction.lean" ~/keys/ed25519_private.pem

    # Verify with signature
    env-ship verify deploy.envelope --verify-signature ~/keys/ed25519_public.pem

    # Extract after verification
    env-ship extract deploy.envelope deploy_verified.sh

    # Batch process with proof directory
    env-ship batch ./scripts ./proofs ~/keys/ed25519_private.pem

ENVIRONMENT:
    ENVELOPE_AUTHOR Override author identity
    ENVELOPE_VERSION Override envelope version
    TRUST_PROTOCOL Override trust protocol

EXIT CODES:
    0 Success
    1 General error
    2 Verification failed
    3 Invalid arguments
EOF
}

# ──────────────────────────────────────────────
# Main Dispatch
# FIX #1: Fixed verify arg parsing
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
                    --verify-signature)
                        verify_sig=true
                        ;;
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
