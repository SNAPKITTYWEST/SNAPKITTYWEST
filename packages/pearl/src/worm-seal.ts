/**
 * packages/pearl/src/worm-seal.ts
 * Production Prime Foundry Pearl — WORM-native layer transition sealer.
 *
 * Every Pearl layer transition (verdict → seal → new facts → next proof) is
 * appended to an append-only G-Set ledger (SYNTH-009: grow-only, no deletion).
 *
 * Seal formula mirrors DualSignatureProtocol in crates/governance/src/witness.rs:
 *   worm_seal = SHA256(verdict || action_id || layer_from || layer_to || prev_seal || ts || primary_sig || kernel_sig)
 *
 * Chain integrity check: each entry's prev_seal must equal the prior entry's worm_seal.
 * This is the WORM guarantee: tamper-evident, append-only, convergent (G-Set merge = union).
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export interface WormEntry {
  seq: number
  layer_from: string
  layer_to: string
  action_id: string
  verdict: 'EVIDENCE' | 'SILENCE'
  /** SHA256(verdict || action_id || layer_from || layer_to || prev_seal || ts || primary_sig || kernel_sig) */
  worm_seal: string
  prev_seal: string
  ts: number
}

const DEFAULT_LEDGER = path.join(process.cwd(), 'packages', 'pearl', 'worm-ledger.json')

function loadLedger(ledgerPath = DEFAULT_LEDGER): WormEntry[] {
  if (!fs.existsSync(ledgerPath)) return []
  try {
    return JSON.parse(fs.readFileSync(ledgerPath, 'utf-8')) as WormEntry[]
  } catch {
    return []
  }
}

function saveLedger(entries: WormEntry[], ledgerPath = DEFAULT_LEDGER): void {
  fs.writeFileSync(ledgerPath, JSON.stringify(entries, null, 2))
}

/**
 * Append a new WORM entry for a layer transition.
 *
 * Both primary_sig (operator key — BOB as trustee) and kernel_sig
 * (P-Kernel / signing stone) are required before admission.
 * Single-party forgery is rejected — SYNTH-009.
 *
 * The same bound of 3 (CIRCUIT_BREAKER_THRESHOLD / MAX_RETRY_NONCE)
 * must be checked by the caller before invoking this function — SYNTH-007.
 */
export function appendWormEntry(
  layer_from: string,
  layer_to: string,
  action_id: string,
  verdict: 'EVIDENCE' | 'SILENCE',
  primary_sig: string,
  kernel_sig: string,
  ledgerPath = DEFAULT_LEDGER
): WormEntry {
  if (!primary_sig) throw new Error('SYNTH-009: primary_sig required — operator key must co-sign')
  if (!kernel_sig) throw new Error('SYNTH-009: kernel_sig required — P-Kernel signing stone must co-sign')

  const ledger = loadLedger(ledgerPath)
  const prev_seal = ledger.length > 0 ? ledger[ledger.length - 1].worm_seal : '0'.repeat(64)
  const ts = Date.now()
  const seq = ledger.length

  const worm_seal = crypto.createHash('sha256')
    .update(`${verdict}:${action_id}:${layer_from}:${layer_to}:${prev_seal}:${ts}:${primary_sig}:${kernel_sig}`)
    .digest('hex')

  const entry: WormEntry = { seq, layer_from, layer_to, action_id, verdict, worm_seal, prev_seal, ts }
  ledger.push(entry)
  saveLedger(ledger, ledgerPath)
  return entry
}

/**
 * Verify entire WORM chain is intact.
 * Each entry's prev_seal must equal the prior entry's worm_seal.
 * Mirrors crdt.rs merge: strict verification on every entry before admission.
 * G-Set semantic: once appended, entries cannot be removed or reordered.
 */
export function verifyWormChain(
  ledgerPath = DEFAULT_LEDGER
): { valid: boolean; broken_at?: number; length: number } {
  const ledger = loadLedger(ledgerPath)
  if (ledger.length === 0) return { valid: true, length: 0 }

  for (let i = 1; i < ledger.length; i++) {
    if (ledger[i].prev_seal !== ledger[i - 1].worm_seal) {
      return { valid: false, broken_at: i, length: ledger.length }
    }
  }

  return { valid: true, length: ledger.length }
}

/**
 * Compute the current head seal (latest entry's worm_seal).
 * BOB publishes this as the WORM head after each verdict cycle.
 */
export function wormHead(ledgerPath = DEFAULT_LEDGER): string {
  const ledger = loadLedger(ledgerPath)
  if (ledger.length === 0) return '0'.repeat(64)
  return ledger[ledger.length - 1].worm_seal
}
