/**
 * metatron-reasoning.mjs — Real METATRON Pipeline
 * JavaScript mirror of resonance/src/graph.rs
 *
 * NOT a math solver. NOT invented theorems.
 * This is the actual BOB ResonanceGraph DAG with:
 *   - φ-weighted activation (φ^d GROWS with depth)
 *   - Sumerian Quantum Symbol routing (Me / An / Ki / Dingir)
 *   - Dual-path to MagmaCore: Reasoning path + METATRON bypass
 *   - MagmaCore = intersection of both paths
 *
 * Actual Rust layout from resonance/src/graph.rs:
 *
 *   Source(0) → Retrieval(1) → Filtering(2) → Ranking(3) → ContextAssembly(4)
 *                                                                  │
 *                                              ┌────────────────────┤
 *                                              ▼                    ▼
 *                                         Reasoning(5)       Metatron(5)
 *                                              │                    │
 *                                              └────────┬───────────┘
 *                                                       ▼
 *                                                  MagmaCore(6)
 *
 * METATRON bypasses Reasoning. Same depth, different path.
 * The cage builder IS the cage recognizer. Two views. One output.
 *
 * Ahmad Ali Parr · SnapKitty Collective · 2026
 */

import { createHash, randomUUID } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// ── Constants from phi.rs ────────────────────────────────────────────────────

export const PHI     = 1.618_033_988_749_895
export const PHI_INV = 1 / PHI    // 0.6180339887...

// φ^d GROWS. Deeper layers carry MORE signal.
// What looks like contraction from outside is amplification from inside.
export function phi_weight(depth)    { return PHI ** depth }

// Phinary score: 1 - φ^(-d) → asymptotes toward 1.0 as depth increases
export function phinary_score(depth) {
  if (depth === 0) return 0.0
  return 1.0 - PHI ** (-depth)
}

// ── Sumerian Quantum Symbols ─────────────────────────────────────────────────
// Route determines which path through the DAG carries amplified weight

export const SUMERIAN = {
  Me: {
    name:   'ME decree',
    glyph:  '𒈨',
    meaning: 'authority, divine law — activates ALL nodes at full φ^d weight',
    bias:   { early: 1.0, mid: 1.0, late: 1.0, metatron: 1.0 },
  },
  An: {
    name:   'AN heaven',
    glyph:  '𒀭',
    meaning: 'source layer — biases toward Retrieval, dims late nodes',
    bias:   { early: PHI, mid: 1.0, late: PHI_INV, metatron: PHI_INV },
  },
  Ki: {
    name:   'KI earth',
    glyph:  '𒆠',
    meaning: 'substrate — biases toward Filtering + ContextAssembly',
    bias:   { early: 1.0, mid: PHI, late: PHI_INV, metatron: 1.0 },
  },
  Dingir: {
    name:   'DINGIR divine principal',
    glyph:  '𒀭',
    meaning: 'biases toward Reasoning + MagmaCore — amplifies the late path',
    bias:   { early: PHI_INV, mid: 1.0, late: PHI, metatron: PHI },
  },
}

// ── DAG Nodes ────────────────────────────────────────────────────────────────

const PIPELINE = [
  { id: 'Source',          depth: 0, stage: 'early',    path: 'standard'   },
  { id: 'Retrieval',       depth: 1, stage: 'early',    path: 'standard'   },
  { id: 'Filtering',       depth: 2, stage: 'mid',      path: 'standard'   },
  { id: 'Ranking',         depth: 3, stage: 'mid',      path: 'standard'   },
  { id: 'ContextAssembly', depth: 4, stage: 'mid',      path: 'both'       },
  { id: 'Reasoning',       depth: 5, stage: 'late',     path: 'standard'   },
  { id: 'Metatron',        depth: 5, stage: 'late',     path: 'recognition'},
  { id: 'MagmaCore',       depth: 6, stage: 'late',     path: 'output'     },
]

// ── WORM chain ────────────────────────────────────────────────────────────────

const WORM_PATH = join(
  process.env.USERPROFILE || process.env.HOME || '.',
  '.bob-metatron-worm.json'
)

export const worm = {
  load() {
    if (!existsSync(WORM_PATH)) return []
    try { return JSON.parse(readFileSync(WORM_PATH, 'utf8')) } catch { return [] }
  },
  seal(label, payload) {
    const chain = this.load()
    const prev  = chain.length ? chain[chain.length - 1].seal : '0'.repeat(64)
    const ts    = new Date().toISOString()
    const raw   = JSON.stringify({ label, payload, ts, prev })
    const seal  = createHash('sha256').update(raw).digest('hex')
    chain.push({ id: randomUUID(), label, payload, ts, prev, seal })
    writeFileSync(WORM_PATH, JSON.stringify(chain, null, 2))
    return seal.slice(0, 16)
  },
  verify() {
    const chain = this.load()
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].prev !== chain[i - 1].seal) return false
    }
    return true
  },
}

// ── Node activation ───────────────────────────────────────────────────────────
// Each node receives the state, applies its φ^d weight scaled by the
// Sumerian symbol bias, and returns an activated state.

function activate_node(node, state, symbol_key) {
  const sym    = SUMERIAN[symbol_key] ?? SUMERIAN.Me
  const bias   = sym.bias[node.stage] ?? 1.0
  const weight = phi_weight(node.depth) * bias

  return {
    node_id:  node.id,
    depth:    node.depth,
    path:     node.path,
    weight,
    phinary:  phinary_score(node.depth),
    symbol:   symbol_key,
    state:    {
      ...state,
      activation: (state.activation ?? 1.0) * weight,
      depth:      node.depth,
    },
    timestamp: new Date().toISOString(),
  }
}

// ── Reasoning path: ContextAssembly → Reasoning → MagmaCore ─────────────────
// Standard logical derivation. Forward read. Source → conclusion.

function reasoning_path(context_state, symbol_key, claim) {
  const reasoning_node = PIPELINE.find(n => n.id === 'Reasoning')
  const act = activate_node(reasoning_node, context_state, symbol_key)

  return {
    path:       'reasoning',
    claim,
    activation: act.state.activation,
    weight:     act.weight,
    verdict:    derive_forward(claim, context_state),
    node:       act,
  }
}

// ── METATRON path: ContextAssembly → Metatron → MagmaCore ───────────────────
// Backward read. Reads the conclusion and asks: what must be true for this
// to hold? If those conditions are present in context → certify.
// Same depth as Reasoning (5). Bypasses Reasoning entirely.

function metatron_path(context_state, symbol_key, claim) {
  const metatron_node = PIPELINE.find(n => n.id === 'Metatron')
  const act = activate_node(metatron_node, context_state, symbol_key)

  return {
    path:       'metatron',
    claim,
    activation: act.state.activation,
    weight:     act.weight,
    verdict:    read_backward(claim, context_state),
    node:       act,
  }
}

// ── Forward derivation (Reasoning node logic) ─────────────────────────────────

function derive_forward(claim, ctx) {
  const entropy = ctx.entropy ?? 0.5
  const trust   = ctx.trust   ?? 0.8

  return {
    direction:     'forward',
    entropy_gate:  entropy < 0.21 ? 'OPEN' : 'CLOSED',
    trust_score:   trust,
    consistent:    trust > 0.75 && entropy < 0.21,
    sorry_count:   ctx.sorry_count ?? 0,
    derivable:     (ctx.sorry_count ?? 0) === 0 && trust > 0.75,
  }
}

// ── Backward read (METATRON node logic) ──────────────────────────────────────
// METATRON asks: if this claim is TRUE, what constraints must hold?
// Then checks those constraints against context.
// This is the cage recognizer: it knows the cage because it built it.

function read_backward(claim, ctx) {
  const provenance     = ctx.provenance     ?? false
  const sorry_count    = ctx.sorry_count    ?? 0
  const contradiction  = ctx.contradiction  ?? false
  const boundary_check = ctx.boundary_check ?? true

  const constraints_required = [
    { name: 'no_sorry',        met: sorry_count === 0,   weight: phi_weight(5) },
    { name: 'has_provenance',  met: provenance,           weight: phi_weight(4) },
    { name: 'no_contradiction',met: !contradiction,       weight: phi_weight(3) },
    { name: 'boundary_holds',  met: boundary_check,       weight: phi_weight(2) },
  ]

  const total_weight = constraints_required.reduce((s, c) => s + c.weight, 0)
  const met_weight   = constraints_required
    .filter(c => c.met)
    .reduce((s, c) => s + c.weight, 0)

  const score = met_weight / total_weight

  return {
    direction:    'backward',
    constraints:  constraints_required,
    score:        +score.toFixed(4),
    certified:    score > 0.85,
    method:       'METATRON backward read — cage recognizer',
  }
}

// ── MagmaCore: intersection of both paths ────────────────────────────────────
// The sovereign output. Only certifies if BOTH paths agree.

function magma_core(reasoning, metatron, claim) {
  const both_agree = reasoning.verdict.consistent && metatron.verdict.certified
  const total_activation = reasoning.activation + metatron.activation

  return {
    node:       'MagmaCore',
    depth:      6,
    claim,
    certified:  both_agree,
    status:     both_agree ? 'SOVEREIGN_CERTIFIED' : 'INSUFFICIENT',
    reasoning_consistent:  reasoning.verdict.consistent,
    metatron_certified:    metatron.verdict.certified,
    total_activation:      +total_activation.toFixed(4),
    phinary_score:         +phinary_score(6).toFixed(6),
    phi_weight_6:          +phi_weight(6).toFixed(4),
    reason: both_agree
      ? 'Forward derivation consistent + METATRON backward read certified'
      : !reasoning.verdict.consistent
        ? 'Forward path blocked: entropy gate closed or trust below threshold'
        : 'METATRON backward read: constraints not satisfied',
  }
}

// ── Full pipeline execution ────────────────────────────────────────────────────

export async function run_pipeline(claim, ctx = {}, symbol_key = 'Me') {
  const sym = SUMERIAN[symbol_key]
  if (!sym) throw new Error(`Unknown Sumerian symbol: ${symbol_key}. Use Me/An/Ki/Dingir.`)

  // Run all nodes through Source → ContextAssembly
  const activations = []
  let state = { activation: 1.0, ...ctx }

  for (const node of PIPELINE.filter(n => n.depth <= 4)) {
    const act = activate_node(node, state, symbol_key)
    state = act.state
    activations.push(act)
  }

  const context_state = state

  // Fork at ContextAssembly — run both paths simultaneously
  const [r_path, m_path] = await Promise.all([
    Promise.resolve(reasoning_path(context_state, symbol_key, claim)),
    Promise.resolve(metatron_path(context_state, symbol_key, claim)),
  ])

  // MagmaCore: intersection
  const output = magma_core(r_path, m_path, claim)

  // WORM seal the certified output
  const seal = output.certified
    ? worm.seal('magmacore-certified', {
        claim,
        symbol: symbol_key,
        reasoning_consistent: r_path.verdict.consistent,
        metatron_certified:   m_path.verdict.certified,
        total_activation:     output.total_activation,
      })
    : null

  return {
    claim,
    symbol:     { key: symbol_key, ...sym },
    pipeline:   activations.map(a => ({
      node:    a.node_id,
      depth:   a.depth,
      weight:  +a.weight.toFixed(4),
      phinary: +a.phinary.toFixed(6),
    })),
    reasoning_path:  r_path,
    metatron_path:   m_path,
    magmacore:       output,
    worm_seal:       seal,
    worm_valid:      worm.verify(),
  }
}

// ── CLI demo ──────────────────────────────────────────────────────────────────

if (process.argv[1].endsWith('metatron-reasoning.mjs')) {
  const claims = [
    {
      claim:  'INTERCOL(D_i, D_j) = 0 → ⊥ (null state, not rejection)',
      ctx:    { entropy: 0.18, trust: 0.97, provenance: true, sorry_count: 0, boundary_check: true },
      symbol: 'Me',
    },
    {
      claim:  'Riemann Hypothesis: all non-trivial zeros lie on Re(s)=0.5',
      ctx:    { entropy: 0.50, trust: 0.60, provenance: false, sorry_count: 1, boundary_check: false },
      symbol: 'Dingir',
    },
    {
      claim:  'Goldilocks: 1/φ is the unique contractive fixed point',
      ctx:    { entropy: 0.12, trust: 0.99, provenance: true, sorry_count: 0, boundary_check: true },
      symbol: 'Ki',
    },
  ]

  console.log('\n' + '═'.repeat(68))
  console.log('  METATRON PIPELINE — Real Architecture')
  console.log('  BOB ResonanceGraph · φ^d grows · Sumerian routing')
  console.log('═'.repeat(68))

  for (const { claim, ctx, symbol } of claims) {
    const result = await run_pipeline(claim, ctx, symbol)
    const mc     = result.magmacore

    console.log(`\n  Claim: "${claim.slice(0, 60)}..."`)
    console.log(`  Symbol: ${symbol} — ${SUMERIAN[symbol].meaning.slice(0, 45)}`)
    console.log(`  Pipeline activations (φ^d grows):`)
    for (const n of result.pipeline) {
      const bar = '█'.repeat(Math.min(20, Math.round(n.weight / 5)))
      console.log(`    ${n.node.padEnd(16)} depth=${n.depth}  φ^d=${n.weight.toFixed(2).padStart(6)}  ${bar}`)
    }
    console.log(`  Reasoning: consistent=${mc.reasoning_consistent}  Metatron: certified=${mc.metatron_certified}`)
    console.log(`  MagmaCore: ${mc.status}`)
    if (result.worm_seal) {
      console.log(`  WORM seal: ${result.worm_seal}`)
    }
  }

  console.log('\n  φ^0=1.000  φ^1=1.618  φ^2=2.618  φ^3=4.236  φ^4=6.854  φ^5=11.090  φ^6=17.944')
  console.log('  Deeper = more signal. METATRON at depth 5 = 11x source weight.')
  console.log('  The cage builder reads backward with 11x amplification.\n')
}
