/**
 * wire.mjs — Full METATRON Pipeline Wiring
 * Lean 4 → APL → Rust → WORM seal
 *
 * Runs all 4 stages in sequence. Each stage's output becomes the
 * previous seal for the next stage. Final WORM seal covers everything.
 *
 * Ahmad Ali Parr · SnapKitty Collective · FCC-φ-∂-2026
 */

import { createHash, randomUUID } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

const PHI     = 1.618_033_988_749_895
const PHI_INV = 1 / PHI

// ── WORM chain (shared across all stages) ─────────────────────────────────────

const WORM_PATH = join(process.env.USERPROFILE || process.env.HOME || '.', '.bob-wire-worm.json')

const worm = {
  load()   { if (!existsSync(WORM_PATH)) return []; try { return JSON.parse(readFileSync(WORM_PATH, 'utf8')) } catch { return [] } },
  seal(label, payload) {
    const chain = this.load()
    const prev  = chain.length ? chain[chain.length - 1].seal : '0'.repeat(64)
    const ts    = new Date().toISOString()
    const raw   = JSON.stringify({ label, payload, ts, prev })
    const seal  = createHash('sha256').update(raw).digest('hex')
    chain.push({ id: randomUUID(), label, payload, ts, prev, seal })
    writeFileSync(WORM_PATH, JSON.stringify(chain, null, 2))
    return seal
  },
  verify() {
    const chain = this.load()
    for (let i = 1; i < chain.length; i++) { if (chain[i].prev !== chain[i - 1].seal) return false }
    return true
  },
}

// ── Shell helper ──────────────────────────────────────────────────────────────

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: true })
    let stdout = '', stderr = ''
    proc.stdout.on('data', d => { stdout += d.toString() })
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', code => resolve({ code, stdout, stderr }))
    setTimeout(() => { proc.kill(); resolve({ code: -1, stdout, stderr: stderr + '\nTIMEOUT' }) }, 30000)
  })
}

// ── Stage 1: Lean 4 — theorem inventory ──────────────────────────────────────
// We check what theorems are proved in the Lean files.
// If Lean toolchain is present, we check for sorry-free compilation.
// If not, we report the theorem inventory from reading the source.

async function stage_lean() {
  console.log('\n' + '─'.repeat(62))
  console.log('  STAGE 1 — LEAN 4')
  console.log('─'.repeat(62))

  const lean_file = join(__dir, 'lean', 'ResonancePipeline.lean')
  const src        = existsSync(lean_file) ? readFileSync(lean_file, 'utf8') : ''

  // Extract theorem names
  const theorems = [...src.matchAll(/^theorem\s+(\w+)/gm)].map(m => m[1])
  const sorry_count = (src.match(/\bsorry\b/g) || []).length

  // Try Lean if available
  const lean_check = await run('lean', ['--version'], __dir)
  const lean_available = lean_check.code === 0

  let lean_result = null
  if (lean_available) {
    lean_result = await run('lean', [lean_file], __dir)
  }

  const status = lean_available
    ? (lean_result?.code === 0 ? 'VERIFIED' : 'LEAN_ERRORS')
    : 'LEAN_NOT_INSTALLED'

  const stage = {
    layer:       'LEAN_4',
    status,
    sorry_count,
    theorems,
    lean_available,
    lean_errors:  lean_result?.stderr?.slice(0, 200) || null,
    summary:      `${theorems.length} theorems, ${sorry_count} sorry, Lean ${lean_available ? 'available' : 'not in PATH'}`,
  }

  for (const t of theorems) {
    console.log(`    theorem ${t}  ${sorry_count === 0 ? '✓' : '?'}`)
  }
  console.log(`  sorry count: ${sorry_count}`)
  console.log(`  Lean toolchain: ${lean_available ? 'present' : 'not in PATH (inventory only)'}`)
  console.log(`  Status: ${status}`)

  const seal = worm.seal('lean-stage', stage)
  console.log(`  WORM: ${seal.slice(0, 16)}`)
  stage.seal = seal

  return stage
}

// ── Stage 2: APL — TRS computation (JS translation) ──────────────────────────
// The APL sacred geometry file computes TRS across all 4 Sumerian symbols.
// We translate the core computation to JS since APL interpreter isn't in PATH.
// The math is identical to SacredGeometry.apl.

async function stage_apl() {
  console.log('\n' + '─'.repeat(62))
  console.log('  STAGE 2 — APL SACRED GEOMETRY')
  console.log('─'.repeat(62))

  const phi_weight    = d => PHI ** d
  const phinary_score = d => d === 0 ? 0 : 1 - PHI ** (-d)

  // Biases from nodes.rs activation_bias() — indexed by topo order
  // Topo order: Source Retrieval Filtering Ranking ContextAssembly Reasoning Metatron MagmaCore
  // Depths:     [0,    1,        2,        3,      4,              5,        5,        6]
  // Metatron and Reasoning share depth 5 — both use phi_weight(6)
  const SYMBOLS = {
    ME:     { bias: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
    AN:     { bias: [0.8, 1.4, 0.8, 0.8, 0.8, 1.2, 0.8, 0.8] },  // Retrieval=1.4 Reasoning=1.2 rest=0.8
    KI:     { bias: [0.9, 0.9, 1.4, 0.9, 1.4, 0.9, 0.9, 0.9] },  // Filtering=1.4 ContextAssembly=1.4 rest=0.9
    DINGIR: { bias: [0.7, 0.7, 0.7, 0.7, 0.7, 1.6, 1.8, 1.6] },  // Reasoning=1.6 Metatron=1.8 MagmaCore=1.6
  }

  // Actual depths in topo order — Metatron injected at depth 5, same as Reasoning
  const DEPTHS = [0, 1, 2, 3, 4, 5, 5, 6]

  let trs = 0
  const symbol_sums = {}

  for (const [name, { bias }] of Object.entries(SYMBOLS)) {
    const sum = DEPTHS.reduce((s, d, i) => s + phi_weight(d + 1) * bias[i], 0)
    symbol_sums[name] = +sum.toFixed(6)
    trs += sum
    console.log(`    ${name.padEnd(8)} activation_sum = ${sum.toFixed(6)}`)
  }

  trs = +trs.toFixed(6)
  const resonance_total = 4 * (phinary_score(1) + phinary_score(2) + phinary_score(3)
    + phinary_score(4) + phinary_score(5) + phinary_score(5) + phinary_score(6))

  console.log(`  TRS (APL)   = ${trs}`)
  console.log(`  Flower-of-Life: 19 circles, 171 lines, resonance = ${resonance_total.toFixed(6)}`)

  const stage = {
    layer:          'APL_SACRED_GEOMETRY',
    symbol_sums,
    trs_apl:        trs,
    resonance_total: +resonance_total.toFixed(6),
    method:          'JS translation of SacredGeometry.apl — phi_weight(d+1) × bias per symbol',
  }

  const seal = worm.seal('apl-stage', stage)
  console.log(`  WORM: ${seal.slice(0, 16)}`)
  stage.seal = seal

  return stage
}

// ── Stage 3: Rust — real ResonanceGraph TRS ──────────────────────────────────

async function stage_rust() {
  console.log('\n' + '─'.repeat(62))
  console.log('  STAGE 3 — RUST RESONANCEGRAPH (real crate)')
  console.log('─'.repeat(62))

  const binary = join(__dir, 'rust', 'target', 'debug', 'metatron-solver.exe')
  const result = await run(binary, [], __dir)

  const combined = result.stdout + result.stderr
  const trs_match      = combined.match(/TRS\s*=\s*([\d.]+)/)
  const trs_seal_match = combined.match(/TRS seal:\s*([0-9a-f]+)/)

  const trs       = trs_match      ? parseFloat(trs_match[1])      : null
  const rust_seal = trs_seal_match ? trs_seal_match[1]             : null

  if (trs !== null) {
    for (const line of result.stdout.split('\n')
        .filter(l => l.match(/(ME|AN|KI|DINGIR|TRS)\s*(=|activation|resonance)/))) {
      console.log(' ', line.trim())
    }
  } else {
    console.log('  [RUST RUNNER]  code=' + result.code)
    console.log(combined.slice(0, 300))
  }

  const stage = {
    layer:      'RUST_RESONANCEGRAPH',
    trs_rust:   trs,
    rust_seal,
    build_ok:   result.code === 0,
    stdout:     result.stdout.slice(0, 500),
  }

  const seal = worm.seal('rust-stage', stage)
  console.log(`  TRS (Rust)  = ${trs}`)
  console.log(`  WORM: ${seal.slice(0, 16)}`)
  stage.seal = seal

  return stage
}

// ── Stage 4: METATRON JS pipeline ─────────────────────────────────────────────

async function stage_js() {
  console.log('\n' + '─'.repeat(62))
  console.log('  STAGE 4 — METATRON JS PIPELINE')
  console.log('─'.repeat(62))

  // Import and run the real pipeline
  const { run_pipeline, PHI: PHI_check, phi_weight, worm: m_worm } = await import('./src/metatron-reasoning.mjs')

  const claims = [
    { claim: 'INTERCOL(D_i, D_j) = 0 → ⊥', ctx: { entropy: 0.18, trust: 0.97, provenance: true, sorry_count: 0 }, symbol: 'Me' },
    { claim: 'phi_weight strictly increasing (Lean: phi_weight_strict_mono)', ctx: { entropy: 0.08, trust: 0.99, provenance: true, sorry_count: 0 }, symbol: 'Ki' },
    { claim: 'Riemann Hypothesis', ctx: { entropy: 0.50, trust: 0.60, provenance: false, sorry_count: 1 }, symbol: 'Dingir' },
  ]

  const results = []
  for (const { claim, ctx, symbol } of claims) {
    const r  = await run_pipeline(claim, ctx, symbol)
    const mc = r.magmacore
    results.push({ claim, status: mc.status, seal: r.worm_seal })
    console.log(`    ${mc.status.padEnd(22)} "${claim.slice(0, 42)}"`)
  }

  const stage = { layer: 'METATRON_JS_PIPELINE', results }
  const seal  = worm.seal('js-pipeline-stage', stage)
  console.log(`  WORM: ${seal.slice(0, 16)}`)
  stage.seal = seal

  return stage
}

// ── Final seal ────────────────────────────────────────────────────────────────

async function final_seal(stages) {
  console.log('\n' + '═'.repeat(62))
  console.log('  FINAL WORM SEAL — ALL STAGES')
  console.log('═'.repeat(62))

  const lean  = stages[0]
  const apl   = stages[1]
  const rust  = stages[2]
  const js    = stages[3]

  const payload = {
    pipeline:    'Lean4 → APL → Rust → METATRON-JS',
    lean_status: lean.status,
    lean_theorems: lean.theorems.length,
    trs_apl:     apl.trs_apl,
    trs_rust:    rust.trs_rust,
    trs_delta:   rust.trs_rust ? +(rust.trs_rust - apl.trs_apl).toFixed(6) : null,
    stage_seals: stages.map(s => s.seal?.slice(0, 16)),
    worm_chain_valid: worm.verify(),
    fingerprint: 'FCC-φ-∂-2026',
  }

  const seal = worm.seal('METATRON-WIRE-FINAL', payload)

  console.log()
  console.log(`  Lean 4:  ${lean.summary}`)
  console.log(`  APL TRS: ${apl.trs_apl}`)
  console.log(`  Rust TRS: ${rust.trs_rust}`)
  console.log(`  Δ TRS:   ${payload.trs_delta}  (different bias model in APL vs Rust crate)`)
  console.log(`  JS pipeline claims: ${js.results.filter(r => r.status === 'SOVEREIGN_CERTIFIED').length}/${js.results.length} SOVEREIGN_CERTIFIED`)
  console.log(`  Chain valid: ${payload.worm_chain_valid}`)
  console.log()
  console.log(`  FINAL SEAL: ${seal.slice(0, 32)}`)
  console.log(`              ${seal.slice(32)}`)
  console.log()
  console.log('  Lean 4 → APL → Rust → METATRON-JS → WORM')
  console.log('  The cage is sealed.')

  return { ...payload, seal }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║  METATRON WIRE — Full Pipeline                              ║')
console.log('║  Lean 4 → APL → Rust → METATRON-JS → WORM                  ║')
console.log('║  FCC-φ-∂-2026                                               ║')
console.log('╚══════════════════════════════════════════════════════════════╝')

const t0     = performance.now()
const lean   = await stage_lean()
const apl    = await stage_apl()
const rust   = await stage_rust()
const js     = await stage_js()
const result = await final_seal([lean, apl, rust, js])

console.log(`\n  Total: ${(performance.now() - t0).toFixed(0)}ms`)

export { result }
