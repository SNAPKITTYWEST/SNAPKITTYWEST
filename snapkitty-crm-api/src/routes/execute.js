/**
 * SnapKitty Execution Routes
 *
 * THE ONLY entrypoint for shell execution.
 * Every request goes through the Lean kernel gate.
 *
 * Kernel gate chain:
 *   Request → Lean Verification → guarded_execute → sandbox → OS
 */

const express = require("express");
const { leanGate } = require("../middleware/lean-gate");

const router = express.Router();

/**
 * POST /api/execute
 *
 * Body:
 *   { shell_cmd, shell_args?, mcp_tool?, uses_network?, agent? }
 *
 * Response:
 *   { success, stdout, stderr, exit_code, duration_ms, lean_verification }
 */
router.post("/", leanGate, async (req, res) => {
  const { leanResult } = req;

  // leanResult is already validated by the middleware
  // If we got here, the Lean gate passed

  if (!leanResult.executed) {
    return res.status(403).json({
      error: 'Lean gate passed but execution not performed',
      lean: leanResult,
    });
  }

  res.json({
    success: leanResult.success,
    stdout: leanResult.stdout,
    stderr: leanResult.stderr,
    exit_code: leanResult.exit_code,
    duration_ms: leanResult.duration_ms,
    lean_verification: {
      valid: leanResult.valid,
      checks: leanResult.checks,
    },
  });
});

/**
 * GET /api/execute/predicates
 *
 * Returns the list of Lean predicates enforced by the kernel gate.
 */
router.get("/predicates", (req, res) => {
  res.json({
    predicates: [
      "is_safe_shell — no forbidden characters in cmd or args",
      "cpu_ok — runtime ≤ 10,000ms",
      "has_perm(execute) — agent has execute permission",
      "mcp_allowed(tool) — tool-specific permission check",
      "network_allowed — network permission + not locked",
      "valid_execution — all of the above combined",
      "snapkitty_gate — master gate (healthy + safe)",
    ],
    gate_chain: "Request → Lean Kernel → guarded_execute → sandbox → OS",
  });
});

module.exports = router;
