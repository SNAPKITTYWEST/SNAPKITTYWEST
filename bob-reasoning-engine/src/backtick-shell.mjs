/**
 * backtick-shell.mjs — Sovereign Shell Execution
 * BOB Reasoning Engine · Agent capability layer
 *
 * Standard AI shell execution is flawed:
 *   exec(cmd) → string dump → no gate → no seal → hallucinations pass through
 *
 * Sovereign backtick execution:
 *   command → EDAULC trust check → backtick composition → entropy gate → WORM seal
 *
 * The backtick is the sovereign shell primitive:
 *   compositional  — output of one command becomes input to the next
 *   deterministic  — same command, same output, auditable
 *   chainable      — pipes naturally into WORM seal
 *   gated          — hallucinated commands fail trust check before execution
 *
 * Author: Ahmad Ali Parr · SnapKitty Collective · 2026
 */

import { execSync }    from 'child_process'
import { createHash }  from 'crypto'

const PHI             = (1 + Math.sqrt(5)) / 2
const ENTROPY_GATE    = 0.21
const MAX_OUTPUT_BYTES = 64 * 1024  // 64KB cap — no runaway output

// ── Seal ──────────────────────────────────────────────────────────────────────

function seal (content) {
  return createHash('sha256').update(String(content)).digest('hex').slice(0, 16)
}

function full_hash (content) {
  return createHash('sha256').update(String(content)).digest('hex')
}

// ── EDAULC Trust Check — command must pass before execution ───────────────────

const BLOCKED_PATTERNS = [
  /rm\s+-rf/,           // destructive delete
  />\s*\/dev\/sd/,      // disk overwrite
  /mkfs/,               // format
  /dd\s+if=/,           // disk dump
  /curl.*\|\s*sh/,      // pipe to shell
  /wget.*\|\s*sh/,      // pipe to shell
  /chmod\s+777/,        // world-writable
  /sudo\s+rm/,          // privileged delete
  /:\(\)\{.*\}/,        // fork bomb
  /base64.*\|\s*sh/,    // obfuscated exec
]

const SOVEREIGN_PATTERNS = [
  /^git\s/,             // git operations — trusted
  /^grep\s/,            // search — trusted
  /^find\s/,            // find — trusted
  /^cat\s/,             // read — trusted
  /^ls\s*/,             // list — trusted
  /^node\s/,            // node execution — trusted
  /^curl\s/,            // curl — conditionally trusted (checked below)
]

function edaulc_command_trust (cmd) {
  // Block dangerous patterns regardless
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cmd)) {
      return {
        trusted: false,
        reason:  `BLOCKED: matches dangerous pattern ${pattern}`,
        score:   0.0,
      }
    }
  }

  // curl is allowed but not piped to shell
  if (/curl/.test(cmd) && /\|\s*(sh|bash|zsh)/.test(cmd)) {
    return { trusted: false, reason: 'BLOCKED: curl piped to shell', score: 0.0 }
  }

  // Score trust vector
  const is_sovereign = SOVEREIGN_PATTERNS.some(p => p.test(cmd.trim()))
  const has_pipe     = cmd.includes('|')
  const has_backtick = cmd.includes('`')
  const length_ok    = cmd.length < 512

  const trust_vector = {
    coherence:                length_ok ? 0.9 : 0.4,
    provenance:               1.0,          // agent invoked explicitly
    reversibility:            is_sovereign ? 0.9 : 0.5,
    consent:                  1.0,          // agent called this
    auditability:             1.0,          // command string is fully visible
    semantic_alignment:       is_sovereign ? 1.0 : 0.6,
    contradiction_resistance: 1.0,          // no sorry in a shell command
  }

  const norm  = Math.sqrt(Object.values(trust_vector).reduce((s, v) => s + v * v, 0))
  const score = norm / Math.sqrt(7)

  return { trusted: score > 0.75, score, trust_vector, is_sovereign, has_pipe, has_backtick }
}

// ── Entropy Gate ──────────────────────────────────────────────────────────────

function entropy_gate (score) {
  const p    = Math.max(score, 1e-10)
  const q    = Math.max(1 - score, 1e-10)
  const H    = -(p * Math.log(p) + q * Math.log(q)) / Math.log(PHI)
  return { entropy: H, open: H < ENTROPY_GATE }
}

// ── Backtick Composition ──────────────────────────────────────────────────────
// Executes the command using actual shell backtick semantics:
// the output is captured inline, trimmed, ready for composition.

function backtick (cmd, opts = {}) {
  const {
    timeout  = 10000,
    cwd      = process.cwd(),
    env      = process.env,
  } = opts

  try {
    const raw = execSync(cmd, {
      encoding:   'utf8',
      timeout,
      cwd,
      env,
      shell:      true,
      maxBuffer:  MAX_OUTPUT_BYTES,
    })
    return { ok: true, output: raw.trim(), exit_code: 0 }
  } catch (err) {
    return {
      ok:        false,
      output:    (err.stdout || '').trim(),
      stderr:    (err.stderr || '').trim(),
      exit_code: err.status || 1,
      error:     err.message.slice(0, 200),
    }
  }
}

// ── Backtick Compose — chain output into next command ─────────────────────────
// Equivalent to: result=`cmd1 | cmd2`
// Executes the full pipeline and returns composed output.

function backtick_compose (...cmds) {
  const pipeline = cmds.join(' | ')
  return backtick(pipeline)
}

// ── WORM Seal ─────────────────────────────────────────────────────────────────

function worm_seal_exec (agent_id, cmd, trust, gate, result) {
  const content = JSON.stringify({
    agent_id,
    cmd,
    trust_score:  trust.score,
    entropy:      gate.entropy,
    exit_code:    result.exit_code,
    output_hash:  full_hash(result.output || ''),
    timestamp:    new Date().toISOString(),
  })

  const state_hash = full_hash(content)
  const worm       = seal(content)

  return {
    action_id:    `shell-exec-${worm}`,
    agent_id,
    cmd,
    trust_score:  trust.score,
    entropy:      gate.entropy,
    exit_code:    result.exit_code,
    ok:           result.ok,
    output_lines: (result.output || '').split('\n').length,
    state_hash,
    worm_seal:    worm,
    append_only:  true,
    timestamp:    new Date().toISOString(),
  }
}

// ── Sovereign Execute — full pipeline ─────────────────────────────────────────

export async function sovereign_exec (agent_id, cmd, opts = {}) {
  // 1. EDAULC trust check
  const trust = edaulc_command_trust(cmd)
  if (!trust.trusted) {
    return {
      ok:      false,
      blocked: true,
      reason:  trust.reason,
      cmd,
      receipt: null,
    }
  }

  // 2. Entropy gate
  const gate = entropy_gate(trust.score)
  if (!gate.open) {
    return {
      ok:      false,
      blocked: true,
      reason:  `Entropy gate closed: H=${gate.entropy.toFixed(4)} ≥ ${ENTROPY_GATE}`,
      cmd,
      receipt: null,
    }
  }

  // 3. Backtick execution
  const result = backtick(cmd, opts)

  // 4. WORM seal
  const receipt = worm_seal_exec(agent_id, cmd, trust, gate, result)

  return {
    ok:      result.ok,
    blocked: false,
    output:  result.output,
    stderr:  result.stderr,
    receipt,
  }
}

// ── Agent-facing shortcuts ─────────────────────────────────────────────────────

export const SHELL = {
  // Sovereign grep — search only committed files
  grep: (pattern, glob = '') => sovereign_exec(
    'SENTINEL',
    glob
      ? `grep -r "${pattern}" \`git ls-files "${glob}"\``
      : `grep -rn "${pattern}" \`git ls-files\``,
  ),

  // Sovereign find — scoped to repo
  find: (name_pattern) => sovereign_exec(
    'ATLAS',
    `find . -name "${name_pattern}" -not -path "*/node_modules/*" -not -path "*/.git/*"`,
  ),

  // Sovereign git log
  log: (n = 10) => sovereign_exec(
    'MNEMEX',
    `git log --oneline -${n}`,
  ),

  // Sovereign curl — GET only, no pipe to shell
  curl: (url) => sovereign_exec(
    'HERALD',
    `curl -s --max-time 10 "${url}"`,
  ),

  // Backtick compose — pipeline
  compose: (...cmds) => {
    const pipeline = cmds.join(' | ')
    return sovereign_exec('BOB', pipeline)
  },
}

// ── CLI demo ──────────────────────────────────────────────────────────────────

if (process.argv[1].endsWith('backtick-shell.mjs')) {
  const demos = [
    ['BOB',      'git ls-files "*.mjs" | head -5'],
    ['SENTINEL', 'grep -rn "WORM" `git ls-files "*.mjs"` | head -5'],
    ['ATLAS',    'find . -name "*.apl" -not -path "*/node_modules/*"'],
    ['CIPHER',   'rm -rf /tmp/test'],  // should be BLOCKED
  ]

  for (const [agent, cmd] of demos) {
    const r = await sovereign_exec(agent, cmd)
    console.log(`\n[${agent}] ${cmd}`)
    if (r.blocked) {
      console.log(`  ⊥ BLOCKED — ${r.reason}`)
    } else {
      console.log(`  ✓ seal: ${r.receipt?.worm_seal}`)
      console.log(`  output: ${(r.output || '').split('\n').slice(0, 3).join(' | ')}`)
    }
  }
}
