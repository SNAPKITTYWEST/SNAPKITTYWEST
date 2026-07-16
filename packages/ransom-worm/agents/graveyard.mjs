#!/usr/bin/env node
/**
 * GRAVEYARD — Shadow Orchestrator · Archived Repo Resurrection Agent
 *
 * Finds archived repos in the SNAPKITTYWEST constellation, briefly
 * unarchives each one, runs the full resurrection cycle, pushes a
 * WORM receipt commit, then re-archives. The repo flickers public
 * for seconds — enough to wake it up and seal the event.
 *
 * This is a GATE. The archive is a tombstone. The push is the pulse.
 * The re-archive is the return. The WORM seal is the proof it happened.
 *
 * Run:
 *   node agents/graveyard.mjs --dry-run
 *   node agents/graveyard.mjs --repo <owner/name> --dry-run
 *   node agents/graveyard.mjs --repo <owner/name> --allow-write
 *   node agents/graveyard.mjs --all --allow-write   (all archived repos)
 */
import { execSync } from 'node:child_process'
import { mkdirSync, existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sealEvent } from './worm-chain.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const WORK = resolve(process.env.RANSOM_WORM_WORKSPACE || join(__dir, '..', '.graveyard-workspace'))
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_API = 'https://api.github.com'

// ── helpers ──────────────────────────────────────────────────────────────────

function log(tag, msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] [${tag}] ${msg}`)
}

function run(cmd, cwd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: opts.silent ? 'pipe' : 'inherit',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      ...opts,
    })
  } catch (e) {
    if (!opts.optional) throw e
    return ''
  }
}

async function ghApi(method, path, body = null) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set — cannot call GitHub API')
  const url = path.startsWith('http') ? path : `${GITHUB_API}${path}`
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitHub API ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json().catch(() => null)
}

// ── list archived repos in org ────────────────────────────────────────────────

export async function listArchivedRepos(org = 'SNAPKITTYWEST') {
  log('GRAVEYARD', `Scanning archived repos in ${org}...`)
  const repos = []
  let page = 1
  while (true) {
    const batch = await ghApi('GET',
      `/orgs/${org}/repos?type=all&per_page=100&page=${page}`)
    if (!batch || batch.length === 0) break
    for (const r of batch) {
      if (r.archived) repos.push({ name: r.name, fullName: r.full_name, url: r.clone_url, pushedAt: r.pushed_at })
    }
    if (batch.length < 100) break
    page++
  }
  log('GRAVEYARD', `Found ${repos.length} archived repos`)
  return repos
}

// ── unarchive → push → re-archive ────────────────────────────────────────────

export async function flickerRepo(fullName, opts = {}) {
  const [owner, name] = fullName.split('/')
  log('GRAVEYARD', `=== FLICKER: ${fullName} ===`)
  log('GRAVEYARD', `dry-run: ${opts.dryRun ? 'YES' : 'NO'}`)

  if (!opts.dryRun && !opts.allowWrite) {
    throw new Error('non-dry flicker is gated — pass --allow-write or RANSOM_WORM_ALLOW_WRITES=1')
  }

  const repoPath = join(WORK, name)
  // Validate workspace path to prevent path traversal
  if (!resolve(repoPath).startsWith(WORK + sep)) {
    throw new Error(`refusing to operate outside workspace: ${repoPath}`)
  }

  // ── Step 1: clone (even in dry-run — read-only operation) ─────────────────
  log('GRAVEYARD', 'Cloning (depth 1)...')
  if (existsSync(repoPath)) rmSync(repoPath, { recursive: true, force: true })
  mkdirSync(WORK, { recursive: true })

  const cloneUrl = GITHUB_TOKEN
    ? `https://${GITHUB_TOKEN}@github.com/${fullName}.git`
    : `https://github.com/${fullName}.git`

  try {
    run(`git clone --depth 1 ${cloneUrl} ${repoPath}`, WORK, { silent: true })
  } catch (e) {
    // archived repos allow clone but may block writes — that's expected
    log('GRAVEYARD', `Clone note: ${e.message?.slice(0, 80) || 'ok'}`)
  }

  // ── Step 2: run resurrection audit (read-only) ─────────────────────────────
  log('GRAVEYARD', 'Running metric audit...')
  const { run: runMetrics } = await import('./metric-stream.mjs')
  const dryOut = join(WORK, 'dry-runs', name)
  mkdirSync(dryOut, { recursive: true })
  const metricsOut = opts.dryRun
    ? join(dryOut, '.graveyard-metrics.json')
    : join(repoPath, '.graveyard-metrics.json')
  const metrics = await runMetrics({ repoPath, outPath: metricsOut }).catch(e => {
    log('GRAVEYARD', `Audit error: ${e.message}`); return null
  })

  // ── Step 3: seal the resurrection event ───────────────────────────────────
  const { seal: wormSeal } = sealEvent('GRAVEYARD', 'flicker-resurrection', {
    target: fullName,
    totalLines: metrics?.summary?.totalLines ?? 0,
    totalFiles: metrics?.summary?.totalFiles ?? 0,
    dryRun: Boolean(opts.dryRun),
  })
  log('GRAVEYARD', `WORM seal: ${wormSeal}`)

  if (opts.dryRun) {
    log('GRAVEYARD', '=== DRY RUN — no archive state changed ===')
    const receipt = buildReceipt(name, metrics, wormSeal)
    console.log('\n--- RECEIPT PREVIEW ---')
    console.log(receipt.slice(0, 600))
    return { wormSeal, metrics, dryRun: true, fullName }
  }

  // ── Step 4: unarchive ─────────────────────────────────────────────────────
  log('GRAVEYARD', 'Unarchiving...')
  await ghApi('PATCH', `/repos/${fullName}`, { archived: false })
  log('GRAVEYARD', 'Repo is now PUBLIC')

  let pushed = false
  try {
    // ── Step 5: write receipt + commit + push ─────────────────────────────
    const receiptPath = join(repoPath, 'GRAVEYARD_RECEIPT.md')
    writeFileSync(receiptPath, buildReceipt(name, metrics, wormSeal))

    run(`git config user.email "graveyard@snapkittywest.github.io"`, repoPath, { silent: true })
    run(`git config user.name "GRAVEYARD"`, repoPath, { silent: true })
    run(`git add GRAVEYARD_RECEIPT.md`, repoPath, { silent: true })
    run(`git commit -m "GRAVEYARD: resurrection receipt — ${wormSeal.slice(0, 16)}"`, repoPath, { silent: true })
    run(`git push origin HEAD`, repoPath, { silent: true })
    pushed = true
    log('GRAVEYARD', 'Resurrection receipt pushed')
  } catch (e) {
    log('GRAVEYARD', `Push failed (repo may block writes while archived): ${e.message?.slice(0, 80)}`)
  }

  // ── Step 6: re-archive immediately ────────────────────────────────────────
  log('GRAVEYARD', 'Re-archiving...')
  await ghApi('PATCH', `/repos/${fullName}`, { archived: true })
  log('GRAVEYARD', 'Repo is ARCHIVED again')

  // Seal the complete flicker cycle
  const { seal: flickerSeal } = sealEvent('GRAVEYARD', 'flicker-complete', {
    target: fullName,
    pushed,
    wormSeal,
  })

  log('GRAVEYARD', `=== FLICKER COMPLETE — ${flickerSeal} ===`)
  return { wormSeal, flickerSeal, metrics, pushed, fullName }
}

// ── receipt template ──────────────────────────────────────────────────────────

function buildReceipt(repoName, metrics, wormSeal) {
  return `# GRAVEYARD: Resurrection Receipt

> *The archive is a gate. The push is the pulse. The chain remembers.*

This commit was generated by the **GRAVEYARD** agent of the Shadow Orchestrator.

## What happened

This repository was briefly unarchived, audited, sealed to the SNAPKITTYWEST WORM chain,
and re-archived. The flicker lasted seconds. The seal is permanent.

## Audit Summary

| Metric | Value |
|--------|-------|
| Files | ${metrics?.summary?.totalFiles ?? '?'} |
| Lines | ${(metrics?.summary?.totalLines ?? 0).toLocaleString()} |
| Headline | ${metrics?.headline ?? 'Audit complete'} |

## WORM Seal

\`\`\`
${wormSeal}
\`\`\`

## Entity

\`SNAPKITTY-SOVEREIGN-OS:AHMAD-ALI-PARR:2026\`

## Notice

This is not ransomware. No data was modified, extracted, or transmitted beyond this receipt.
The WORM seal proves this repository was processed by the sovereign mesh at the time above.
The archive state has been restored exactly as found.

---

*Shadow Orchestrator · GRAVEYARD · SNAPKITTYWEST*
`
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const allowWrite = args.includes('--allow-write') || process.env.RANSOM_WORM_ALLOW_WRITES === '1'
const allFlag = args.includes('--all')
const repoIdx = args.indexOf('--repo')
const orgIdx = args.indexOf('--org')
const org = orgIdx >= 0 ? args[orgIdx + 1] : 'SNAPKITTYWEST'

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1]?.endsWith('graveyard.mjs')) {

  if (!repoIdx && !allFlag) {
    console.error('Usage:')
    console.error('  node agents/graveyard.mjs --repo <owner/name> [--dry-run]')
    console.error('  node agents/graveyard.mjs --all [--org SNAPKITTYWEST] [--dry-run]')
    process.exit(1)
  }

  if (allFlag) {
    const repos = await listArchivedRepos(org)
    for (const repo of repos) {
      await flickerRepo(repo.fullName, { dryRun, allowWrite }).catch(e =>
        log('GRAVEYARD', `Error on ${repo.fullName}: ${e.message}`)
      )
    }
  } else {
    const target = args[repoIdx + 1]
    const fullName = target.includes('/') ? target : `${org}/${target}`
    await flickerRepo(fullName, { dryRun, allowWrite }).catch(e => {
      console.error(e.message); process.exitCode = 1
    })
  }
}
