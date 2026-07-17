// bridge.mjs — METAMINE → ERRANT → MAGMA → BOB
//
// The full sovereign pipeline:
//   .meta program → excavate (curator) → WORM seal
//   → ERRANT opcode stream → linear type check
//   → MAGMA verb dispatch (POST /api/labs/ledge/seal)
//   → BOB TRUST-DEED-GATE → agent routing
//
// MAGMA endpoint: http://localhost:3000/api/labs/ledge/seal
// BOB endpoint:   http://localhost:3000/api/sovereign/dispatch
//
// Symbol → MAGMA verb map:
//   FORGE  (5)  → FORGE_BUILD   → FORGE agent (⚒️)
//   SEAL   (Ω)  → METAMINE_SEAL → CIPHER (🔒)
//   RUPTURE(M)  → SENTINEL      → SENTINEL (👁)
//   REDUCTION(⌹)→ VAULT_APPROVE → VAULT (🏦)
//   RESONANCE(◇)→ ORACLE_QUERY  → CARTO (🔮)
//   MEMORY (⬡)  → ANCHOR        → MNEMEX (📜)
//   ECHO   (6)  → FLUX_BROADCAST→ HERALD (⚡)
//   all others  → NOVA (🧠)
//
// Ahmad Ali Parr · SnapKitty Collective · 2026

import { createHash } from 'crypto'
import { readFileSync }  from 'fs'
import { runMetamine }   from './curator.mjs'

const OS_URL     = process.env.SNAP_OS_URL    ?? 'http://localhost:3000'
const ERRANT_URL = process.env.ERRANT_URL     ?? 'http://localhost:4000'
const BOB_GATE   = `${OS_URL}/api/sovereign/dispatch`
const WORM_SEAL  = `${OS_URL}/api/labs/ledge/seal`
const TIMEOUT_MS = 6_000

// ── MAGMA verb table (mirrors extension.ts TIERS) ─────────────────────────────

const VERB = {
  FORGE_BUILD:      { emoji: '⚒️',  agent: 'FORGE',    action: 'BUILD'     },
  METAMINE_SEAL:    { emoji: '🔒',  agent: 'CIPHER',   action: 'SIGN'      },
  SENTINEL_MONITOR: { emoji: '👁',  agent: 'SENTINEL', action: 'MONITOR'   },
  VAULT_APPROVE:    { emoji: '🏦',  agent: 'VAULT',    action: 'APPROVE'   },
  ORACLE_QUERY:     { emoji: '🔮',  agent: 'ORACLE',   action: 'KNOWLEDGE' },
  ANCHOR:           { emoji: '📜',  agent: 'MNEMEX',   action: 'WORM'      },
  FLUX_BROADCAST:   { emoji: '⚡',  agent: 'HERALD',   action: 'BROADCAST' },
  NOVA_SYNTHETIC:   { emoji: '🧠',  agent: 'NOVA',     action: 'SYNTHETIC' },
}

// ── Trace op → ERRANT opcode ───────────────────────────────────────────────────
// Maps curator trace ops to ERRANT LFIS opcode names.
// These match the ERRANT interpreter's expected opcode strings.

const ERRANT_OPCODE = {
  NOP:       'NOP',
  SEED:      'PUSH',
  DROP:      'POP',
  FUSE:      'FUSE',
  CUT:       'CUT',
  FORGE:     'FORGE',
  ECHO:      'ECHO',
  LISTEN:    'LISTEN',
  GATE:      'GATE',
  RUPTURE:   'RUPTURE',
  SEAL:      'SEAL',
  ORIGIN:    'ORIGIN',
  RESONANCE: 'RESONANCE',
  TRANSFORM: 'TRANSFORM',
  MEMORY:    'MEMORY',
  REDUCTION: 'REDUCTION',
  PORTAL:    'PORTAL',
}

// ── Trace → ERRANT stream ─────────────────────────────────────────────────────
// Converts curator trace to the flat opcode array ERRANT expects.

function traceToErrant(trace) {
  return trace.map(t => ({
    op:    ERRANT_OPCODE[t.op] ?? 'NOP',
    x:     t.x,
    y:     t.y,
    stack: t.stack,
    step:  t.step,
  }))
}

// ── ERRANT linear type check ──────────────────────────────────────────────────
// Sends the opcode stream to the ERRANT LFIS interpreter for type checking.
// Returns: { ok: true } or { ok: false, error: string }
// Fallback (ERRANT offline): local monotone check — verify SEAL is the last op.

async function errantCheck(opcodes) {
  try {
    const res = await fetch(`${ERRANT_URL}/verify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ opcodes }),
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`ERRANT ${res.status}`)
    return await res.json()
  } catch {
    // Local fallback: SEAL must be the final op (linear: every resource consumed)
    const last = opcodes[opcodes.length - 1]
    if (last?.op === 'SEAL') return { ok: true, fallback: true }
    return { ok: false, error: 'SEAL not final — linear resources not consumed', fallback: true }
  }
}

// ── Trace → MAGMA dispatch list ───────────────────────────────────────────────
// Maps the excavation trace to ordered MAGMA verb calls.
// Priority rules:
//   SEAL always fires last.
//   Multiple FORGE ops → one batched FORGE_BUILD.
//   Each RUPTURE → one SENTINEL_MONITOR.
//   First RESONANCE → ORACLE_QUERY.
//   First REDUCTION → VAULT_APPROVE with the stack sum.
//   First MEMORY    → ANCHOR with the cell key.
//   Any ECHO output → FLUX_BROADCAST.
//   Anything else   → NOVA_SYNTHETIC (general compute).

function traceToDispatch(trace, seal, filename) {
  const events = []
  let   forgeCount   = 0
  let   forgeSteps   = []
  let   hasResonance = false
  let   hasReduction = false
  let   echoOutput   = ''
  let   memoryKeys   = []

  for (const t of trace) {
    switch (t.op) {
      case 'FORGE':
        forgeCount++
        forgeSteps.push(t.step)
        break
      case 'RUPTURE':
        events.push({
          event:  'SENTINEL_MONITOR',
          source: `metamine:rupture:${t.x},${t.y}`,
          power:  t.stack[t.stack.length - 1] ?? 0,
          step:   t.step,
        })
        break
      case 'RESONANCE':
        if (!hasResonance) {
          hasResonance = true
          events.push({
            event: 'ORACLE_QUERY',
            topic: `metamine:resonance:phi-amplify`,
            step:  t.step,
          })
        }
        break
      case 'REDUCTION':
        if (!hasReduction) {
          hasReduction = true
          const sum = t.stack[t.stack.length - 1] ?? 0
          events.push({
            event:  'VAULT_APPROVE',
            amount: sum,
            vendor: `metamine:reduction:step-${t.step}`,
          })
        }
        break
      case 'MEMORY':
        memoryKeys.push(`${t.x},${t.y}`)
        if (memoryKeys.length === 1) {
          events.push({
            event: 'ANCHOR',
            data:  `metamine:memory:${t.x},${t.y}`,
          })
        }
        break
      case 'ECHO':
        // ECHO output collected separately — one FLUX at end
        break
    }
  }

  // Collect ECHO output from state (passed through seal.output)
  if (seal.output) {
    events.push({
      event:   'FLUX_BROADCAST',
      message: `metamine:echo:${seal.output}`,
    })
  }

  // Batched FORGE — one call for all multiply ops
  if (forgeCount > 0) {
    events.push({
      event: 'FORGE_BUILD',
      job:   `metamine:forge:${filename}:${forgeCount}x`,
      steps: forgeSteps,
    })
  }

  // SEAL always last — the Ω
  events.push({
    event:   'METAMINE_SEAL',
    sha256:  seal.hash,
    steps:   seal.steps,
    program: filename,
    trace:   seal.trace,
    timestamp: seal.timestamp,
  })

  return events
}

// ── BOB routing decision ──────────────────────────────────────────────────────
// After ERRANT verifies linearity, BOB TRUST-DEED-GATE decides the primary agent.
// Rule: the most significant MAGMA verb in the dispatch list determines the route.
// Significance order: SEAL > VAULT > SENTINEL > FORGE > ORACLE > ANCHOR > FLUX > NOVA

function bobRoute(dispatchList) {
  const sig = {
    METAMINE_SEAL:    7,
    VAULT_APPROVE:    6,
    SENTINEL_MONITOR: 5,
    FORGE_BUILD:      4,
    ORACLE_QUERY:     3,
    ANCHOR:           2,
    FLUX_BROADCAST:   1,
    NOVA_SYNTHETIC:   0,
  }
  const primary = dispatchList.reduce((best, ev) =>
    (sig[ev.event] ?? 0) > (sig[best.event] ?? 0) ? ev : best
  , { event: 'NOVA_SYNTHETIC' })

  const verb = Object.keys(VERB).find(k => primary.event.startsWith(k.split('_')[0]))
             ?? 'NOVA_SYNTHETIC'
  return VERB[verb] ?? VERB.NOVA_SYNTHETIC
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function postWorm(payload) {
  try {
    const res = await fetch(WORM_SEAL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ payload }),
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return { ok: false, status: res.status }
    const data = await res.json()
    return { ok: true, result: data.event ?? data }
  } catch (e) {
    return { ok: false, offline: true, error: e.message }
  }
}

async function postBob(envelope) {
  try {
    const res = await fetch(BOB_GATE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(envelope),
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return { ok: false, status: res.status }
    return { ok: true, result: await res.json() }
  } catch (e) {
    return { ok: false, offline: true, error: e.message }
  }
}

// ── Bridge manifest ───────────────────────────────────────────────────────────
// The sovereign envelope sent to BOB. Contains everything needed to reproduce
// and verify the execution — the WORM chain is built from this.

function buildManifest({ filename, source, seal, errant, dispatchList, route, wormResults }) {
  const manifestHash = createHash('sha256')
    .update(`BRIDGE|${seal.hash}|${errant.ok}|${route.agent}`)
    .digest('hex')

  return {
    type:        'METAMINE_MANIFEST',
    version:     '1.0.0',
    manifest_id: manifestHash,
    program: {
      filename,
      source_hash: createHash('sha256').update(source).digest('hex'),
    },
    excavation: {
      seal_hash:  seal.hash,
      steps:      seal.steps,
      output:     seal.output,
      timestamp:  seal.timestamp,
    },
    errant: {
      verified:  errant.ok,
      fallback:  errant.fallback ?? false,
      error:     errant.error ?? null,
    },
    bob: {
      route:  route,
      gate:   'TRUST-DEED-GATE',
      chain:  'MAMBA → WATSON → PROLOG-KERNEL → HASKELL-MONAD → SEAL',
    },
    dispatch: dispatchList,
    worm:     wormResults,
    sovereign_seal: `Ω↺Ψ↺Δ↺Λ↺Σ↺Φ↺α`,
  }
}

// ── Main bridge function ──────────────────────────────────────────────────────

export async function bridge(source, filename = 'program.meta', opts = {}) {
  const { verbose = false, dryRun = false } = opts

  const log = verbose ? console.error : () => {}

  // ── Step 1: Excavate ───────────────────────────────────────────────────────
  log('§ METAMINE: excavating...')
  const result = runMetamine(source)
  const { state, seal } = result
  log(`§ METAMINE: ${seal.steps} steps · seal ${seal.hash.slice(0,16)}...`)

  // ── Step 2: Translate trace → ERRANT opcodes ───────────────────────────────
  log('§ ERRANT: translating trace...')
  const opcodes = traceToErrant(state.trace)
  log(`§ ERRANT: ${opcodes.length} opcodes`)

  // ── Step 3: ERRANT linear type check ──────────────────────────────────────
  log('§ ERRANT: checking linear types...')
  const errant = await errantCheck(opcodes)
  if (!errant.ok) {
    const err = `ERRANT verification failed: ${errant.error}`
    log(`§ ERRANT: ✗ ${err}`)
    return { ok: false, error: err, seal }
  }
  log(`§ ERRANT: ✓ linear types valid${errant.fallback ? ' (local fallback)' : ''}`)

  // ── Step 4: Build MAGMA dispatch list ─────────────────────────────────────
  log('§ MAGMA: building dispatch...')
  const dispatchList = traceToDispatch(state.trace, seal, filename)
  log(`§ MAGMA: ${dispatchList.length} verbs queued`)

  // ── Step 5: BOB routing decision ──────────────────────────────────────────
  const route = bobRoute(dispatchList)
  log(`§ BOB: route → ${route.emoji} ${route.agent}:${route.action}`)

  // ── Step 6: POST to WORM chain ────────────────────────────────────────────
  const wormResults = []
  if (!dryRun) {
    log('§ WORM: sealing events...')
    for (const ev of dispatchList) {
      const r = await postWorm(ev)
      wormResults.push({ event: ev.event, ...r })
      if (verbose && r.ok) log(`  ✓ ${ev.event} sealed`)
      else if (verbose && !r.ok) log(`  ✗ ${ev.event} failed (${r.offline ? 'offline' : r.status})`)
    }
  }

  // ── Step 7: Build sovereign manifest ─────────────────────────────────────
  const manifest = buildManifest({ filename, source, seal, errant, dispatchList, route, wormResults })

  // ── Step 8: POST manifest to BOB TRUST-DEED-GATE ─────────────────────────
  let bobResult = { ok: false, offline: true }
  if (!dryRun) {
    log('§ BOB: TRUST-DEED-GATE...')
    bobResult = await postBob(manifest)
    log(`§ BOB: ${bobResult.ok ? '✓ admitted' : `✗ ${bobResult.offline ? 'offline' : bobResult.status}`}`)
  }

  if (verbose) {
    console.error(`
╔══════════════════════════════════════════════════════════╗
║  BRIDGE COMPLETE                                         ║
╠══════════════════════════════════════════════════════════╣
║  Program:  ${filename.padEnd(44)} ║
║  Seal:     ${seal.hash.slice(0,16)}...${' '.repeat(26)} ║
║  ERRANT:   ${errant.ok ? '✓ verified' : '✗ failed  '}                                   ║
║  Agent:    ${(route.emoji + ' ' + route.agent).padEnd(44)} ║
║  WORM:     ${String(wormResults.filter(r=>r.ok).length).padStart(2)}/${String(wormResults.length).padEnd(2)} sealed                                   ║
║  BOB:      ${bobResult.ok ? '✓ admitted' : bobResult.offline ? '⚠ offline' : '✗ rejected'}                                  ║
║  Ω                                                       ║
╚══════════════════════════════════════════════════════════╝`)
  }

  return {
    ok:       true,
    manifest,
    seal,
    errant,
    route,
    bobResult,
    dispatchList,
  }
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2)
  const file    = args.find(a => !a.startsWith('--'))
  const verbose = args.includes('--verbose') || args.includes('-v')
  const dryRun  = args.includes('--dry') || args.includes('--dry-run')
  const json    = args.includes('--json')

  if (!file) {
    console.error('Usage: node bridge.mjs <program.meta> [--verbose] [--dry-run] [--json]')
    process.exit(1)
  }

  const source = readFileSync(file, 'utf8')
  const result = await bridge(source, file, { verbose, dryRun })

  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (result.ok) {
    console.log(`§ ${result.route.emoji} ${result.route.agent} · seal ${result.seal.hash.slice(0,16)}... · Ω`)
  } else {
    console.error(`✗ Bridge failed: ${result.error}`)
    process.exit(1)
  }
}

if (process.argv[1]?.endsWith('bridge.mjs')) {
  main().catch(e => { console.error(e); process.exit(1) })
}
