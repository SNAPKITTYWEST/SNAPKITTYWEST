#!/usr/bin/env node
// omega-field.mjs — SNAPKITTYWEST Ω Field Reader
// Reads all repos in the SNAPKITTYWEST org via GitHub API
// Computes entropy(E), evaluates coherent(system), maps intercoil graph
// Emits SHA-256 WORM seal and patches README between OMEGA-FIELD markers

import { createHash } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'

const ENTROPY_THRESHOLD = 0.21
const STALE_DAYS = 30
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''

// Full SnapKitty constellation — all three accounts
const SOURCES = [
  { kind: 'user', name: 'SNAPKITTYWEST' },
  { kind: 'org',  name: 'SNAPKITTY-COLLECTIVE-LIMITED-FLP' },
  { kind: 'user', name: 'AHMADALIPARR' },
]

// Intercoil anchors — repos that share the memory graph / bifrost bus
const INTERCOIL = {
  memory_graph:   ['bob-orchestrator','resonance-core','SNAPKITTY-PROOFS','agent-farm-gauntlet','holy-agents','snapkitty-collective','sovereign-ai-standard','snapkitty-enterprise-trust'],
  bifrost_engine: ['bob-orchestrator','holy-agents','apple-ii-universal-machine','DEVFLOW-FINANCE','sacm-bridge','snapkitty-infrastructure-network','seit-institute'],
}

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`GitHub API ${path} → ${res.status}`)
  return res.json()
}

async function fetchSourceRepos({ kind, name }) {
  let page = 1, all = []
  const base = kind === 'org' ? `/orgs/${name}` : `/users/${name}`
  while (true) {
    const batch = await api(`${base}/repos?per_page=100&page=${page}`)
    all = all.concat(batch.map(r => ({ ...r, _source: name })))
    if (batch.length < 100) break
    page++
  }
  return all
}

async function fetchAllRepos() {
  const batches = await Promise.all(SOURCES.map(fetchSourceRepos))
  return batches.flat()
}

function entropy(repos) {
  const now = Date.now()
  const staleMs = STALE_DAYS * 86400 * 1000
  const stale = repos.filter(r => now - new Date(r.pushed_at).getTime() > staleMs).length
  return stale / repos.length
}

function intercoilCheck(repos, anchor) {
  const names = new Set(repos.map(r => r.name))
  return INTERCOIL[anchor].filter(n => names.has(n))
}

function wormSeal(payload) {
  return createHash('sha256').update(payload).digest('hex')
}

function bar(val, max = 1, width = 20) {
  const filled = Math.round((val / max) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

async function main() {
  console.log('⟦ Ω ⟧ reading SNAPKITTYWEST field…')

  const repos = await fetchAllRepos()
  const E = entropy(repos)
  const coherent = E < ENTROPY_THRESHOLD

  const icoilMem  = intercoilCheck(repos, 'memory_graph')
  const icoilBif  = intercoilCheck(repos, 'bifrost_engine')
  const intercoilValid = icoilMem.length > 0 && icoilBif.length > 0

  const resonantCore = coherent && intercoilValid
  const omegaValid   = resonantCore

  const ts      = new Date().toISOString()
  const payload = `SNAPKITTYWEST|${repos.length}|${E.toFixed(6)}|${omegaValid}|${ts}`
  const seal    = wormSeal(payload)

  const statusLine = omegaValid
    ? `✅ \`meta_block(valid)\` — RESONANCE FIELD ACTIVE`
    : `⚠️ \`meta_block(degraded)\` — FIELD BELOW THRESHOLD`

  const pagesRepos = repos.filter(r => r.has_pages)
  const activeRepos = repos.filter(r => {
    const days = (Date.now() - new Date(r.pushed_at).getTime()) / 86400000
    return days < STALE_DAYS
  })

  // Per-source counts
  const srcCounts = SOURCES.map(s => {
    const n = repos.filter(r => r._source === s.name).length
    return `${s.name} (${n})`
  }).join(' · ')

  // Build the README section
  const section = `
<!--OMEGA-FIELD:START-->
<div align="center">

---

## ⟦ Ω ⟧ SNAPKITTYWEST RESONANCE FIELD

${statusLine}

| Metric | Value |
|--------|-------|
| Constellation | ${srcCounts} |
| Total repos | **${repos.length}** |
| Active (< ${STALE_DAYS}d) | **${activeRepos.length}** |
| GitHub Pages live | **${pagesRepos.length}** |
| Entropy E | **${E.toFixed(4)}** / threshold 0.21 |
| Coherent | **${coherent ? 'YES' : 'NO'}** |
| Intercoil · memory\_graph | ${icoilMem.slice(0,4).join(' · ') || 'none'} |
| Intercoil · bifrost | ${icoilBif.slice(0,4).join(' · ') || 'none'} |
| Ω WORM Seal | \`${seal}\` |
| Last field read | \`${ts}\` |

\`\`\`
Entropy field: [${bar(E)}] ${(E * 100).toFixed(1)}%
                           ▲
                     threshold 0.21
\`\`\`

\`\`\`apl
REPO  ← ${repos.length}
STACK ← ⌿REPO⍴1
TRUST ← ∧/STACK   ⍝ ${coherent ? 'TRUE' : 'FALSE'}
CODE  ← +/STACK   ⍝ ${repos.length}
Ω     ← TRUST∧CODE
\`\`\`

\`\`\`prolog
coherent(system) :-
    entropy(E), E < 0.21,     % E = ${E.toFixed(4)} → ${E < 0.21 ? 'PASS' : 'FAIL'}
    intercoil(_, memory_graph),% ${icoilMem.length} connected → ${icoilMem.length > 0 ? 'PASS' : 'FAIL'}
    intercoil(_, bifrost_engine).% ${icoilBif.length} connected → ${icoilBif.length > 0 ? 'PASS' : 'FAIL'}

meta_block(${omegaValid ? 'valid' : 'degraded'}).
\`\`\`

> ☉ Source → 🧠 Graph → ⚙️ Agents → 🔐 Constraints → 🌈 Execution → 🏛️ Reality

*Field auto-updates every 6 hours via [omega-field.mjs](./omega-field.mjs)*

</div>

<!--OMEGA-FIELD:END-->
`.trim()

  // Patch README.md
  const readme = readFileSync('README.md', 'utf8')
  let patched
  if (readme.includes('<!--OMEGA-FIELD:START-->')) {
    patched = readme.replace(
      /<!--OMEGA-FIELD:START-->[\s\S]*?<!--OMEGA-FIELD:END-->/,
      section
    )
  } else {
    // Inject after first <div align="center"> block
    patched = section + '\n\n' + readme
  }
  writeFileSync('README.md', patched)

  console.log(`✓ repos: ${repos.length} | entropy: ${E.toFixed(4)} | omega: ${omegaValid ? 'VALID' : 'DEGRADED'}`)
  console.log(`✓ seal: ${seal}`)
  console.log(`✓ README.md patched`)
}

main().catch(e => { console.error(e); process.exit(1) })
