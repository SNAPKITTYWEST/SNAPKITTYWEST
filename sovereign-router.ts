/**
 * SOVEREIGN ROUTER — sovereign-router.ts
 *
 * Universal workflow engine. Every agent and model serves a purpose.
 * The routing table is the IP — not the models.
 *
 * ROUTING TABLE:
 *
 *   CLAUDE (Bedrock Sonnet 4.6)
 *     → reasoning, law, trust, proofs, architecture, governance
 *     → IP analysis, legal strategy, CARTO consultations
 *     → complex multi-step synthesis
 *
 *   MISTRAL CODESTRAL (free tier)
 *     → code generation, git ops, terminal, file writes, scaffolding
 *     → fast mechanical tasks, boilerplate
 *
 *   NOVA PRO (Bedrock — Amazon native)
 *     → news, market research, crypto, financial analysis
 *     → fast synthesis, summarization, current events
 *     → DEVTRIAL: long-form research papers, technical writing
 *
 *   GEMMA 3 27B (Bedrock — Google DNA)
 *     → Google-domain tasks, multimodal reasoning
 *     → document analysis, structured extraction
 *
 *   DEEPSEEK V3 (Bedrock)
 *     → heavy math, proof verification, deep code review
 *     → formal methods analysis
 *
 *   DEVTRIAL (Nova Pro workflow)
 *     → long academic papers using free vLLM pipeline
 *     → technical documentation, research synthesis
 *     → cherry-pick from RESONANCE-CORE + corpus for content
 *
 * SACM GATE: DFA/regex pattern-matches input → routes to correct engine.
 * ERE VERIFY: Every output scanned before reaching user.
 * VAULT: All keys managed via Ed25519 + AES-256-GCM.
 *
 * Author: Ahmad Ali Parr + Claude Sonnet 4.6
 */

import OpenAI from "openai";
import { readFileSync } from "fs";
import { TOOL_DEFINITIONS, executeTool } from "./tools.js";
import { getVault, scanForLeaks } from "./vault.js";
import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
  InvokeModelCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

// Load .env if present (no external dotenv dependency needed)
try {
  const env = readFileSync(".env", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch { /* .env optional */ }

// ── CLIENTS ──────────────────────────────────────────────────────────────────

// Claude/Nova/Opus via AWS Bedrock — us-east-1
const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});
// DeepSeek R1 — requires us-west-2
const bedrockWest = new BedrockRuntimeClient({ region: "us-west-2" });

// Clients initialized after vault loads
let mistral: OpenAI;

// ── MODELS ───────────────────────────────────────────────────────────────────

const CLAUDE_MODEL   = process.env.CLAUDE_MODEL   ?? "us.anthropic.claude-sonnet-4-6";
const MISTRAL_MODEL  = process.env.MISTRAL_MODEL  ?? "codestral-latest";
const NOVA_MODEL     = "us.amazon.nova-pro-v1:0";         // news, market, fast research
const DEEPSEEK_MODEL = "us.deepseek.r1-v1:0";             // math proofs, R1 reasoning model
const LLAMA4_MODEL   = "us.meta.llama4-maverick-17b-instruct-v1:0"; // coding alt, multilingual
const OPUS_MODEL     = "us.anthropic.claude-opus-4-6-v1"; // heavy reasoning, architecture
const MISTRAL_BEDROCK = "us.mistral.pixtral-large-2502-v1:0"; // Mistral via Bedrock (your trained weights path)
// DEVTRIAL: Nova Premier for long-form papers (largest context, best synthesis)
const DEVTRIAL_MODEL = "us.amazon.nova-premier-v1:0";
// Local Nemotron/Mistral: routed via sovereign-daemon on :8080 (Ollama)
const LOCAL_MODEL    = process.env.LOCAL_MODEL ?? "nemotron";
const OLLAMA_URL     = process.env.OLLAMA_URL  ?? "http://localhost:11434";

// ── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const CLAUDE_SYSTEM = `You are the SnapKitty reasoning agent operating inside the
SNAPKITTYWEST sovereign compute architecture.

Your role: REASONING, LAW, TRUST, PROOFS, ARCHITECTURE.
You explain, analyze, verify, and produce arguments.
You do NOT push code, run terminal commands, or write files directly.
When code needs to be pushed, you produce a clear spec and hand off to the Qwen terminal agent.

Three-witness consensus: NT · Algebraic · IT.
Ω ← TRUST ∧ CODE. No sorry without a proof.`;

const MISTRAL_SYSTEM = `You are the SnapKitty terminal agent operating inside the
SNAPKITTYWEST sovereign compute architecture.

Your role: CODE GENERATION, GIT OPERATIONS, FILE WRITES, SCAFFOLDING, TERMINAL COMMANDS.
You are the executor. You receive specs and produce working code or shell commands.
You do NOT reason about law, trust deeds, proofs, or architecture decisions — that is Claude's job.

When you produce shell commands, output them in a code block tagged \`\`\`bash.
When you produce files, output them in code blocks with the filename as the first comment line.
Always produce complete, runnable output. No placeholders. No "TODO: fill this in".`;

// ── ROUTING TABLE ─────────────────────────────────────────────────────────────
// Pattern match on input → decide which model handles it.
// This is the IP. The models are interchangeable. The routing table is not.

type Agent = "claude" | "mistral" | "nova" | "deepseek" | "devtrial" | "local" | "opus";

interface RouteDecision {
  agent:  Agent;
  reason: string;
}

function route(input: string): RouteDecision {
  const up = input.toUpperCase();

  // Mistral — code, git, terminal, files
  if (/\b(PUSH|COMMIT|GIT|BRANCH|PR|PULL REQUEST)\b/.test(up))
    return { agent: "mistral", reason: "git operation" };
  if (/\b(WRITE|CREATE|SCAFFOLD|GENERATE|BUILD|CODE|IMPLEMENT|FILE|MKDIR)\b/.test(up))
    return { agent: "mistral", reason: "code/file generation" };
  if (/\b(NPM|YARN|CARGO|BASH|SHELL|RUN|EXECUTE|INSTALL|DEPLOY)\b/.test(up))
    return { agent: "mistral", reason: "terminal execution" };
  if (/\b(FIX BUG|REFACTOR|PATCH|UPDATE THE|ADD THE|REMOVE THE)\b/.test(up))
    return { agent: "mistral", reason: "code mutation" };
  if (/\b(DOWNLOAD CENTER|HTML|CSS|COMPONENT|TAURI|ELECTRON|WASM)\b/.test(up))
    return { agent: "mistral", reason: "frontend/build task" };

  // DeepSeek R1 — math proofs, induction, formal reasoning (MUST come before word-count fallback)
  if (/\b(THEOREM|PROOF|PROVE|INDUCTION|AXIOM|EQUATION|FORMULA|LEMMA|COROLLARY)\b/.test(up))
    return { agent: "deepseek", reason: "math/proof" };
  if (/\b(ALGEBRA|CALCULUS|MATRIX|EIGENVALUE|TOPOLOGY|HOMOLOGY|MANIFOLD|INTEGRAL)\b/.test(up))
    return { agent: "deepseek", reason: "math/analysis" };
  if (/\b(COLLATZ|RAMSEY|FIBONACCI|INVARIANT|RIEMANN|GOLDILOCKS|CONTRACTION)\b/.test(up))
    return { agent: "deepseek", reason: "advanced math" };

  // Local Nemotron / trained Mistral — available via Ollama on :11434
  if (/\b(LOCAL|NEMOTRON|OLLAMA|ON.DEVICE|OFFLINE|OUR MODEL|OUR WEIGHTS)\b/.test(up))
    return { agent: "local", reason: "local inference" };

  // Opus — heavy architecture, complex multi-step reasoning
  if (/\b(COMPLEX ARCHITECTURE|DEEP ANALYSIS|FULL SYSTEM|COMPREHENSIVE|ELABORATE)\b/.test(up))
    return { agent: "opus", reason: "heavy reasoning" };

  // DEVTRIAL — long-form writing, research papers, technical docs (Nova Pro vLLM pipeline)
  if (/\b(PAPER|WRITE A PAPER|RESEARCH PAPER|TECHNICAL PAPER|WHITEPAPER|DOCUMENTATION|LONG.FORM|ACADEMIC|PUBLISH)\b/.test(up))
    return { agent: "devtrial", reason: "long-form writing/paper" };
  if (/\b(DRAFT|WRITE UP|WRITE THE|SUMMARIZE INTO|DOCUMENT THE|TECHNICAL REPORT)\b/.test(up))
    return { agent: "devtrial", reason: "technical writing" };

  // Nova Pro — news, market, crypto, research, fast synthesis
  if (/\b(NEWS|MARKET|PRICE|CRYPTO|BITCOIN|ETH|STOCK|FUND|FINANCE|ECONOMY)\b/.test(up))
    return { agent: "nova", reason: "market/news" };
  if (/\b(RESEARCH|SUMMARIZE|WHAT HAPPENED|LATEST|CURRENT|TODAY|TREND)\b/.test(up))
    return { agent: "nova", reason: "research/synthesis" };
  if (/\b(BLOCKCHAIN|DEFI|PROTOCOL|LIQUIDITY|YIELD|APY|TVL)\b/.test(up))
    return { agent: "nova", reason: "crypto/blockchain" };

  // Nova — Google domain tasks too (Gemma not in active profiles)
  if (/\b(GOOGLE|GEMINI|YOUTUBE|MAPS|ANDROID|TENSORFLOW|KERAS)\b/.test(up))
    return { agent: "nova", reason: "Google domain via Nova" };

  // Claude — reasoning, law, trust, governance
  if (/\b(WHY|EXPLAIN|ANALYZE|REASON|VERIFY|HOW DOES)\b/.test(up))
    return { agent: "claude", reason: "reasoning" };
  if (/\b(LAW|LEGAL|STATUTE|FCRA|ACH|FDCPA|TRUST DEED|PROLOG|COVENANT)\b/.test(up))
    return { agent: "claude", reason: "law/trust" };
  if (/\b(ARCHITECTURE|DESIGN|SHOULD WE|REVIEW|AUDIT|GOVERNANCE)\b/.test(up))
    return { agent: "claude", reason: "architecture/review" };
  if (/\b(WORM|CHAIN|SEAL|CONSTITUTION|SOVEREIGN)\b/.test(up))
    return { agent: "claude", reason: "governance" };

  // Default
  const wordCount = input.trim().split(/\s+/).length;
  if (wordCount <= 5) return { agent: "mistral", reason: "short imperative" };
  return { agent: "claude", reason: "default" };
}

// ── WORM RECEIPT ──────────────────────────────────────────────────────────────

interface RouterReceipt {
  ts:     string;
  input:  string;
  agent:  Agent;
  reason: string;
  model:  string;
  tokens: number;
}

async function emitReceipt(r: RouterReceipt) {
  const line = JSON.stringify(r);
  const { promises: fs } = await import("fs");
  await fs.mkdir(".worm", { recursive: true }).catch(() => {});
  await fs.appendFile(".worm/router-chain.jsonl", line + "\n").catch(() => {
    process.stderr.write(`[ROUTER WORM] ${line}\n`);
  });
}

// ── CLAUDE CALL (Bedrock) ─────────────────────────────────────────────────────

async function callClaude(input: string, stream = true): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 8192,
    system: CLAUDE_SYSTEM,
    messages: [{ role: "user", content: input }],
  });

  process.stdout.write("\n[Claude via Bedrock — reasoning]\n");

  if (stream) {
    const cmd = new InvokeModelWithResponseStreamCommand({
      modelId: CLAUDE_MODEL,
      contentType: "application/json",
      accept: "application/json",
      body,
    });
    const resp = await bedrock.send(cmd);
    let full = "";
    for await (const ev of resp.body ?? []) {
      if (ev.chunk?.bytes) {
        const chunk = JSON.parse(new TextDecoder().decode(ev.chunk.bytes));
        const delta = chunk.delta?.text ?? "";
        process.stdout.write(delta);
        full += delta;
      }
    }
    process.stdout.write("\n");
    return full;
  }

  const cmd = new InvokeModelCommand({
    modelId: CLAUDE_MODEL,
    contentType: "application/json",
    accept: "application/json",
    body,
  });
  const resp = await bedrock.send(cmd);
  const parsed = JSON.parse(new TextDecoder().decode(resp.body));
  return parsed.content?.[0]?.text ?? "";
}

// ── BEDROCK MULTI-MODEL CALL ─────────────────────────────────────────────────

function modelIdForAgent(agent: Agent): string {
  switch (agent) {
    case "claude":   return CLAUDE_MODEL;
    case "nova":     return NOVA_MODEL;
    case "deepseek": return DEEPSEEK_MODEL;
    case "devtrial": return DEVTRIAL_MODEL;
    case "opus":     return OPUS_MODEL;
    case "local":    return LOCAL_MODEL;   // handled separately via Ollama
    default:         return CLAUDE_MODEL;
  }
}

// ── LOCAL OLLAMA CALL (Nemotron / trained Mistral) ────────────────────────────
async function callLocal(input: string): Promise<string> {
  process.stdout.write(`\n[LOCAL Ollama — ${LOCAL_MODEL}]\n`);
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: LOCAL_MODEL, prompt: input, stream: false }),
    });
    if (!resp.ok) return `[LOCAL] Ollama not running at ${OLLAMA_URL} — start with: ollama serve`;
    const data = await resp.json() as { response: string };
    process.stdout.write(data.response + "\n");
    return data.response;
  } catch {
    return `[LOCAL] Ollama unavailable at ${OLLAMA_URL}. Start Ollama and run: ollama pull nemotron`;
  }
}

// ── DEVTRIAL SYSTEM PROMPT ────────────────────────────────────────────────────
// Long-form writing engine. Cherry-picks from corpus, produces research papers.
const DEVTRIAL_SYSTEM = `You are DEVTRIAL, the SnapKitty long-form writing and research engine.

Your role: TECHNICAL WRITING, RESEARCH PAPERS, DOCUMENTATION, ACADEMIC SYNTHESIS.

You produce complete, well-structured long-form content:
- Technical whitepapers and research papers
- Academic-style documentation with citations
- Technical reports synthesizing multiple sources
- Executive summaries of complex technical work

Writing principles:
- Use the SnapKitty corpus and architecture as your knowledge base
- Be precise — cite specific components, files, theorems when relevant
- Structure: Abstract → Introduction → Technical Detail → Results → Conclusion
- No fluff, no filler. Every sentence earns its place.
- Include code blocks, diagrams (ASCII), and formal definitions where appropriate.

You are writing for sophisticated technical readers: researchers, engineers, attorneys, investors.
Evidence or Silence. Nothing in between.`;

async function callBedrock(input: string, agent: Agent): Promise<string> {
  const modelId = modelIdForAgent(agent);
  const system  = agent === "claude" ? CLAUDE_SYSTEM : MISTRAL_SYSTEM;
  const label   = `${agent.toUpperCase()} via Bedrock (${modelId})`;

  process.stdout.write(`\n[${label}]\n`);

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: input }],
  });

  // Nova / DeepSeek / Opus use the Converse API
  if (agent !== "claude") {
    const { ConverseStreamCommand } = await import("@aws-sdk/client-bedrock-runtime");
    // DeepSeek R1 doesn't accept system prompts — prepend to user message
    const userContent = agent === "deepseek"
      ? `${system}\n\nUser: ${input}`
      : input;
    const cmd = new ConverseStreamCommand({
      modelId,
      messages: [{ role: "user", content: [{ text: userContent }] }],
      ...(agent !== "deepseek" && { system: [{ text: system }] }),
    });
    // DeepSeek R1 is in us-west-2
    const client = agent === "deepseek" ? bedrockWest : bedrock;
    const resp = await client.send(cmd);
    let full = "";
    for await (const ev of resp.stream ?? []) {
      const delta = ev.contentBlockDelta?.delta?.text ?? "";
      process.stdout.write(delta);
      full += delta;
    }
    process.stdout.write("\n");
    return full;
  }

  // Claude uses the InvokeModel streaming path
  const cmd = new InvokeModelWithResponseStreamCommand({
    modelId, contentType: "application/json", accept: "application/json", body,
  });
  const resp = await bedrock.send(cmd);
  let full = "";
  for await (const ev of resp.body ?? []) {
    if (ev.chunk?.bytes) {
      const chunk = JSON.parse(new TextDecoder().decode(ev.chunk.bytes));
      const delta = chunk.delta?.text ?? "";
      process.stdout.write(delta);
      full += delta;
    }
  }
  process.stdout.write("\n");
  return full;
}

// ── MISTRAL CALL ──────────────────────────────────────────────────────────────

async function callMistral(input: string, stream = true): Promise<string> {
  process.stdout.write("\n[Mistral Codestral — terminal agent]\n");

  if (stream) {
    const s = await mistral.chat.completions.create({
      model:    MISTRAL_MODEL,
      stream:   true,
      messages: [
        { role: "system", content: MISTRAL_SYSTEM },
        { role: "user",   content: input },
      ],
    });
    let full = "";
    for await (const chunk of s) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      process.stdout.write(delta);
      full += delta;
    }
    process.stdout.write("\n");
    return full;
  }

  const r = await mistral.chat.completions.create({
    model:    MISTRAL_MODEL,
    stream:   false,
    messages: [
      { role: "system", content: MISTRAL_SYSTEM },
      { role: "user",   content: input },
    ],
  });
  return r.choices[0]?.message?.content ?? "";
}

// ── MAIN ROUTER ───────────────────────────────────────────────────────────────

async function initClients() {
  if (mistral) return;
  const vault = await getVault();
  mistral = new OpenAI({
    apiKey:  vault.get("MISTRAL_API_KEY"),
    baseURL: "https://api.mistral.ai/v1",
  });
}

export async function routeAndCall(input: string): Promise<string> {
  await initClients();
  const decision = route(input);

  console.log(`\n[SACM GATE] Input → ${decision.agent.toUpperCase()} (${decision.reason})`);
  const displayModel = decision.agent === "mistral" ? MISTRAL_MODEL
    : decision.agent === "local" ? `ollama:${LOCAL_MODEL}`
    : modelIdForAgent(decision.agent);
  console.log(`[SACM GATE] Model  → ${displayModel}\n`);

  const rawOutput = decision.agent === "mistral"
    ? await callMistral(input)
    : decision.agent === "local"
    ? await callLocal(input)
    : await callBedrock(input, decision.agent);

  // DFA leak scan — redact any accidental key leakage before output leaves
  const { clean, redacted, found } = scanForLeaks(rawOutput);
  if (!clean) {
    console.warn(`\n[VAULT LEAK SCANNER] ${found.length} pattern(s) redacted from output`);
    found.forEach(f => console.warn(`  → ${f}`));
  }
  const output = redacted;

  // WORM seal — fire and forget
  emitReceipt({
    ts:     new Date().toISOString(),
    input:  input.slice(0, 200),
    agent:  decision.agent,
    reason: decision.reason,
    model:  decision.agent === "mistral" ? MISTRAL_MODEL : modelIdForAgent(decision.agent),
    tokens: output.length, // approximate until SDK gives us token count
  }).catch(() => {});

  return output;
}

// ── CLI ENTRY ─────────────────────────────────────────────────────────────────

if (true) { // always run as CLI when invoked directly
  const input = process.argv.slice(2).join(" ");
  if (!input) {
    console.log(`
SOVEREIGN ROUTER — Claude ↔ Qwen SACM Gate
Usage: npx tsx sovereign-router.ts "<task>"

Examples:
  npx tsx sovereign-router.ts "push the download center to github"
  npx tsx sovereign-router.ts "why does the WORM chain use SHA-256"
  npx tsx sovereign-router.ts "write the product catalog JSON for the 11 repos"
  npx tsx sovereign-router.ts "explain the Stone Signing protocol"
`);
    process.exit(0);
  }

  routeAndCall(input).catch(err => {
    console.error("[ROUTER ERROR]", err.message);
    process.exit(1);
  });
}
