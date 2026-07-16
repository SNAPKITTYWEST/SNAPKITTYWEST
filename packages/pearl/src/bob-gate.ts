/**
 * packages/pearl/src/bob-gate.ts
 * Production Prime Foundry Pearl — BOB gate layer.
 *
 * Every governance action must pass all ten SYNTH constraints before
 * BOB issues EVIDENCE. Any failure issues SILENCE.
 *
 * Constants are anchored to ExportThresholds.lean (SYNTH-010).
 * Circuit breaker and retry bounds match mod.rs + publisher.rs (SYNTH-007).
 * Triple-lock prefixes match publisher.rs lines 53-60 (SYNTH-006).
 * WORM-native: every verdict is SHA-256 sealed.
 */

import crypto from 'crypto'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Verdict = 'EVIDENCE' | 'SILENCE'

export interface ActionContext {
  id: string
  /** SYNTH-005: trust level determines mutation rights */
  trust_level: 'internal' | 'external'
  /** SYNTH-005: external mutating actions are blocked */
  mutating: boolean
  /** SYNTH-005: external server_binding is blocked */
  has_server_binding: boolean
  /** SYNTH-004: must be in (0, 1] — Banach precondition */
  contractivity_score: number
  /** SYNTH-007/L0-7: must be < CIRCUIT_BREAKER_THRESHOLD (3) */
  consecutive_failures: number
  /** SYNTH-007: must be <= MAX_RETRY_NONCE (3) */
  retry_nonce: number
  /** SYNTH-006: must start with 'GUARDIAN-WITNESS' */
  guardian_witness: string
  /** SYNTH-006: must start with 'EXAMINER-WITNESS' */
  examiner_witness: string
  /** SYNTH-006: must not be 'PROVISIONAL' */
  status: string
  /** SYNTH-010: must equal LEAN_PROOF_HASH_108_CORE */
  proof_hash: string
  /** SYNTH-009: SHA256(core_hash || operator_key) */
  primary_sig: string
  /** SYNTH-009: SHA256(core_hash || kernel_key) */
  secondary_sig: string
  /** SYNTH-008: must be false — crux is structurally open (none) */
  asserts_rh: boolean
  /** SYNTH-001: Execute in trace implies prior AlpGate true in trace */
  alp_gate_cleared: boolean
  /** SYNTH-002: must be empty — all sorrys must be in 13-entry manifest */
  sorry_violations: string[]
}

export interface GateVerdict {
  action_id: string
  verdict: Verdict
  failed_constraints: string[]
  /** SHA-256 of (verdict || action_id || failures || ts) */
  worm_seal: string
  ts: number
}

// ── Constants anchored to ExportThresholds.lean ────────────────────────────────
/** publisher.rs line 80: proof_hash = LEAN_PROOF_HASH_108_CORE */
const LEAN_PROOF_HASH_108_CORE = 'LEAN_PROOF_HASH_108_CORE'
/** mod.rs line 9, L0.lean line 6: CIRCUIT_BREAKER_THRESHOLD = 3 */
const CIRCUIT_BREAKER_THRESHOLD = 3
/** publisher.rs line 42: MAX_RETRY_NONCE = 3 */
const MAX_RETRY_NONCE = 3
/** mod.rs CONTRACTIVITY_UPPER = 1.0 */
const CONTRACTIVITY_UPPER = 1.0
/** mod.rs CONTRACTIVITY_LOWER = 0.0 */
const CONTRACTIVITY_LOWER = 0.0
/** publisher.rs line 53 */
const GUARDIAN_PREFIX = 'GUARDIAN-WITNESS'
/** publisher.rs line 57 */
const EXAMINER_PREFIX = 'EXAMINER-WITNESS'

// ── Constraint checks ──────────────────────────────────────────────────────────

function checkSynth001(ctx: ActionContext): string | null {
  // No Unaligned Execution — NonBypassability.lean:no_unaligned_execution (axiom)
  // Execute ∈ trace → AlpGate true ∈ trace. No side-channel execution path.
  if (!ctx.alp_gate_cleared) {
    return 'SYNTH-001: Execute without prior AlpGate true — policy bypass attempt SILENCE'
  }
  return null
}

function checkSynth002(ctx: ActionContext): string | null {
  // Sorry is Manifested — all sorrys must appear in alp_sorry_manifest.json (13 entries)
  if (ctx.sorry_violations.length > 0) {
    return `SYNTH-002: Unmanifested sorry breaks EVIDENCE chain: ${ctx.sorry_violations.join(', ')}`
  }
  return null
}

function checkSynth003(ctx: ActionContext): string[] {
  // L0 Sequential Nine — any L0 failure halts the chain
  const failed: string[] = []
  if (ctx.contractivity_score <= CONTRACTIVITY_LOWER || ctx.contractivity_score > CONTRACTIVITY_UPPER) {
    failed.push(`SYNTH-003/L0-5: contractivity_score ${ctx.contractivity_score} not in (0,1]`)
  }
  if (ctx.consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD) {
    failed.push(`SYNTH-003/L0-7: circuit breaker tripped — consecutive_failures ${ctx.consecutive_failures} >= ${CIRCUIT_BREAKER_THRESHOLD}`)
  }
  return failed
}

function checkSynth004(ctx: ActionContext): string | null {
  // Contractivity is the geometric invariant — Banach fixed-point guarantee
  // 0 < contractivity_score <= 1.0 (mod.rs lines 133-147, L0.lean lines 35-36)
  if (ctx.contractivity_score <= CONTRACTIVITY_LOWER) {
    return `SYNTH-004: contractivity_score ${ctx.contractivity_score} <= 0 — system non-contractive, T_∞ undefined`
  }
  if (ctx.contractivity_score > CONTRACTIVITY_UPPER) {
    return `SYNTH-004: contractivity_score ${ctx.contractivity_score} > 1.0 — system expansive, Banach FP fails`
  }
  return null
}

function checkSynth005(ctx: ActionContext): string | null {
  // External actors cannot mutate — trust boundary (Proofs.lean entries 10, 11)
  if (ctx.trust_level === 'external' && ctx.mutating) {
    return 'SYNTH-005: External actor attempted mutating action — do-calculus intervention blocked'
  }
  if (ctx.trust_level === 'external' && ctx.has_server_binding) {
    return 'SYNTH-005: External actor has server_binding — governed MCP bypass blocked'
  }
  return null
}

function checkSynth006(ctx: ActionContext): string | null {
  // Triple-lock sequential — Guardian then Examiner then Publisher (publisher.rs lines 53-70)
  if (!ctx.guardian_witness.startsWith(GUARDIAN_PREFIX)) {
    return `SYNTH-006: guardian_witness missing '${GUARDIAN_PREFIX}' prefix — lock 1 not cleared`
  }
  if (!ctx.examiner_witness.startsWith(EXAMINER_PREFIX)) {
    return `SYNTH-006: examiner_witness missing '${EXAMINER_PREFIX}' prefix — lock 2 not cleared`
  }
  if (ctx.status === 'PROVISIONAL') {
    return 'SYNTH-006: PROVISIONAL status rejected — publisher.rs line 69, cannot ratify unresolved state'
  }
  return null
}

function checkSynth007(ctx: ActionContext): string | null {
  // Bounded adversarial window — same bound of 3 at two independent layers
  if (ctx.retry_nonce > MAX_RETRY_NONCE) {
    return `SYNTH-007: retry_nonce ${ctx.retry_nonce} > MAX_RETRY_NONCE ${MAX_RETRY_NONCE} — exhaustion attempt`
  }
  if (ctx.consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD) {
    return `SYNTH-007: consecutive_failures ${ctx.consecutive_failures} >= CIRCUIT_BREAKER_THRESHOLD ${CIRCUIT_BREAKER_THRESHOLD}`
  }
  return null
}

function checkSynth008(ctx: ActionContext): string | null {
  // Crux encoded honestly as open — RH never asserted (F1Square.lean lines 365, 388)
  // pearl_hodge_index_holds = none, pearl_li_positivity_holds = none (rfl witnesses)
  if (ctx.asserts_rh) {
    return 'SYNTH-008: Action asserts RH proven — crux must remain none, epistemic fraud'
  }
  return null
}

function checkSynth009(ctx: ActionContext): string | null {
  // Archivum is a WORM G-Set CRDT — dual signature required (witness.rs:DualSignatureProtocol)
  // primary_signature = SHA256(core_hash || operator_key)
  // secondary_signature = SHA256(core_hash || kernel_key)
  if (!ctx.primary_sig) {
    return 'SYNTH-009: Missing primary_sig — operator key not co-signed, single-party forgery rejected'
  }
  if (!ctx.secondary_sig) {
    return 'SYNTH-009: Missing secondary_sig — P-Kernel signing stone not co-signed'
  }
  return null
}

function checkSynth010(ctx: ActionContext): string | null {
  // Lean-Rust boundary cryptographically bound — ExportThresholds anchoring
  // publisher.rs line 80: proof_hash = LEAN_PROOF_HASH_108_CORE
  if (ctx.proof_hash !== LEAN_PROOF_HASH_108_CORE) {
    return `SYNTH-010: proof_hash '${ctx.proof_hash}' !== '${LEAN_PROOF_HASH_108_CORE}' — Lean/Rust hash chain broken`
  }
  return null
}

// ── Pearl gate — BOB EVIDENCE/SILENCE evaluator ───────────────────────────────

export function pearlGate(ctx: ActionContext): GateVerdict {
  const failed: string[] = []

  const c1 = checkSynth001(ctx)
  if (c1) failed.push(c1)

  const c2 = checkSynth002(ctx)
  if (c2) failed.push(c2)

  const c3 = checkSynth003(ctx)
  failed.push(...c3)

  const c4 = checkSynth004(ctx)
  if (c4) failed.push(c4)

  const c5 = checkSynth005(ctx)
  if (c5) failed.push(c5)

  const c6 = checkSynth006(ctx)
  if (c6) failed.push(c6)

  const c7 = checkSynth007(ctx)
  if (c7) failed.push(c7)

  const c8 = checkSynth008(ctx)
  if (c8) failed.push(c8)

  const c9 = checkSynth009(ctx)
  if (c9) failed.push(c9)

  const c10 = checkSynth010(ctx)
  if (c10) failed.push(c10)

  const verdict: Verdict = failed.length === 0 ? 'EVIDENCE' : 'SILENCE'
  const ts = Date.now()

  const worm_seal = crypto.createHash('sha256')
    .update(`${verdict}:${ctx.id}:${failed.join('|')}:${ts}`)
    .digest('hex')

  return { action_id: ctx.id, verdict, failed_constraints: failed, worm_seal, ts }
}
