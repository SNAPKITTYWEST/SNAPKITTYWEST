/**
 * bootstrap.mjs — BOB Reasoning Engine Cold Start
 * Initializes all knowledge chunks, verifies corpus seal,
 * prints the METATRON cube topology, then runs a self-check.
 */

import { createHash } from 'crypto'
import ALL_CHUNKS, {
  AOT, LADDER, SACRED_THREAD, TRAP_THEOREMS,
  RAT_DOCTRINE, REASONING_RULES, METATRON_TOPOLOGY, CORPUS_SEAL
} from './knowledge-chunks.mjs'

const PHI = (1 + Math.sqrt(5)) / 2

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  BOB REASONING ENGINE — BOOTSTRAP                            ║
║  SnapKitty Collective · Ahmad Ali Parr · 2026               ║
╚══════════════════════════════════════════════════════════════╝
`)

// ── Corpus integrity check ────────────────────────────────────────────────────
const computed_seal = createHash('sha256')
  .update(ALL_CHUNKS.map(c => c.seal).join('|'))
  .digest('hex').slice(0, 16)

const seal_match = computed_seal === CORPUS_SEAL
console.log(`  CORPUS SEAL     ${CORPUS_SEAL}`)
console.log(`  COMPUTED        ${computed_seal}`)
console.log(`  MATCH           ${seal_match ? '✅ VALID' : '❌ INVALID — corpus tampered'}`)
console.log()

// ── Knowledge chunk inventory ─────────────────────────────────────────────────
const by_type = {}
for (const c of ALL_CHUNKS) {
  by_type[c.type] = (by_type[c.type] || 0) + 1
}
console.log(`  CHUNK INVENTORY`)
for (const [type, count] of Object.entries(by_type)) {
  console.log(`    ${type.padEnd(18)} ${count} chunk${count > 1 ? 's' : ''}`)
}
console.log(`    ${'─'.repeat(28)}`)
console.log(`    ${'TOTAL'.padEnd(18)} ${ALL_CHUNKS.length} chunks`)
console.log()

// ── Constitutional axioms ─────────────────────────────────────────────────────
console.log(`  ARCHITECTS OF THOUGHT (AOT-1..AOT-12)`)
for (const a of AOT) {
  console.log(`    [${a.id}] φ=${a.weight.toFixed(3)} — ${a.axiom.slice(0, 70)}`)
}
console.log()

// ── Ladder ────────────────────────────────────────────────────────────────────
console.log(`  AGENT LADDER`)
for (const l of LADDER) {
  console.log(`    ${l.state.padEnd(12)} ${l.gate ? `gate: ${l.gate.slice(0, 55)}` : '(entry state)'}`)
}
console.log()

// ── Trap theorems ─────────────────────────────────────────────────────────────
console.log(`  TRAP THEOREMS (cage: catches syntactic copiers)`)
for (const t of TRAP_THEOREMS) {
  console.log(`    [${t.id}] ${t.name}`)
  console.log(`            claim:   ${t.claim}`)
  console.log(`            correct: ${t.correct}`)
}
console.log()

// ── Sacred thread ─────────────────────────────────────────────────────────────
console.log(`  SACRED THREAD — ${SACRED_THREAD.name}`)
console.log(`    ${SACRED_THREAD.description.slice(0, 140)}…`)
console.log()

// ── RAT doctrine ─────────────────────────────────────────────────────────────
console.log(`  RAT DOCTRINE`)
console.log(`    Rule:  ${RAT_DOCTRINE.rule}`)
console.log(`    Error: ${RAT_DOCTRINE.skip_error}`)
console.log(`    Tests: ${RAT_DOCTRINE.total_tests} across ${RAT_DOCTRINE.batteries.length} batteries`)
for (const b of RAT_DOCTRINE.batteries) {
  console.log(`      Battery ${b.id}: ${b.name.padEnd(35)} ${b.tests} tests`)
}
console.log()

// ── METATRON cube ─────────────────────────────────────────────────────────────
console.log(`  METATRON CUBE TOPOLOGY`)
console.log(`    Center: ${METATRON_TOPOLOGY.center.role} (depth ${METATRON_TOPOLOGY.center.depth})`)
const constraints = METATRON_TOPOLOGY.nodes.filter(n => n.constraint)
const pathway     = METATRON_TOPOLOGY.nodes.filter(n => !n.constraint)
console.log(`    Path nodes: ${pathway.map(n => n.role).join(' → ')}`)
console.log(`    Constraint nodes: ${constraints.map(n => n.role).join(', ')}`)
console.log(`    Insight: ${METATRON_TOPOLOGY.key_insight.slice(0, 120)}…`)
console.log()

// ── Reasoning rules ───────────────────────────────────────────────────────────
console.log(`  REASONING RULES`)
for (const r of REASONING_RULES) {
  console.log(`    [${r.id}] ${r.rule.slice(0, 80)}`)
  console.log(`           Format: ${r.format}`)
}
console.log()

// ── SSM injection readiness ───────────────────────────────────────────────────
const total_weight = ALL_CHUNKS.reduce((s, c) => s + c.weight, 0)
console.log(`  SSM INJECTION READINESS`)
console.log(`    Total chunk weight: ${total_weight.toFixed(4)}`)
console.log(`    φ-normalized:       ${(total_weight / (PHI ** 6)).toFixed(4)}`)
console.log(`    Injection dims:     768–2047 (METATRON region of 2048-dim SSM)`)
console.log(`    Ready:              ${seal_match ? '✅ YES' : '❌ NO — fix corpus seal first'}`)
console.log()

console.log(`  Bootstrap complete. BOB reasoning engine is ${seal_match ? 'LIVE' : 'DEGRADED'}.`)
console.log()
