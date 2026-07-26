const express = require("express");
const { compiler } = require("../services/veg-lean-compiler");

const router = express.Router();

// ── VEG → Lean Compilation ─────────────────────────────────────────────────────

/**
 * POST /api/veg/compile/dispatch
 * Compile a dispatch tree to Lean predicates
 */
router.post("/compile/dispatch", (req, res, next) => {
  try {
    const { name, dispatchConfig } = req.body;
    const result = compiler.compileDispatchTree(name, dispatchConfig);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/veg/compile/workflow
 * Compile an MCP workflow to Lean predicates
 */
router.post("/compile/workflow", (req, res, next) => {
  try {
    const { name, workflowConfig } = req.body;
    const result = compiler.compileMCPWorkflow(name, workflowConfig);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/veg/compile/policy
 * Compile a security policy to Lean predicates
 */
router.post("/compile/policy", (req, res, next) => {
  try {
    const { name, policyConfig } = req.body;
    const result = compiler.compileSecurityPolicy(name, policyConfig);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/veg/compile/all
 * Compile all configurations to a single Lean file
 */
router.post("/compile/all", (req, res, next) => {
  try {
    const { configs } = req.body;
    const leanCode = compiler.compileAll(configs);
    res.json({ leanCode, length: leanCode.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/veg/compiled
 * Get all compiled graphs
 */
router.get("/compiled", (req, res, next) => {
  try {
    const graphs = compiler.getCompiledGraphs();
    res.json({ graphs });
  } catch (error) {
    next(error);
  }
});

// ── Kernel Gate Verification ───────────────────────────────────────────────────

/**
 * POST /api/veg/verify
 * Verify an execution request against kernel gate
 */
router.post("/verify", (req, res, next) => {
  try {
    const { permissions, sandbox, cpuLimitMs, request } = req.body;

    // Create kernel gate
    const { KernelGate } = require("../../../../../snapkitty-core/src/kernel_gate");
    const gate = new KernelGate(permissions || [], sandbox || "default", cpuLimitMs || 5000);

    // Verify request
    const result = gate.verify({
      shell_cmd: request.shellCmd || "echo",
      shell_args: request.shellArgs || [],
      mcp_tool: request.mcpTool || null,
      uses_network: request.usesNetwork || false
    });

    res.json(result);
  } catch (error) {
    // Fallback: simple validation
    const { permissions = [], request = {} } = req.body;

    const checks = [];
    let allPassed = true;

    // Shell safety check
    const forbidden = [';', '|', '&', '$', '(', ')', '<', '>', '!', '#', '*', '?', '~', '{', '}', '[', ']'];
    const cmdSafe = !(request.shellCmd || "").split("").some(c => forbidden.includes(c));
    checks.push({ name: "is_safe_shell", passed: cmdSafe, message: cmdSafe ? "Shell safe" : "Forbidden chars" });
    if (!cmdSafe) allPassed = false;

    // Permission check
    const hasExec = permissions.includes("execute");
    checks.push({ name: "has_perm(execute)", passed: hasExec, message: hasExec ? "Execute granted" : "Execute denied" });
    if (!hasExec) allPassed = false;

    // MCP check
    if (request.mcpTool) {
      const readTools = ["gl_get_trial_balance", "gl_get_account_balance", "consolidated_balance_sheet", "budget_variance"];
      const writeTools = ["gl_create_journal_entry"];
      const executeTools = ["loc_audit", "loc_calculate_interest", "consolidation_eliminate_ic"];
      const mcpTools = ["prolog_verify_deed", "woz_vault_status"];

      let requiredPerm = "execute";
      if (readTools.includes(request.mcpTool)) requiredPerm = "read";
      else if (writeTools.includes(request.mcpTool)) requiredPerm = "write";
      else if (mcpTools.includes(request.mcpTool)) requiredPerm = "mcp";

      const hasPerm = permissions.includes(requiredPerm);
      checks.push({ name: `mcp_allowed(${request.mcpTool})`, passed: hasPerm, message: hasPerm ? "MCP allowed" : `Requires ${requiredPerm}` });
      if (!hasPerm) allPassed = false;
    }

    res.json({
      valid: allPassed,
      reason: allPassed ? null : "Execution denied by kernel gate",
      checks
    });
  }
});

// ── Example Configurations ─────────────────────────────────────────────────────

/**
 * GET /api/veg/examples/dispatch
 * Get example dispatch tree configuration
 */
router.get("/examples/dispatch", (req, res) => {
  res.json({
    name: "council_dispatch",
    type: "dispatch",
    data: {
      agents: [
        { type: "forge", tier: 2, timeoutMs: 10000, capabilities: ["code", "reasoning"] },
        { type: "sentinel", tier: 1, timeoutMs: 8000, capabilities: ["security", "reasoning"] },
        { type: "ledge", tier: 2, timeoutMs: 6000, capabilities: ["analysis"] },
        { type: "atlas", tier: 1, timeoutMs: 12000, capabilities: ["reasoning"] }
      ],
      mcpTools: [
        { name: "gl_get_trial_balance", category: "FINANCE" },
        { name: "loc_audit", category: "LOC" }
      ],
      shellCommands: [
        { name: "deploy", command: "npm", args: ["run", "deploy"], forbidden: [";", "|", "&"] }
      ]
    }
  });
});

/**
 * GET /api/veg/examples/workflow
 * Get example MCP workflow configuration
 */
router.get("/examples/workflow", (req, res) => {
  res.json({
    name: "quarterly_consolidation",
    type: "workflow",
    data: {
      steps: [
        { tool: "gl_get_trial_balance", category: "FINANCE", requiresNetwork: false },
        { tool: "consolidated_balance_sheet", category: "CONSOLIDATION", requiresNetwork: false },
        { tool: "budget_variance", category: "BUDGET", requiresNetwork: false },
        { tool: "loc_audit", category: "LOC", requiresNetwork: false }
      ],
      requiresNetwork: false
    }
  });
});

/**
 * GET /api/veg/examples/policy
 * Get example security policy configuration
 */
router.get("/examples/policy", (req, res) => {
  res.json({
    name: "production_policy",
    type: "policy",
    data: {
      permissions: ["read", "write", "execute"],
      budgetGates: [
        { name: "standard", maxAmountCents: 10000000 },
        { name: "large", maxAmountCents: 100000000 }
      ],
      locGates: [
        { name: "standard" }
      ]
    }
  });
});

module.exports = router;
