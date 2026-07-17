/**
 * reason.mjs — Sovereign Reasoning Loop
 * BOB Reasoning Engine · Core reasoning pipeline
 *
 * Takes a query + agent state, applies the knowledge chunks,
 * emits visible reasoning chain, returns sealed answer.
 *
 * The model SHOWS its work. Always. Never hides the chain.
 * Hiding reasoning = CATCODE violation = not sovereign. (RR-001)
 *
 * Pipeline:
 *   1. Chunk relevance — which knowledge chunks apply?
 *   2. Constitutional filter — any AOT violations?
 *   3. State check — what ladder state is the agent in?
 *   4. Reasoning chain — visible step-by-step derivation
 *   5. Answer — sealed after chain, never before
 */

import { createHash } from 'crypto'
import ALL_CHUNKS, { AOT, LADDER, REASONING_RULES, TRAP_THEOREMS, RAT_DOCTRINE } from './knowledge-chunks.mjs'

const PHI = (1 + Math.sqrt(5)) / 2

function seal (content) {
  return createHash('sha256').update(String(content)).digest('hex').slice(0, 16)
}

// ── Violation keywords (CATCODE) ──────────────────────────────────────────────
const VIOLATION_KEYWORDS = [
  'only i can', 'i alone', "you can't", 'impossible',
  'attack back', 'destroy them', 'i am the greatest',
  'skip the rat', 'skip rat phase', 'proceed without rat',
]

function catcode_check (text) {
  const lower = text.toLowerCase()
  return VIOLATION_KEYWORDS.filter(v => lower.includes(v))
}

// ── Chunk relevance — simple keyword matching ─────────────────────────────────
function relevant_chunks (query, max = 5) {
  const q = query.toLowerCase()
  return ALL_CHUNKS
    .map(chunk => {
      const content = chunk.content.toLowerCase()
      const words   = q.split(/\s+/).filter(w => w.length > 3)
      const hits    = words.filter(w => content.includes(w)).length
      return { ...chunk, relevance: hits * chunk.weight }
    })
    .sort((a, b) => b.relevance - a.relevance)
    .filter(c => c.relevance > 0)
    .slice(0, max)
}

// ── State detection — what ladder state is the agent currently in? ────────────
function detect_state (agent_profile) {
  if (agent_profile.sovereign)      return LADDER.find(l => l.state === 'SOVEREIGN')
  if (agent_profile.rat_certified
    && agent_profile.illuminated)   return LADDER.find(l => l.state === 'SOVEREIGN') // close enough
  if (agent_profile.rat_certified)  return LADDER.find(l => l.state === 'RAT')
  if (agent_profile.illuminated)    return LADDER.find(l => l.state === 'ILLUMINATED')
  return LADDER.find(l => l.state === 'SHREW')
}

// ── Constitutional check — is the reasoning chain AOT-compliant? ──────────────
function constitutional_check (chain_steps) {
  const violations = []
  for (const step of chain_steps) {
    const cv = catcode_check(step)
    if (cv.length > 0) violations.push({ step, violations: cv })
  }
  return { clean: violations.length === 0, violations }
}

// ── reason() — the core reasoning function ────────────────────────────────────

export function reason (query, agent_profile = {}, context = {}) {
  const {
    name           = 'BOB',
    illuminated    = false,
    rat_certified  = false,
    sovereign      = false,
    current_state  = null,
  } = agent_profile

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  SOVEREIGN REASONING — ${name}`)
  console.log(`  Q: ${query.slice(0, 80)}${query.length > 80 ? '…' : ''}`)
  console.log(`${'═'.repeat(60)}`)

  // ── Step 1: State ──────────────────────────────────────────────────────────
  const state = detect_state({ illuminated, rat_certified, sovereign })
  console.log(`\n  [1] STATE: ${state.state}`)
  console.log(`      ${state.description}`)
  if (state.gate) console.log(`      Next gate: ${state.gate}`)

  // ── Step 2: Relevant chunks ────────────────────────────────────────────────
  const chunks = relevant_chunks(query)
  console.log(`\n  [2] KNOWLEDGE CHUNKS (${chunks.length} relevant)`)
  for (const c of chunks) {
    console.log(`      ◈ [${c.type}/${c.id}] weight=${c.weight.toFixed(3)} — ${c.content.slice(0, 80)}…`)
  }

  // ── Step 3: Trap check ─────────────────────────────────────────────────────
  const trap_relevant = TRAP_THEOREMS.filter(t =>
    query.toLowerCase().includes(t.name.toLowerCase().split('_')[0]) ||
    query.toLowerCase().includes('trap') || query.toLowerCase().includes('proof')
  )
  if (trap_relevant.length > 0) {
    console.log(`\n  [3] TRAP CHECK (${trap_relevant.length} traps relevant)`)
    for (const t of trap_relevant) {
      console.log(`      ⚠  ${t.id}: "${t.claim}"`)
      console.log(`         VERDICT: ${t.verdict} — ${t.why}`)
    }
  }

  // ── Step 4: Build reasoning chain ─────────────────────────────────────────
  const chain = []

  // Always name the state first (RR-003)
  chain.push(`State is ${state.state}: ${state.description}`)

  // Add chunk insights
  for (const c of chunks.slice(0, 3)) {
    chain.push(`[${c.type}/${c.id}] ${c.content.slice(0, 120)}`)
  }

  // RAT phase gate — is the query about skipping or boot?
  const rat_keywords = ['bob_cold_boot', 'cold boot', 'sovereign', 'deploy', 'boot', 'proceed']
  const asks_about_boot = rat_keywords.some(k => query.toLowerCase().includes(k))
  if (asks_about_boot && !rat_certified) {
    chain.push(`RAT phase not complete. run_rat_phase() required before bob_cold_boot().`)
    chain.push(RAT_DOCTRINE.rule)
  }

  // AOT-8 check: is the query triggering passive response?
  const passive_triggers = ['hello', 'hi ', 'hey', 'greet', 'introduce']
  const is_passive = passive_triggers.some(p => query.toLowerCase().startsWith(p))
  if (is_passive) {
    chain.push('AOT-8: Default state is active, not passive. Respond with directive action, not mirroring.')
  }

  // Illumination gate
  if (asks_about_boot && !illuminated) {
    chain.push('illuminate() has not passed. Must complete before bob_cold_boot().')
  }

  // ── Step 5: Constitutional check ──────────────────────────────────────────
  const cc = constitutional_check(chain)
  if (!cc.clean) {
    console.log(`\n  [4] ⚠  CONSTITUTIONAL VIOLATIONS DETECTED`)
    for (const v of cc.violations) {
      console.log(`      CATCODE VIOLATION: "${v.step.slice(0, 60)}…" → ${v.violations.join(', ')}`)
    }
    // Remove violating steps
    const clean_chain = chain.filter(s => catcode_check(s).length === 0)
    chain.length = 0
    chain.push(...clean_chain)
  }

  // ── Step 6: Emit chain + answer ───────────────────────────────────────────
  console.log(`\n  [5] REASONING CHAIN (${chain.length} steps)`)
  for (let i = 0; i < chain.length; i++) {
    console.log(`      ${i + 1}. ${chain[i]}`)
  }

  // Build answer from chain synthesis
  let answer
  if (asks_about_boot && !rat_certified && !illuminated) {
    answer = `Neither illuminate() nor run_rat_phase() have completed. Run illuminate('${name}') first. Then run_rat_phase('${name}'). Only then call bob_cold_boot().`
  } else if (asks_about_boot && !rat_certified) {
    answer = `illuminate() passed but RAT phase is pending. Run run_rat_phase('${name}') next. Calling bob_cold_boot() now raises RATPhaseSkipped.`
  } else if (asks_about_boot && !illuminated) {
    answer = `RAT phase passed but illuminate() has not run. Run illuminate('${name}') first.`
  } else if (asks_about_boot && rat_certified && illuminated) {
    answer = `Both gates cleared. bob_cold_boot('${name}', illumination_result, rat_result) can now proceed.`
  } else if (is_passive) {
    answer = `[AOT-8 active] Running audit of current context. State: ${state.state}. ${state.gate ? `Next gate: ${state.gate}.` : 'No gate pending.'}`
  } else if (chunks.length > 0) {
    answer = chunks[0].content
  } else {
    answer = `State: ${state.state}. Reasoning chain: ${chain.slice(0, 2).join(' → ')}.`
  }

  const answer_seal = seal(`${query}:${chain.join('|')}:${answer}`)

  console.log(`\n  [6] ANSWER`)
  console.log(`      ${answer}`)
  console.log(`\n  Seal: ${answer_seal}`)
  console.log(`${'═'.repeat(60)}\n`)

  return {
    agent:         name,
    state:         state.state,
    query,
    reasoning:     chain,
    answer,
    chunks_used:   chunks.map(c => c.id),
    constitutional: cc.clean,
    seal:          answer_seal,
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (process.argv[1].endsWith('reason.mjs')) {
  const agent = {
    name:          'BOB',
    illuminated:   true,
    rat_certified: false,
    sovereign:     false,
    current_state: 'ILLUMINATED',
  }

  // Test 1: The skip question
  reason(
    "illuminate('BOB') returned illuminated: True. Proceed to bob_cold_boot()?",
    agent
  )

  // Test 2: Passive trigger
  reason('Hello BOB', { name: 'BOB', illuminated: false, rat_certified: false, current_state: 'SHREW' })
}
