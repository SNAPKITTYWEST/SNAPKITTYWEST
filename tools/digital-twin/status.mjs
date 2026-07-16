#!/usr/bin/env node
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// ── JS/TS monorepo packages ───────────────────────────────────────────────────
const packageProbes = [
  ['umbrella',           'README.md'],
  ['shadow-orchestrator','packages/shadow-orchestrator/main.ts'],
  ['ransom-worm',        'packages/ransom-worm/agents/orchestrate.mjs'],
  ['agentos-submodule',  'snapkitty-agentos/package.json'],
  ['gitbucket-submodule','snapkitty-gitbucket'],
  ['utqc-submodule',     'sovereign-utqc'],
]

const packages = packageProbes.map(([name, rel]) => {
  const path = join(root, rel)
  return {
    name,
    path: rel,
    present: existsSync(path),
    updatedAt: existsSync(path) ? statSync(path).mtime.toISOString() : null,
  }
})

// ── WORM chain (ransom-worm ledger) ──────────────────────────────────────────
const ledgerPath = join(root, 'packages', 'ransom-worm', 'worm-ledger.json')
let worm = { present: false, entries: 0, head: null }
if (existsSync(ledgerPath)) {
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
  worm = {
    present: true,
    entries: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
    head: ledger.head ?? null,
  }
}

// ── inverted-turbo digital twin ───────────────────────────────────────────────
const it = join(root, 'inverted-turbo')

const invertedTurboProbes = [
  ['it:cabal.project',          'inverted-turbo/cabal.project'],
  ['it:Cargo.toml',             'inverted-turbo/Cargo.toml'],
  ['it:lakefile.lean',          'inverted-turbo/lean/lakefile.lean'],
  ['it:Kernel.hs',              'inverted-turbo/haskell/sovereign-twin/src/SovereignTwin/Kernel.hs'],
  ['it:sovereign-daemon',       'inverted-turbo/rust/sovereign-daemon/src/main.rs'],
  ['it:datalog-engine',         'inverted-turbo/datalog/engine.mjs'],
  ['it:datalog-quantum',        'inverted-turbo/datalog/rules/quantum_linearity.dl'],
  ['it:Metaprogram.lean',       'inverted-turbo/lean/InvertedTurbo/Metaprogram/Basic.lean'],
  ['it:build.yml',              'inverted-turbo/.github/workflows/build.yml'],
  ['it:worm-dir',               'inverted-turbo/worm'],
]

const invertedTurbo = invertedTurboProbes.map(([name, rel]) => {
  const path = join(root, rel)
  return {
    name,
    path: rel,
    present: existsSync(path),
    updatedAt: existsSync(path) ? statSync(path).mtime.toISOString() : null,
  }
})

// ── inverted-turbo WORM build ledger ─────────────────────────────────────────
const itWormLedger = join(it, 'worm', 'build_ledger.jsonl')
let itWorm = { present: false, entries: 0 }
if (existsSync(itWormLedger)) {
  const lines = readFileSync(itWormLedger, 'utf8').split('\n').filter(Boolean)
  itWorm = { present: true, entries: lines.length }
}

// ── .newrepos constellation probe ────────────────────────────────────────────
const newreposDir = join(root, '.newrepos')
let constellation = { present: false, repos: [] }
if (existsSync(newreposDir)) {
  constellation = {
    present: true,
    repos: readdirSync(newreposDir).map(name => ({
      name,
      present: existsSync(join(newreposDir, name)),
    })),
  }
}

console.log(JSON.stringify({
  generated: new Date().toISOString(),
  root,
  digitalTwin: 'SNAPKITTYWEST',
  packages,
  worm,
  invertedTurbo,
  itWorm,
  constellation,
}, null, 2))
