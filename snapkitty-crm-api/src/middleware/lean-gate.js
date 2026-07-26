/**
 * SnapKitty Lean Gate Middleware
 *
 * Routes execution requests through the Rust Lean kernel gate.
 * No command executes unless formally verified.
 *
 * Usage:
 *   const { leanGate } = require('../middleware/lean-gate');
 *   router.post('/execute', leanGate, controller.execute);
 */

const { spawn } = require('child_process');
const path = require('path');

// Docker: LEAN_GATE_PATH=/usr/local/bin/snapkitty-bridge (set in docker-compose)
// Local Windows dev: falls back to the debug build
const BRIDGE_PATH = process.env.LEAN_GATE_PATH ||
  path.resolve(__dirname, '../../../snapkitty-core/target/debug',
    process.platform === 'win32' ? 'snapkitty-bridge.exe' : 'snapkitty-bridge');
const BRIDGE_TIMEOUT_MS = 10_000;

let bridgeProcess = null;
let bridgeReady = false;
let pendingResponses = [];

/**
 * Start the Rust bridge process (singleton)
 */
function ensureBridge() {
  if (bridgeProcess && bridgeReady) return;

  bridgeProcess = spawn(BRIDGE_PATH, [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  bridgeProcess.on('error', (err) => {
    console.error('[lean-gate] bridge spawn error:', err.message);
    bridgeReady = false;
    bridgeProcess = null;
  });

  bridgeProcess.on('close', () => {
    bridgeReady = false;
    bridgeProcess = null;
  });

  let buffer = '';
  bridgeProcess.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && pendingResponses.length > 0) {
        const resolve = pendingResponses.shift();
        resolve(trimmed);
      }
    }
  });

  bridgeProcess.stderr.on('data', (chunk) => {
    // Bridge stderr is warnings — ignore
  });

  bridgeReady = true;
}

/**
 * Send a request to the Rust bridge and get a response
 */
function callBridge(request) {
  return new Promise((resolve, reject) => {
    ensureBridge();

    const timer = setTimeout(() => {
      reject(new Error('lean-gate timeout'));
    }, BRIDGE_TIMEOUT_MS);

    pendingResponses.push((raw) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error(`lean-gate parse error: ${e.message}`));
      }
    });

    bridgeProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

/**
 * Express middleware: verifies execution through Lean kernel gate
 *
 * Expects req.body to contain:
 *   { shell_cmd, shell_args, mcp_tool?, uses_network? }
 *
 * Attaches leanResult to req if verification passes.
 */
async function leanGate(req, res, next) {
  const { shell_cmd, shell_args, mcp_tool, uses_network } = req.body || {};

  if (!shell_cmd) {
    return res.status(400).json({
      error: 'lean-gate: shell_cmd required',
    });
  }

  try {
    const result = await callBridge({
      shell_cmd,
      shell_args: shell_args || [],
      mcp_tool: mcp_tool || null,
      uses_network: uses_network || false,
    });

    if (!result.valid) {
      return res.status(403).json({
        error: 'lean-gate: verification failed',
        reason: result.reason,
        checks: result.checks,
      });
    }

    req.leanResult = result;
    next();
  } catch (err) {
    console.error('[lean-gate] error:', err.message);
    return res.status(500).json({
      error: 'lean-gate: internal error',
      message: err.message,
    });
  }
}

/**
 * Shutdown the bridge process
 */
function shutdownBridge() {
  if (bridgeProcess) {
    bridgeProcess.kill();
    bridgeProcess = null;
    bridgeReady = false;
  }
}

module.exports = { leanGate, callBridge, shutdownBridge };
