# SnapKitty Mass Refactor + Wiring Plan
# 2026-07-11
# Status: BEGIN

## Phase 1 — Archive (remove noise, keep signal)
Archive these — no cherry-pick needed:
- sovereign-addr (standalone, already in registry)
- sovereign-adr (standalone, already in registry)  
- sovereign-agt (standalone, already in registry)
- sovereign-compiler (skeleton, already in registry)
- sovereign-llm (scaffold, already in registry)
- sovereign-multiplicity (standalone, already in registry)
- sovereign-pirtm (standalone, already in registry)
- sovereign-prism (OCaml version, prism-skills is Rust canonical)
- S_AUTOCODE (AUTOCODE lineage, historical)
- legacy-apl (APL research complete, math-skills is canonical)

## Phase 2 — Cherry-pick into production repos
These get folded into existing repos:

INTO cartographer-agent:
- financial_intel.pl from market-scope → cartographer-agent/prolog/
- sovereign-calculus lean files → cartographer-agent/proofs/

INTO SNAPKITTYWEST (root):
- sovereign-glue.rexx (already done today)
- kernel-registry.json (already done today)
- agent-registry.json (already done today)
- sovereign-router.ts (already done today)

INTO DEVFLOW-FINANCE:
- snaplang → DEVFLOW-FINANCE/snaplang/
- sovereign-context-tools already there

## Phase 3 — Wire the router
Connect sovereign-router.ts to:
1. agent-registry.json (route to agents not models)
2. BOB pipeline (shadow-orchestrator/main.ts KERNEL_INTERCEPT phase)
3. ERE verify on every output
4. Vault.ts for key management

## Phase 4 — Download center
Build from overview/ → real product catalog
11 repos, 4 categories, GitHub Pages

## Phase 5 — Tauri shell
kittybrowse as the desktop shell hinge
sovereign-daemon as the sidecar

## Immediate next: Phase 1 archive list confirmed, then Phase 3 wiring
