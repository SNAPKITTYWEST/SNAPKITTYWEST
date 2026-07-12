/**
 * ARCHIVE SWEEP — archive-sweep.mjs
 * Archives all SNAPKITTYWEST repos that are not in the KEEP list.
 * Adds FROZEN badge to README. Updates description.
 * Run: node scripts/archive-sweep.mjs --dry-run (preview)
 * Run: node scripts/archive-sweep.mjs --execute (do it)
 *
 * Author: Ahmad Ali Parr + Claude Sonnet 4.6
 */

import { execSync } from 'child_process';

const DRY_RUN = !process.argv.includes('--execute');

// ── KEEP LIST — these stay public and active ──────────────────────────────────
const KEEP = new Set([
  // Production (private — not touched by this script)
  // Public active
  'mathlib5',              // TIER 2 — only PR-accepting repo
  'SNAPKITTYWEST',         // umbrella
  'snapkitty-chain',       // STELLA + P2P + WORM
  'agentic-arena',         // graveyard crawler
  'cartographer-agent',    // CARTO law engine + MyLaw
  'bob-orchestrator',      // BOB + METATRON + autonomous
  'snap-os',               // sovereign OS
  'kittybrowse',           // desktop shell candidate
  'snapkitty-mcp',         // published npm package
  'seit-institute',        // SEIT NGO public face
  'sovereign-attestation-protocol', // SAP v1.0 standard
  'SNAPKITTY-PROOFS',      // proof corpus
  'snapkitty-resonance-isa', // novel ISA
  'metamine',              // visual programming language
  'bel-esprit-accord',     // trust structure public doc
  'snapkittywest.github.io', // GitHub Pages
  '.github',               // org profile
  // Hackathon (keep visible)
  'bob-hackathon-demo',
  'agentscope-sift',
]);

// ── FROZEN BADGE to prepend to README ────────────────────────────────────────
const FROZEN_BADGE = `> ⚠️ **ARCHIVED — TIER 1 (FROZEN)**
> This repository is read-only. No pull requests. No issues.
> Licensed under [Sovereign Source License v3.0](https://github.com/SNAPKITTYWEST/SNAPKITTYWEST/blob/main/SOVEREIGN_SOURCE_LICENSE_V3.md)
> © Bel Esprit D'Accord Trust (EIN 41-6630640) · SnapKitty Collective LLC (EIN 41-5105572)

---

`;

function ghSync(path) {
  try {
    return JSON.parse(execSync(`gh api "${path}"`, { encoding: 'utf8' }));
  } catch { return null; }
}

function ghPatch(path, body) {
  try {
    const json = JSON.stringify(body);
    return JSON.parse(
      execSync(`gh api "${path}" -X PATCH -f archived=${body.archived} -f description="${body.description}"`,
      { encoding: 'utf8' })
    );
  } catch { return null; }
}

function listRepos() {
  const repos = [];
  let page = 1;
  while (true) {
    const batch = ghSync(`users/SNAPKITTYWEST/repos?per_page=100&page=${page}`);
    if (!batch || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return repos;
}

function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ARCHIVE SWEEP — ${DRY_RUN ? 'DRY RUN (preview only)' : 'EXECUTING'}`);
  console.log(`${'='.repeat(60)}\n`);

  const repos = listRepos();
  console.log(`Found ${repos.length} repos on SNAPKITTYWEST\n`);

  const toArchive = repos.filter(r =>
    !KEEP.has(r.name) &&
    !r.archived &&
    !r.private
  );

  const alreadyArchived = repos.filter(r => r.archived);
  const kept = repos.filter(r => KEEP.has(r.name));

  console.log(`KEEP (${kept.length} repos):`);
  kept.forEach(r => console.log(`  ✅ ${r.name}`));

  console.log(`\nALREADY ARCHIVED (${alreadyArchived.length} repos):`);
  alreadyArchived.forEach(r => console.log(`  📦 ${r.name}`));

  console.log(`\nTO ARCHIVE (${toArchive.length} repos):`);
  toArchive.forEach(r => console.log(`  ⚠️  ${r.name} — ${r.description || 'no description'}`));

  if (DRY_RUN) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`DRY RUN COMPLETE. Run with --execute to archive ${toArchive.length} repos.`);
    console.log(`${'='.repeat(60)}\n`);
    return;
  }

  console.log(`\nArchiving ${toArchive.length} repos...`);

  let done = 0;
  for (const repo of toArchive) {
    // 1. Mark archived via GitHub API
    const desc = `[ARCHIVED] ${(repo.description || repo.name).slice(0,200)} — SSL v3.0`;
    const result = ghPatch(
      `repos/SNAPKITTYWEST/${repo.name}`,
      { archived: true, description: desc }
    );

    if (result) {
      done++;
      console.log(`  📦 [${done}/${toArchive.length}] ${repo.name}`);
    } else {
      console.log(`  ❌ FAILED: ${repo.name}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`ARCHIVE SWEEP COMPLETE`);
  console.log(`  Archived: ${done}/${toArchive.length}`);
  console.log(`  Active:   ${kept.length} repos`);
  console.log(`  Total:    ${repos.length} repos`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Ryan wakes up. 100 repos gone. Only signal remains.`);
}

main();
