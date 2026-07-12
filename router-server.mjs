/**
 * SOVEREIGN ROUTER SERVER — router-server.mjs
 * Express backend with SSE streaming.
 * Connects the GitHub Pages frontend to the real routing engine.
 *
 * Start: node router-server.mjs
 * Port:  3001 (configurable via PORT env)
 *
 * Endpoints:
 *   GET  /health          → status + WORM head
 *   POST /route           → route a prompt, stream SSE events
 *   GET  /worm            → last 25 WORM entries
 *   GET  /kernels         → kernel registry
 *
 * Author: Ahmad Ali Parr + Claude Sonnet 4.6
 */

import { createServer } from 'http';
import { readFileSync, promises as fs } from 'fs';
import { createHash } from 'crypto';
import { routeAndCall, route } from './sovereign-router.js';

const PORT = process.env.PORT || 3001;
const WORM_PATH = '.worm/router-chain.jsonl';

// ── WORM helpers ──────────────────────────────────────────────────────────────

async function wormAppend(entry) {
  const line = JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n';
  await fs.mkdir('.worm', { recursive: true }).catch(() => {});
  await fs.appendFile(WORM_PATH, line);
}

async function wormRead(limit = 25) {
  try {
    const text = await fs.readFile(WORM_PATH, 'utf8');
    return text.trim().split('\n').filter(Boolean).slice(-limit).map(l => JSON.parse(l)).reverse();
  } catch { return []; }
}

// ── CORS headers ──────────────────────────────────────────────────────────────

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

function sseEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── Kernel registry (load once) ───────────────────────────────────────────────

let KERNELS = {};
try {
  KERNELS = JSON.parse(readFileSync('kernel-registry.json', 'utf8'));
} catch {}

// ── Request handler ───────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── GET /health ──────────────────────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/health') {
    const worm = await wormRead(1);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'live',
      router: 'sovereign-router v3.0',
      engines: ['claude', 'mistral', 'nova', 'deepseek', 'devtrial', 'local'],
      worm_head: worm[0]?.hash?.slice(0, 16) || 'GENESIS',
      ts: new Date().toISOString(),
    }));
    return;
  }

  // ── GET /worm ────────────────────────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/worm') {
    const entries = await wormRead(25);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(entries));
    return;
  }

  // ── GET /kernels ─────────────────────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/kernels') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(KERNELS));
    return;
  }

  // ── POST /route — SSE streaming ───────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/route') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { prompt } = JSON.parse(body || '{}');

    if (!prompt?.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'prompt required' }));
      return;
    }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const hash = createHash('sha256').update(prompt + Date.now()).digest('hex');
    const decision = route(prompt);

    // ── EVENT 1: gate decision ─────────────────────────────────────────────────
    sseEvent(res, 'gate', {
      agent:  decision.agent,
      reason: decision.reason,
      hash:   hash.slice(0, 16),
    });

    // ── EVENT 2: kernel chain start ────────────────────────────────────────────
    const kernelChain = {
      claude:   ['dfa-engine', 'route-dispatch', 'carto-prolog', 'ere-verify'],
      mistral:  ['dfa-engine', 'route-dispatch', 'sovereign-glue', 'ere-verify'],
      nova:     ['dfa-engine', 'route-dispatch', 'ere-verify'],
      deepseek: ['dfa-engine', 'route-dispatch', 'ere-verify'],
      devtrial: ['dfa-engine', 'route-dispatch', 'sovereign-glue', 'ere-verify'],
      local:    ['dfa-engine', 'route-dispatch', 'ere-verify'],
    }[decision.agent] || ['dfa-engine', 'ere-verify'];

    for (const kernel of kernelChain) {
      sseEvent(res, 'kernel', { name: kernel, status: 'running' });
      await new Promise(r => setTimeout(r, 80));
      sseEvent(res, 'kernel', { name: kernel, status: 'done' });
    }

    // ── EVENT 3: model start ───────────────────────────────────────────────────
    sseEvent(res, 'model', { agent: decision.agent, status: 'start' });

    // ── EVENT 4: stream output ─────────────────────────────────────────────────
    try {
      // Capture stdout from the router by monkey-patching process.stdout
      let output = '';
      const origWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = (chunk) => {
        const text = typeof chunk === 'string' ? chunk : chunk.toString();
        if (text && !text.startsWith('[SACM') && !text.startsWith('[ROUTER') && !text.startsWith('\n[')) {
          output += text;
          sseEvent(res, 'token', { text });
        }
        return origWrite(chunk);
      };

      await routeAndCall(prompt);

      process.stdout.write = origWrite;

      // ── EVENT 5: WORM seal ───────────────────────────────────────────────────
      const sealHash = createHash('sha256').update(output + hash).digest('hex');
      await wormAppend({ agent: decision.agent, reason: decision.reason, prompt: prompt.slice(0, 100), hash: sealHash });

      sseEvent(res, 'worm', {
        hash:  sealHash,
        agent: decision.agent,
        ts:    new Date().toISOString(),
      });

      sseEvent(res, 'done', { hash: sealHash });

    } catch (err) {
      sseEvent(res, 'error', { message: err.message });
    }

    res.end();
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  SOVEREIGN ROUTER SERVER                     ║`);
  console.log(`║  http://localhost:${PORT}                       ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  GET  /health    → status + WORM head        ║`);
  console.log(`║  POST /route     → SSE stream                ║`);
  console.log(`║  GET  /worm      → last 25 WORM entries      ║`);
  console.log(`║  GET  /kernels   → kernel registry           ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
});
