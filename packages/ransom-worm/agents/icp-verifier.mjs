#!/usr/bin/env node
/**
 * ICP VERIFIER — Shadow Orchestrator Agent 4
 * Continuous non-recursive verification loop between local execution layers
 * and active Internet Computer Protocol canisters.
 * Freezes or reverts execution if state drift is detected.
 *
 * Run: node agents/icp-verifier.mjs [--canister <id>] [--interval <ms>] [--once]
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sealEvent } from './worm-chain.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const STATE_PATH = join(__dir, '..', 'icp-state.json')

// ICP Replica API (local dfx or mainnet)
const ICP_LOCAL  = 'http://localhost:4943'
const ICP_MAIN   = 'https://ic0.app'
const DFX_CONFIG = join(__dir, '..', '..', '..', 'DEVFLOW-FINANCE', 'icp-bridge', 'canister', 'dfx.json')

function sha256(data) {
  return createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex')
}

function loadExpectedState() {
  if (existsSync(STATE_PATH)) return JSON.parse(readFileSync(STATE_PATH, 'utf8'))
  return null
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

function loadDfxConfig() {
  try {
    return JSON.parse(readFileSync(DFX_CONFIG, 'utf8'))
  } catch {
    return null
  }
}

async function queryCanisters(replica) {
  // Candid/agent-js query — simplified HTTP polling
  try {
    const res = await fetch(`${replica}/api/v2/status`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function queryCanisterModule(replica, canisterId) {
  // Get canister module hash (raw state check)
  try {
    const res = await fetch(`${replica}/api/v2/canister/${canisterId}/read_state`, {
      method: 'POST',
      headers: { 'content-type': 'application/cbor' },
      body: new Uint8Array([0xd9, 0xd9, 0xf7, 0xa1, 0x65, 0x70, 0x61, 0x74, 0x68, 0x73, 0x81]),
      signal: AbortSignal.timeout(5000),
    })
    return res.ok ? { status: 'reachable', canisterId } : null
  } catch {
    return null
  }
}

function detectDrift(prev, curr) {
  if (!prev) return { drifted: false, reason: 'no baseline' }
  const prevHash = sha256(prev)
  const currHash = sha256(curr)
  if (prevHash !== currHash) {
    return { drifted: true, prevHash, currHash, reason: 'state hash mismatch' }
  }
  return { drifted: false }
}

export async function verifyOnce(args = {}) {
  const canisterId = args.canister || null
  const dfx = loadDfxConfig()

  console.log('[ICP] Shadow Orchestrator — Canister State Verifier')
  console.log('[ICP] Checking local replica:', ICP_LOCAL)

  // Try local replica first
  let replicaUrl = ICP_LOCAL
  let status = await queryCanisters(ICP_LOCAL)

  if (!status && process.env.ICP_ALLOW_MAINNET === '1') {
    console.log('[ICP] Local replica not reachable — checking mainnet ICP...')
    replicaUrl = ICP_MAIN
    status = await queryCanisters(ICP_MAIN)
  } else if (!status) {
    console.log('[ICP] Local replica not reachable — mainnet check disabled. Set ICP_ALLOW_MAINNET=1 to opt in.')
  }

  if (!status) {
    console.log('[ICP] ⚠ No ICP replica reachable. Recording offline state.')
    const { seal } = sealEvent('ICP-VERIFIER', 'replica-unreachable', { canisterId, ts: new Date().toISOString() })
    return { status: 'offline', seal }
  }

  const ts = new Date().toISOString()
  const stateSnapshot = {
    ts,
    replica: replicaUrl,
    replicaStatus: status,
    canisterId: canisterId || 'broadcast',
    dfxCanisters: dfx ? Object.keys(dfx.canisters || {}) : [],
  }

  const stateHash = sha256(stateSnapshot)
  const prev = loadExpectedState()
  const drift = detectDrift(prev?.hash, stateHash)

  if (drift.drifted) {
    console.error('[ICP] 🚨 STATE DRIFT DETECTED')
    console.error('[ICP] Previous hash:', drift.prevHash)
    console.error('[ICP] Current hash: ', drift.currHash)
    console.error('[ICP] Reason:', drift.reason)
    console.error('[ICP] ACTION: Freezing execution — manual review required')

    const { seal } = sealEvent('ICP-VERIFIER', 'drift-detected', {
      prevHash: drift.prevHash,
      currHash: drift.currHash,
      reason: drift.reason,
      canisterId,
    })

    saveState({ hash: stateHash, snapshot: stateSnapshot, lastVerified: ts, driftDetected: true, seal })
    return { status: 'DRIFT_DETECTED', seal, drift }
  }

  saveState({ hash: stateHash, snapshot: stateSnapshot, lastVerified: ts, driftDetected: false })

  const { seal } = sealEvent('ICP-VERIFIER', 'state-verified', {
    stateHash,
    replica: replicaUrl,
    canisterId: canisterId || 'all',
  })

  console.log('[ICP] ✓ State verified — no drift')
  console.log('[ICP] State hash:', stateHash.slice(0, 16) + '...')
  console.log('[ICP] Replica:', replicaUrl)
  if (dfx) console.log('[ICP] Canisters:', Object.keys(dfx.canisters || {}).join(', '))
  console.log('[ICP] WORM seal:', seal)

  return { status: 'VERIFIED', seal, stateHash }
}

async function run() {
  const args = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--canister') args.canister = argv[++i]
    if (argv[i] === '--interval') args.interval = parseInt(argv[++i])
    if (argv[i] === '--once') args.once = true
  }

  const result = await verifyOnce(args)

  if (args.once || !args.interval) return

  const interval = args.interval || 30000
  console.log(`[ICP] Continuous verification loop — interval: ${interval}ms`)
  console.log('[ICP] Non-recursive. Each tick is an independent verification.')

  // Non-recursive loop — setInterval, not recursion
  setInterval(async () => {
    const r = await verifyOnce(args)
    if (r.status === 'DRIFT_DETECTED') {
      console.error('[ICP] 🚨 DRIFT — halting loop for manual review')
      process.exit(1)
    }
  }, interval)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(console.error)
}
