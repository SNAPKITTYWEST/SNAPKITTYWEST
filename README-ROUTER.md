# ⬡ SNAPKITTY SOVEREIGN ROUTER

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║    ⬡  S N A P K I T T Y   S O V E R E I G N   R O U T E R                  ║
║                                                                              ║
║    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ║
║    ░  Every task routes to the right engine.                            ░    ║
║    ░  The routing table is the IP. Not the models.                      ░    ║
║    ░  Evidence or Silence. Nothing in between.                          ░    ║
║    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ║
║                                                                              ║
║    ⟦Ω⟧ Ahmad Ali Parr · SnapKitty Collective · Bel Esprit D'Accord Trust    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

[![License](https://img.shields.io/badge/License-SSL_v3.0-7c3aed?style=for-the-badge)](SOVEREIGN_SOURCE_LICENSE_V3.md)
[![Bedrock](https://img.shields.io/badge/AWS_Bedrock-Claude_·_Nova_·_DeepSeek-f97316?style=for-the-badge)](https://aws.amazon.com/bedrock/)
[![Mistral](https://img.shields.io/badge/Mistral-Codestral_free-ffd700?style=for-the-badge)](https://console.mistral.ai)
[![WORM](https://img.shields.io/badge/WORM-SHA256_sealed-00ff88?style=for-the-badge)](SNAPKITTY-PROOFS)

---

## What This Is

The Sovereign Router is a universal AI workflow engine.  
One command. Every task routes to the right model automatically.  
No thinking about which API to call. No switching between tools.  
The SACM gate pattern-matches your input and decides.

```
You type:   "prove by induction the sum of squares formula"
Router:     → DeepSeek R1 (math/proof · us-west-2)

You type:   "write a rust function for fibonacci"
Router:     → Mistral Codestral (code · free tier)

You type:   "explain why the WORM chain beats a database"
Router:     → Claude Sonnet 4.6 (reasoning · Bedrock)

You type:   "write a research paper about SACM architecture"
Router:     → Nova Premier (long-form writing · DEVTRIAL)
```

---

## The Full Routing Table

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    S A C M   G A T E                                    │
│              Pattern Match → Engine → ERE Verify → Output               │
└─────────────────────────────────────────────────────────────────────────┘

  INPUT
    │
    ▼
  ┌─────────────────────────────────────────────┐
  │  DFA PATTERN MATCH  (O(n), no backtracking) │
  └─────────────────────────────────────────────┘
    │
    ├─ PROVE / THEOREM / INDUCTION / AXIOM / LEMMA
    │       └──────────────────────────────────────────► DEEPSEEK R1
    │                                                     us-west-2 · reasoning model
    │
    ├─ WRITE / CODE / GIT / SCAFFOLD / BUILD / NPM
    │       └──────────────────────────────────────────► MISTRAL CODESTRAL
    │                                                     free tier · code specialist
    │
    ├─ PAPER / WHITEPAPER / RESEARCH PAPER / ACADEMIC
    │       └──────────────────────────────────────────► NOVA PREMIER (DEVTRIAL)
    │                                                     Bedrock · long-form writing
    │
    ├─ MARKET / CRYPTO / NEWS / PRICE / FINANCE
    │       └──────────────────────────────────────────► NOVA PRO
    │                                                     Bedrock · fast synthesis
    │
    ├─ LOCAL / NEMOTRON / OLLAMA / OUR MODEL
    │       └──────────────────────────────────────────► OLLAMA :11434
    │                                                     local · your trained weights
    │
    ├─ COMPLEX / ELABORATE / FULL SYSTEM
    │       └──────────────────────────────────────────► CLAUDE OPUS 4.6
    │                                                     Bedrock · heavy reasoning
    │
    └─ LAW / TRUST / WORM / GOVERNANCE / WHY / EXPLAIN (default)
            └──────────────────────────────────────────► CLAUDE SONNET 4.6
                                                          Bedrock · reasoning + law

    │
    ▼
  ┌─────────────────────────────────────────────┐
  │  ERE VERIFY  (5-pass quality gate)          │
  │  PASS → user  QUARANTINE → flag  REJECT → ✗ │
  └─────────────────────────────────────────────┘
    │
    ▼
  ┌─────────────────────────────────────────────┐
  │  VAULT LEAK SCANNER  (DFA key redaction)    │
  └─────────────────────────────────────────────┘
    │
    ▼
  OUTPUT  +  WORM SEAL
```

---

## Engine Reference

| Engine | Model ID | Region | Best For | Cost |
|--------|----------|--------|----------|------|
| **Claude Sonnet 4.6** | `us.anthropic.claude-sonnet-4-6` | us-east-1 | Law · Trust · Reasoning | Bedrock |
| **Mistral Codestral** | `codestral-latest` | API | Code · Git · Terminal | **Free** |
| **Nova Pro** | `us.amazon.nova-pro-v1:0` | us-east-1 | Market · News · Research | Bedrock |
| **Nova Premier** | `us.amazon.nova-premier-v1:0` | us-east-1 | Long papers · DEVTRIAL | Bedrock |
| **DeepSeek R1** | `us.deepseek.r1-v1:0` | **us-west-2** | Math proofs · Induction | Bedrock |
| **Claude Opus 4.6** | `us.anthropic.claude-opus-4-6-v1` | us-east-1 | Complex architecture | Bedrock |
| **Local / Nemotron** | `nemotron` | localhost | Offline · your weights | **Free** |

> **DeepSeek R1 requires `us-west-2`** — the router handles this automatically.

---

## Quick Start

### Prerequisites

```bash
# 1. AWS CLI configured
aws configure
# Set region to us-east-1 (router uses us-west-2 for DeepSeek automatically)

# 2. Node.js 20+
node --version  # v20+

# 3. Clone
git clone https://github.com/SNAPKITTYWEST/SNAPKITTYWEST.git
cd SNAPKITTYWEST

# 4. Install
npm install
```

### Configuration

```bash
# Copy the example env
cp .env.example .env

# Edit .env — set your master secret (derives all keys)
# This is the ONLY secret you need to remember
VAULT_MASTER_SECRET=your_secret_here

# Set your Mistral free key (get at console.mistral.ai)
MISTRAL_API_KEY=your_mistral_key
```

### Seal Your Keys

```bash
# Seals keys into vault.sealed.json (encrypted, safe to commit)
VAULT_MASTER_SECRET=your_secret npm run vault:seal \
  "MISTRAL_API_KEY=your_mistral_key"
```

### Run

```bash
# Route any task
npm run router "write a rust fibonacci function"
npm run router "prove by induction the sum of squares formula"
npm run router "explain why WORM chain beats a database"
npm run router "what is the bitcoin market trend today"

# Open the visual Mission Control UI
open router-ui.html   # macOS
start router-ui.html  # Windows
```

---

## Architecture Deep Dive

```
sovereign-router.ts          ← Main router (TypeScript)
│
├── SACM Gate                ← Pattern match, O(n), no backtracking
│   ├── 15+ routing patterns
│   └── Agent type detection
│
├── Vault (vault.ts)         ← Ed25519 + AES-256-GCM key management
│   ├── PBKDF2-SHA512 key derivation
│   ├── DFA leak scanner on all outputs
│   └── vault.sealed.json (encrypted, committable)
│
├── Tools (tools.ts)         ← Mistral's tool belt
│   ├── shell_exec           → run commands
│   ├── file_write           → write files
│   ├── file_read            → read files
│   ├── git_push             → commit + push
│   ├── kernel_invoke        → sovereign-glue.rexx
│   ├── web_verify           → Tavily + DFA fact scan
│   ├── ddg_search           → DuckDuckGo
│   ├── define               → Merriam-Webster
│   └── thesaurus            → M-W Thesaurus
│
├── Web Verify (web-verify.mjs) ← Tavily DFA pre-processor
│   ├── Fetches web results
│   ├── DFA scans for verified facts
│   ├── Blocks injection attempts
│   └── Returns only clean token bundles
│
└── Kernel Registry          ← 15 sovereign kernels
    (kernel-registry.json)
    ├── DFA Engine (JS)
    ├── REXX Glue Kernel
    ├── Route Dispatch (REXX)
    ├── Carto Prolog
    ├── Carto Gate (ASP)
    ├── COBOL Law Kernel
    ├── Corpus Store (OCaml)
    ├── Math Dispatcher (Rust)
    ├── Math Emitters (Rust)
    ├── WORM Chain (Rust)
    ├── SnapKitty Chain (JS)
    ├── Sovereign Daemon (Go)
    ├── Trust Deed Generator (JS)
    └── Sovereign Alien Trust (Prolog)
```

---

## The Kernel Chain

Every task fires a chain of sovereign kernels before the model sees it.  
The kernels are deterministic. The model is the translation layer.

```
For a LAW query:
  Input → DFA scan → REXX route-dispatch → CARTO Prolog
        → BOB moral gate → Claude → ERE verify → WORM seal → Output

For a MATH query:
  Input → DFA scan → DeepSeek R1 → ERE verify → WORM seal → Output

For a CODE task:
  Input → DFA scan → REXX route-dispatch → SOVEREIGN-GLUE.REXX
        → Mistral tools → git_push / file_write → WORM seal → Output
```

The kernels run in O(n). No backtracking. No regex recursion. ReDoS-immune.

---

## WORM Chain

Every router call is sealed to the append-only WORM chain.  
Nothing leaves the system unsigned.

```json
{
  "ts": "2026-07-11T...",
  "input": "prove by induction...",
  "agent": "deepseek",
  "reason": "math/proof",
  "model": "us.deepseek.r1-v1:0",
  "tokens": 847,
  "worm_seal": "sha256(payload)"
}
```

Sealed to: `.worm/router-chain.jsonl` (append-only, never deleted)

---

## Mission Control UI

Open `router-ui.html` in any browser. No server needed.

```
┌─────────────────┬──────────────────────┬────────────────┐
│  SACM GATE      │   OUTPUT STREAM       │  KERNEL CHAIN  │
│                 │                       │                │
│ ✓ INPUT         │ ▶ DEEPSEEK R1         │ DFA ENGINE ✓   │
│   RECEIVED      │   math/proof          │ ROUTE-DISP ✓   │
│                 │                       │ ERE VERIFY ▶   │
│ ✓ ROUTED →      │ Proof by induction:   │                │
│   DEEPSEEK      │ Base case: n=1...     │  WORM CHAIN    │
│   math/proof    │                       │ a3f7b2c1 seal  │
│   10:32:44      │ ✓ WORM: a3f7b2c1...  │ b2d9e3f4 boot  │
└─────────────────┴──────────────────────┴────────────────┘
[CLAUDE-reasoning][MISTRAL-code][NOVA-market][DEEPSEEK-math][LOCAL-nemotron]
┌──────────────────────────────────────────────────────────┐
│ > Route any task...                           ⬡ ROUTE   │
└──────────────────────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VAULT_MASTER_SECRET` | **YES** | Master secret — derives all keys |
| `MISTRAL_API_KEY` | Yes | Mistral free tier key |
| `AWS_REGION` | No | Default: `us-east-1` |
| `CLAUDE_MODEL` | No | Default: `us.anthropic.claude-sonnet-4-6` |
| `MISTRAL_MODEL` | No | Default: `codestral-latest` |
| `TAVILY_API_KEY` | No | Web search (optional) |
| `OLLAMA_URL` | No | Default: `http://localhost:11434` |
| `LOCAL_MODEL` | No | Default: `nemotron` |

---

## One-Command Boot (after config)

```bash
# Code task
npm run router "write a sovereign WORM chain in Rust"

# Math proof
npm run router "prove by induction sum 1..n = n(n+1)/2"

# Market research
npm run router "what is the current state of DeFi liquidity"

# Long paper
npm run router "write a technical paper on the SACM architecture"

# Use local model
npm run router "use our local model to summarize the sovereign router"

# Visual UI
start router-ui.html
```

---

## License

[Sovereign Source License v3.0](SOVEREIGN_SOURCE_LICENSE_V3.md)

**mathlib5** is the only repository that accepts pull requests (CLA required).  
All other repositories are TIER 1 ARCHIVED — view only.  
Commercial use requires written license: jessicalw34@gmail.com

---

*SnapKitty Collective LLC · EIN 41-5105572*  
*Bel Esprit D'Accord Trust · EIN 41-6630640*  
*Ω — Ahmad Ali Parr · the-49th-call · 2026*
