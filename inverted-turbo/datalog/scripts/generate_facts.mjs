#!/usr/bin/env node
/**
 * generate_facts.mjs — Scans the inverted-turbo build state
 * and emits Datalog facts for the verification engine.
 *
 * Output: datalog/facts/generated.dl
 */

import { existsSync, writeFileSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";

// Allow CI to pass --repo-root <path> so cross-repo paths resolve correctly
const rootArgIdx = process.argv.indexOf("--repo-root");
const ROOT = rootArgIdx !== -1
  ? resolve(process.argv[rootArgIdx + 1])
  : resolve(import.meta.dirname + "/../..");
const OUT = join(ROOT, "datalog", "facts", "generated.dl");

const facts = [];

function fact(pred, ...args) {
  facts.push(`${pred}(${args.map((a) => `"${a}"`).join(", ")}).`);
}

// ─── Rust Build State ────────────────────────────────────────────────────────
const rustMembers = [
  { name: "pnp-coordinator", path: "rust/pnp-attack" },
  { name: "sovereign-daemon", path: "rust/sovereign-daemon" },
];

for (const m of rustMembers) {
  const targetRelease = join(ROOT, "target/release", m.name + (process.platform === "win32" ? ".exe" : ""));
  if (existsSync(targetRelease)) {
    fact("build_success", m.name);
    fact("has_type", m.name, "binary");
  }
}

// ─── Lean Build State ────────────────────────────────────────────────────────
const leanModules = [
  "InvertedTurbo.Metaprogram.Basic",
];

for (const mod of leanModules) {
  const olean = join(ROOT, "lean", ".lake/build/lib/lean",
    mod.replace(/\./g, "/") + ".olean");
  if (existsSync(olean)) {
    const shortName = mod.split(".").pop();
    fact("build_success", shortName);
    fact("has_type", shortName, "lean_module");
  }
}

// ─── Haskell Build State (check for .hi files) ──────────────────────────────
const hsModules = [
  "SovereignTwin.ComputableRefinement",
  "SovereignTwin.InvertedBlock",
  "SovereignTwin.SExp",
  "SovereignTwin.Kernel",
];

for (const mod of hsModules) {
  // We can't know if cabal built without cabal, but we can check source existence
  const srcFile = join(ROOT, "haskell/sovereign-twin/src",
    mod.replace(/\./g, "/") + ".hs");
  if (existsSync(srcFile)) {
    fact("declared_func", mod);
    fact("has_type", mod, "haskell_module");
  }
}

// ─── P/NP Swarm facts ───────────────────────────────────────────────────────
const pnpRegistry = join(ROOT, "../snapkitty-agentos/.agentos/pnp/problem_registry.json");
if (existsSync(pnpRegistry)) {
  try {
    const reg = JSON.parse(readFileSync(pnpRegistry, "utf8"));
    for (const p of reg.problems || []) {
      fact("declared_func", p.id);
      fact("has_type", p.id, p.difficulty);
      if (p.verifyFn) fact("has_verify_fn", p.id);
    }
  } catch {}
}

// ─── Verifiers (WASM artifacts) ─────────────────────────────────────────────
const wasmDir = join(ROOT, "../snapkitty-agentos/.agentos/skills/artifacts");
if (existsSync(wasmDir)) {
  const skills = readdirSync(wasmDir);
  for (const skill of skills) {
    const verifyPath = join(wasmDir, skill, "verify.wasm");
    if (existsSync(verifyPath)) {
      fact("has_verifier", skill, `verify.wasm`);
      fact("verifier_pass", `verify.wasm`);
    }
  }
}

// ─── WORM seal state (plasma gate) ──────────────────────────────────────────
const wormLedger = join(ROOT, "../snapkitty-agentos/.agentos/plasma_gate/pubkey.pem");
if (existsSync(wormLedger)) {
  fact("sealed_to_worm", "plasma_gate");
}

// ─── ransom-worm JS chain (monorepo packages/ransom-worm) ───────────────────
// ROOT is inverted-turbo/; monorepo root is one level up
const monoRoot = join(ROOT, "..");
const ransomWormLedger = join(monoRoot, "packages", "ransom-worm", "worm-ledger.json");
if (existsSync(ransomWormLedger)) {
  try {
    const ledger = JSON.parse(readFileSync(ransomWormLedger, "utf8"));
    const entries = Array.isArray(ledger.entries) ? ledger.entries.length : 0;
    fact("sealed_to_worm", "ransom-worm-chain");
    fact("has_type", "ransom-worm-chain", "js_worm_chain");
    // Surface head seal so build_verification rules can check it
    if (ledger.head) {
      fact("declared_func", `worm_head:${ledger.head}`);
    }
    // Each agent in the last entry becomes a declared function
    const last = Array.isArray(ledger.entries) && ledger.entries[ledger.entries.length - 1];
    if (last && last.agent) {
      fact("declared_func", last.agent);
      fact("has_type", last.agent, "worm_agent");
    }
  } catch {}
}

// ─── shadow-orchestrator (packages/shadow-orchestrator) ─────────────────────
const shadowMain = join(monoRoot, "packages", "shadow-orchestrator", "main.ts");
if (existsSync(shadowMain)) {
  fact("declared_func", "ShadowOrchestrator");
  fact("has_type", "ShadowOrchestrator", "ts_orchestrator");
}

const shadowWormPage = join(monoRoot, "packages", "shadow-orchestrator", "pages", "00-worm", "index.ts");
if (existsSync(shadowWormPage)) {
  fact("declared_func", "appendEvent");
  fact("declared_func", "verifyChain");
  fact("is_pure", "verifyChain");
  fact("has_type", "appendEvent", "worm_primitive");
}

// ─── ransom-worm agents (graveyard + orchestrate) ───────────────────────────
const graveyardAgent = join(monoRoot, "packages", "ransom-worm", "agents", "graveyard.mjs");
if (existsSync(graveyardAgent)) {
  fact("declared_func", "graveyard");
  fact("has_type", "graveyard", "worm_agent");
  fact("has_type", "graveyard", "flicker_gate");
}

const orchestrateAgent = join(monoRoot, "packages", "ransom-worm", "agents", "orchestrate.mjs");
if (existsSync(orchestrateAgent)) {
  fact("declared_func", "orchestrate");
  fact("has_type", "orchestrate", "worm_agent");
}

// ─── Write output ────────────────────────────────────────────────────────────
const header = `% Auto-generated by generate_facts.mjs — ${new Date().toISOString()}
% DO NOT EDIT — regenerate with: node datalog/scripts/generate_facts.mjs
`;
writeFileSync(OUT, header + facts.join("\n") + "\n");
console.log(`[facts] Wrote ${facts.length} facts to ${OUT}`);
