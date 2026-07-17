/**
 * resonance-block/layers/triple-lock/index.mjs
 * Layer 4 — Triple-Lock Sequential Chain of Custody (SYNTH-006, SYNTH-010).
 *
 * Guardian → Examiner → Publisher. No lock may be skipped.
 * PROVISIONAL states are rejected at every stage.
 * Every lock produces a WORM seal that chains to the prior lock's seal.
 */

import crypto from 'crypto'

// ── Constants (anchored to ExportThresholds.lean) ──────────────────────────

export const LEAN_PROOF_HASH_108_CORE = 'LEAN_PROOF_HASH_108_CORE'
export const GUARDIAN_PREFIX = 'GUARDIAN-WITNESS'
export const EXAMINER_PREFIX = 'EXAMINER-WITNESS'
export const MAX_RETRY_NONCE = 3
export const TAU_R = 47.06998778

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {'EVIDENCE' | 'SILENCE'} LockVerdict
 * @typedef {{ worm_seal: string, prev_seal: string, ts: number }} WormSealData
 * @typedef {{ guardian_witness: string, seal: WormSealData, verdict: LockVerdict, reason?: string }} GuardResult
 * @typedef {{ examiner_witness: string, seal: WormSealData, verdict: LockVerdict, reason?: string }} ExamineResult
 * @typedef {{ ensemble_id: string, sequence: number, guardian_witness: string, examiner_witness: string, proof_hash: string, state_commitment: string, p_kernel_signature: string }} VerifiedManifest
 * @typedef {{ manifest: VerifiedManifest, seal: WormSealData, verdict: LockVerdict, reason?: string }} PublishResult
 */

// ── WORM Seal ──────────────────────────────────────────────────────────────

function sha256(...parts) {
  return crypto.createHash('sha256').update(parts.join(':')).digest('hex')
}

function genesis() {
  return { worm_seal: '0'.repeat(64), prev_seal: '0'.repeat(64), ts: 0 }
}

function zeroSeal(seal) {
  return seal.worm_seal === '0'.repeat(64) && seal.prev_seal === '0'.repeat(64) && seal.ts === 0
}

// ── Lock 1 — Guardian ──────────────────────────────────────────────────────

/**
 * SYNTH-006 Lock 1: validate guardian witness, proof hash, retry nonce,
 * PROVISIONAL rejection, and dual-sig requirement (SYNTH-009/010).
 * Chains WORM seal from prevSeal.
 */
export function guard(proposal, prevSeal, primarySig, kernelSig) {
  const ts = Date.now()

  if (!primarySig || !kernelSig) {
    const worm_seal = sha256('SILENCE', String(proposal.sequence), prevSeal, String(ts))
    return { guardian_witness: proposal.guardian_witness, seal: { worm_seal, prev_seal: prevSeal, ts }, verdict: 'SILENCE', reason: 'SYNTH-009: dual-sig required for WORM admission' }
  }
  if (proposal.status === 'PROVISIONAL') {
    const worm_seal = sha256('SILENCE', String(proposal.sequence), prevSeal, String(ts))
    return { guardian_witness: proposal.guardian_witness, seal: { worm_seal, prev_seal: prevSeal, ts }, verdict: 'SILENCE', reason: 'SYNTH-006: PROVISIONAL status rejected at Lock 1' }
  }
  if (!proposal.guardian_witness.startsWith(GUARDIAN_PREFIX)) {
    const worm_seal = sha256('SILENCE', String(proposal.sequence), prevSeal, String(ts))
    return { guardian_witness: proposal.guardian_witness, seal: { worm_seal, prev_seal: prevSeal, ts }, verdict: 'SILENCE', reason: `SYNTH-006: guardian_witness must start with '${GUARDIAN_PREFIX}'` }
  }
  if (proposal.proof_hash !== LEAN_PROOF_HASH_108_CORE) {
    const worm_seal = sha256('SILENCE', String(proposal.sequence), prevSeal, String(ts))
    return { guardian_witness: proposal.guardian_witness, seal: { worm_seal, prev_seal: prevSeal, ts }, verdict: 'SILENCE', reason: `SYNTH-010: proof_hash '${proposal.proof_hash}' !== '${LEAN_PROOF_HASH_108_CORE}'` }
  }
  if (proposal.retry_nonce > MAX_RETRY_NONCE) {
    const worm_seal = sha256('SILENCE', String(proposal.sequence), prevSeal, String(ts))
    return { guardian_witness: proposal.guardian_witness, seal: { worm_seal, prev_seal: prevSeal, ts }, verdict: 'SILENCE', reason: `SYNTH-006: retry_nonce ${proposal.retry_nonce} > MAX_RETRY_NONCE ${MAX_RETRY_NONCE}` }
  }

  const worm_seal = sha256('EVIDENCE', proposal.guardian_witness, proposal.proof_hash, prevSeal, String(ts), primarySig, kernelSig)
  return { guardian_witness: proposal.guardian_witness, seal: { worm_seal, prev_seal: prevSeal, ts }, verdict: 'EVIDENCE' }
}

// ── Lock 2 — Examiner ──────────────────────────────────────────────────────

/**
 * SYNTH-006 Lock 2: validate examiner witness against a prior GuardResult.
 * Chains WORM seal from Guardian's seal. Rejects if Guardian didn't pass.
 */
export function examine(guardResult, examiner_witness, stateCommitment, driftMagnitude) {
  const ts = Date.now()
  const prev_seal = guardResult.seal.worm_seal

  if (guardResult.verdict !== 'EVIDENCE') {
    const worm_seal = sha256('SILENCE', examiner_witness, prev_seal, String(ts))
    return { examiner_witness, seal: { worm_seal, prev_seal, ts }, verdict: 'SILENCE', reason: 'SYNTH-006: Lock 1 (Guardian) did not issue EVIDENCE — chain broken' }
  }
  if (!examiner_witness.startsWith(EXAMINER_PREFIX)) {
    const worm_seal = sha256('SILENCE', examiner_witness, prev_seal, String(ts))
    return { examiner_witness, seal: { worm_seal, prev_seal, ts }, verdict: 'SILENCE', reason: `SYNTH-006: examiner_witness must start with '${EXAMINER_PREFIX}'` }
  }
  // SYNTH-006: drift budget check (tau_r from witnesses.jsonl)
  if (typeof driftMagnitude === 'number' && driftMagnitude > TAU_R) {
    const worm_seal = sha256('SILENCE', examiner_witness, prev_seal, String(ts))
    return { examiner_witness, seal: { worm_seal, prev_seal, ts }, verdict: 'SILENCE', reason: `SYNTH-006: drift ${driftMagnitude} exceeds tau_r ${TAU_R}` }
  }

  const worm_seal = sha256('EVIDENCE', examiner_witness, guardResult.guardian_witness, stateCommitment, prev_seal, String(ts))
  return { examiner_witness, seal: { worm_seal, prev_seal, ts }, verdict: 'EVIDENCE' }
}

// ── Lock 3 — Publisher ─────────────────────────────────────────────────────

/**
 * SYNTH-006 Lock 3: ratify witness bundle into an immutable VerifiedManifest.
 * Chains WORM seal from Examiner's seal. Rejects PROVISIONAL, broken chains.
 * proof_hash is always LEAN_PROOF_HASH_108_CORE (SYNTH-010).
 */
export function publish(examineResult, bundle) {
  const ts = Date.now()
  const prev_seal = examineResult.seal.worm_seal

  if (examineResult.verdict !== 'EVIDENCE') {
    const worm_seal = sha256('SILENCE', bundle.ensemble_id, prev_seal, String(ts))
    return { manifest: /** @type {VerifiedManifest} */ ({}), seal: { worm_seal, prev_seal, ts }, verdict: 'SILENCE', reason: 'SYNTH-006: Lock 2 (Examiner) did not issue EVIDENCE — chain broken' }
  }
  if (bundle.status === 'PROVISIONAL') {
    const worm_seal = sha256('SILENCE', bundle.ensemble_id, prev_seal, String(ts))
    return { manifest: /** @type {VerifiedManifest} */ ({}), seal: { worm_seal, prev_seal, ts }, verdict: 'SILENCE', reason: 'SYNTH-006: PROVISIONAL status rejected at Publisher — cannot ratify unresolved state' }
  }
  if (bundle.retry_nonce > MAX_RETRY_NONCE) {
    const worm_seal = sha256('SILENCE', bundle.ensemble_id, prev_seal, String(ts))
    return { manifest: /** @type {VerifiedManifest} */ ({}), seal: { worm_seal, prev_seal, ts }, verdict: 'SILENCE', reason: `SYNTH-006: retry_nonce ${bundle.retry_nonce} > MAX_RETRY_NONCE ${MAX_RETRY_NONCE}` }
  }

  const manifest = {
    ensemble_id: bundle.ensemble_id,
    sequence: bundle.sequence,
    guardian_witness: examineResult.seal.prev_seal,
    examiner_witness: examineResult.examiner_witness,
    proof_hash: LEAN_PROOF_HASH_108_CORE,
    state_commitment: bundle.state_commitment,
    p_kernel_signature: sha256('SIG-PK', bundle.ensemble_id, String(bundle.sequence), LEAN_PROOF_HASH_108_CORE),
  }

  const worm_seal = sha256('EVIDENCE', manifest.ensemble_id, String(manifest.sequence), manifest.proof_hash, manifest.p_kernel_signature, prev_seal, String(ts))
  return { manifest, seal: { worm_seal, prev_seal, ts }, verdict: 'EVIDENCE' }
}

// ── Convenience combinator ─────────────────────────────────────────────────

/**
 * Run all three locks in sequence, fail-fast on first SILENCE.
 * Threads WORM seals through the chain.
 */
export function runChain(proposal, examiner_witness, bundle, prevSeal, primarySig, kernelSig, driftMagnitude) {
  const g = guard(proposal, prevSeal, primarySig, kernelSig)
  if (g.verdict !== 'EVIDENCE') {
    return { manifest: /** @type {VerifiedManifest} */ ({}), seal: g.seal, verdict: 'SILENCE', reason: g.reason }
  }
  const e = examine(g, examiner_witness, bundle.state_commitment, driftMagnitude)
  if (e.verdict !== 'EVIDENCE') {
    return { manifest: /** @type {VerifiedManifest} */ ({}), seal: e.seal, verdict: 'SILENCE', reason: e.reason }
  }
  return publish(e, bundle)
}

export { genesis, zeroSeal, sha256 }
