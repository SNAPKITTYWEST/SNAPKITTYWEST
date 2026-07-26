/**
 * VEG → Lean Compiler
 * ===================
 * Verified Execution Graph → Lean Predicate Compiler
 *
 * Converts:
 *   - Agent dispatch trees → Lean agent_allowed predicates
 *   - MCP workflows → Lean workflow_allowed predicates
 *   - Security policies → Lean permission predicates
 *   - Shell commands → Lean is_safe_shell predicates
 *
 * Output: SnapKittyShellContract.lean extensions
 */

const crypto = require("node:crypto");
const auditLogService = require("./audit-log");

// ── VEG AST Types ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} VEGNode
 * @property {string} id - Node ID
 * @property {string} type - Node type (agent, mcp, shell, network, gate)
 * @property {string} name - Node name
 * @property {Object} config - Node configuration
 * @property {string[]} inputs - Input node IDs
 * @property {string[]} outputs - Output node IDs
 */

/**
 * @typedef {Object} VEGGraph
 * @property {string} id - Graph ID
 * @property {string} name - Graph name
 * @property {VEGNode[]} nodes - All nodes
 * @property {string} entry - Entry node ID
 * @property {string} exit - Exit node ID
 */

// ── Lean Code Generator ────────────────────────────────────────────────────────

class LeanCodeGenerator {
  constructor() {
    this._indent = 0;
    this._lines = [];
    this._definitions = new Set();
  }

  /**
   * Reset generator state
   */
  reset() {
    this._indent = 0;
    this._lines = [];
    this._definitions.clear();
  }

  /**
   * Add line with current indentation
   */
  addLine(line) {
    const indent = "  ".repeat(this._indent);
    this._lines.push(indent + line);
  }

  /**
   * Increase indent
   */
  indent() { this._indent++; }

  /**
   * Decrease indent
   */
  dedent() { this._indent = Math.max(0, this._indent - 1); }

  /**
   * Get generated code
   */
  getCode() {
    return this._lines.join("\n");
  }

  /**
   * Generate permission definition
   */
  generatePermissionDef(name, permissions) {
    this.addLine(`/-- ${name}: ${permissions.join(", ")} --/`);
    this.addLine(`def ${name}_perms : List Permission :=`);
    this.addLine(`  [${permissions.map(p => `Permission.${p}`).join(", ")}]`);
    this.addLine("");
    this._definitions.add(name);
  }

  /**
   * Generate agent predicate
   */
  generateAgentPredicate(agentName, requiredPerms) {
    const defName = `agent_${agentName}_valid`;
    if (this._definitions.has(defName)) return;

    this.addLine(`/-- Agent ${agentName} requires: ${requiredPerms.join(", ")} --/`);
    this.addLine(`def ${defName} (s : KernelState) : Bool :=`);
    this.addLine(`  ${requiredPerms.map(p => `has_perm s Permission.${p}`).join(" &&\n  ")}`);
    this.addLine("");
    this._definitions.add(defName);
  }

  /**
   * Generate MCP workflow predicate
   */
  generateMCPWorkflowPredicate(workflowName, tools, requiresNetwork) {
    const defName = `workflow_${workflowName}_valid`;
    if (this._definitions.has(defName)) return;

    this.addLine(`/-- Workflow ${workflowName}: MCP tools [${tools.join(", ")}] --/`);
    this.addLine(`def ${defName} (s : KernelState) : Bool :=`);

    const perms = tools.map(tool => {
      const perm = this._mcpToolToPermission(tool);
      return `mcp_allowed s MCPTool.${tool}`;
    });

    if (requiresNetwork) {
      perms.push("network_allowed s");
    }

    this.addLine(`  ${perms.join(" &&\n  ")}`);
    this.addLine("");
    this._definitions.add(defName);
  }

  /**
   * Generate shell safety predicate
   */
  generateShellPredicate(name, forbiddenPatterns) {
    const defName = `shell_${name}_valid`;
    if (this._definitions.has(defName)) return;

    this.addLine(`/-- Shell ${name}: blocks patterns [${forbiddenPatterns.join(", ")}] --/`);
    this.addLine(`def ${defName} (c : ShellCommand) : Bool :=`);

    const checks = forbiddenPatterns.map(pattern =>
      `¬ string_has_forbidden c.cmd`
    );

    this.addLine(`  ${checks.join(" &&\n  ")}`);
    this.addLine("");
    this._definitions.add(defName);
  }

  /**
   * Generate budget gate predicate
   */
  generateBudgetGate(gateName, maxAmountCents) {
    const defName = `budget_${gateName}_valid`;
    if (this._definitions.has(defName)) return;

    this.addLine(`/-- Budget gate ${gateName}: max ${(maxAmountCents / 100).toFixed(2)} --/`);
    this.addLine(`def ${defName} (s : KernelState) (amount_cents : Nat) : Bool :=`);
    this.addLine(`  has_perm s Permission.write &&`);
    this.addLine(`  has_perm s Permission.read &&`);
    this.addLine(`  cpu_ok s &&`);
    this.addLine(`  (amount_cents ≤ ${maxAmountCents})`);
    this.addLine("");
    this._definitions.add(defName);
  }

  /**
   * Generate LOC audit gate
   */
  generateLOCAuditGate(gateName) {
    const defName = `loc_${gateName}_valid`;
    if (this._definitions.has(defName)) return;

    this.addLine(`/-- LOC audit gate ${gateName}: excludes DEFAULT status --/`);
    this.addLine(`def ${defName} (s : KernelState) (loc_status : String) : Bool :=`);
    this.addLine(`  has_perm s Permission.execute &&`);
    this.addLine(`  has_perm s Permission.read &&`);
    this.addLine(`  cpu_ok s &&`);
    this.addLine(`  (loc_status != "DEFAULT")`);
    this.addLine("");
    this._definitions.add(defName);
  }

  /**
   * Generate master gate for a graph
   */
  generateMasterGate(graphName, predicates) {
    this.addLine(`/-- Master gate for ${graphName}: combines all sub-gates --/`);
    this.addLine(`def gate_${graphName} (s : KernelState) (r : ExecutionRequest) : Bool :=`);
    this.addLine(`  system_healthy s &&`);
    this.addLine(`  safe_request s r &&`);
    predicates.forEach((pred, i) => {
      const connector = i < predicates.length - 1 ? "&&" : "";
      this.addLine(`  ${pred} ${connector}`);
    });
    this.addLine("");
  }

  /**
   * Map MCP tool to required permission
   */
  _mcpToolToPermission(tool) {
    const readTools = ["gl_get_trial_balance", "gl_get_account_balance", "consolidated_balance_sheet", "budget_variance"];
    const writeTools = ["gl_create_journal_entry"];
    const executeTools = ["loc_audit", "loc_calculate_interest", "consolidation_eliminate_ic"];
    const mcpTools = ["prolog_verify_deed", "woz_vault_status"];

    if (readTools.includes(tool)) return "read";
    if (writeTools.includes(tool)) return "write";
    if (executeTools.includes(tool)) return "execute";
    if (mcpTools.includes(tool)) return "mcp";
    return "execute";
  }
}

// ── VEG Graph Parser ───────────────────────────────────────────────────────────

class VEGGraphParser {
  /**
   * Parse a dispatch tree into VEG nodes
   */
  parseDispatchTree(dispatchConfig) {
    const nodes = [];

    // Parse subagent types
    if (dispatchConfig.agents) {
      for (const agent of dispatchConfig.agents) {
        nodes.push({
          id: agent.id || crypto.randomUUID(),
          type: "agent",
          name: agent.type,
          config: {
            tier: agent.tier || 2,
            timeout: agent.timeoutMs || 10000,
            capabilities: agent.capabilities || []
          },
          inputs: agent.dependencies || [],
          outputs: []
        });
      }
    }

    // Parse MCP tools
    if (dispatchConfig.mcpTools) {
      for (const tool of dispatchConfig.mcpTools) {
        nodes.push({
          id: tool.id || crypto.randomUUID(),
          type: "mcp",
          name: tool.name,
          config: {
            category: tool.category,
            requiresNetwork: tool.requiresNetwork || false
          },
          inputs: tool.dependencies || [],
          outputs: []
        });
      }
    }

    // Parse shell commands
    if (dispatchConfig.shellCommands) {
      for (const cmd of dispatchConfig.shellCommands) {
        nodes.push({
          id: cmd.id || crypto.randomUUID(),
          type: "shell",
          name: cmd.name || cmd.command,
          config: {
            command: cmd.command,
            args: cmd.args || [],
            forbidden: cmd.forbidden || []
          },
          inputs: cmd.dependencies || [],
          outputs: []
        });
      }
    }

    return nodes;
  }

  /**
   * Parse an MCP workflow into VEG nodes
   */
  parseMCPWorkflow(workflowConfig) {
    const nodes = [];

    for (const step of workflowConfig.steps) {
      nodes.push({
        id: step.id || crypto.randomUUID(),
        type: "mcp",
        name: step.tool,
        config: {
          category: step.category || "UNKNOWN",
          requiresNetwork: step.requiresNetwork || false,
          args: step.args || {}
        },
        inputs: step.dependencies || [],
        outputs: []
      });
    }

    return nodes;
  }
}

// ── VEG → Lean Compiler ────────────────────────────────────────────────────────

class VEGToLeanCompiler {
  constructor() {
    this._generator = new LeanCodeGenerator();
    this._parser = new VEGGraphParser();
    this._compiledGraphs = new Map();
  }

  /**
   * Compile a dispatch tree to Lean predicates
   */
  compileDispatchTree(name, dispatchConfig) {
    this._generator.reset();

    const nodes = this._parser.parseDispatchTree(dispatchConfig);

    // Generate agent predicates
    for (const node of nodes) {
      if (node.type === "agent") {
        const perms = this._agentTypeToPermissions(node.name);
        this._generator.generateAgentPredicate(node.name, perms);
      }
    }

    // Generate MCP workflow predicates
    const mcpNodes = nodes.filter(n => n.type === "mcp");
    if (mcpNodes.length > 0) {
      this._generator.generateMCPWorkflowPredicate(
        name,
        mcpNodes.map(n => n.name),
        mcpNodes.some(n => n.config.requiresNetwork)
      );
    }

    // Generate shell predicates
    const shellNodes = nodes.filter(n => n.type === "shell");
    for (const node of shellNodes) {
      this._generator.generateShellPredicate(
        node.name,
        node.config.forbidden || [";", "|", "&", "$"]
      );
    }

    // Generate master gate
    const predicates = [];
    if (mcpNodes.length > 0) {
      predicates.push(`workflow_${name}_valid s`);
    }
    for (const node of shellNodes) {
      predicates.push(`shell_${node.name}_valid r.shell`);
    }

    if (predicates.length > 0) {
      this._generator.generateMasterGate(name, predicates);
    }

    const code = this._generator.getCode();
    this._compiledGraphs.set(name, { nodes, code, compiledAt: new Date().toISOString() });

    return { name, code, nodeCount: nodes.length };
  }

  /**
   * Compile an MCP workflow to Lean predicates
   */
  compileMCPWorkflow(name, workflowConfig) {
    this._generator.reset();

    const nodes = this._parser.parseMCPWorkflow(workflowConfig);

    // Generate workflow predicate
    this._generator.generateMCPWorkflowPredicate(
      name,
      nodes.map(n => n.name),
      workflowConfig.requiresNetwork || false
    );

    // Generate master gate
    this._generator.generateMasterGate(name, [`workflow_${name}_valid s`]);

    const code = this._generator.getCode();
    this._compiledGraphs.set(name, { nodes, code, compiledAt: new Date().toISOString() });

    return { name, code, nodeCount: nodes.length };
  }

  /**
   * Compile a security policy to Lean predicates
   */
  compileSecurityPolicy(name, policyConfig) {
    this._generator.reset();

    // Generate permission definitions
    if (policyConfig.permissions) {
      this._generator.generatePermissionDef(
        name,
        policyConfig.permissions
      );
    }

    // Generate budget gates
    if (policyConfig.budgetGates) {
      for (const gate of policyConfig.budgetGates) {
        this._generator.generateBudgetGate(gate.name, gate.maxAmountCents);
      }
    }

    // Generate LOC gates
    if (policyConfig.locGates) {
      for (const gate of policyConfig.locGates) {
        this._generator.generateLOCAuditGate(gate.name);
      }
    }

    const code = this._generator.getCode();
    this._compiledGraphs.set(name, { code, compiledAt: new Date().toISOString() });

    return { name, code };
  }

  /**
   * Compile all configurations to a single Lean file
   */
  compileAll(configs) {
    this._generator.reset();

    this._generator.addLine("/-");
    this._generator.addLine("SnapKitty Auto-Generated Predicates");
    this._generator.addLine(`Generated: ${new Date().toISOString()}`);
    this._generator.addLine("DO NOT EDIT MANUALLY");
    this._generator.addLine("-/");
    this._generator.addLine("");
    this._generator.addLine("namespace SnapKitty");
    this._generator.addLine("");

    for (const config of configs) {
      this._generator.addLine(`/-- ${config.name} --/`);
      this._generator.addLine("");

      if (config.type === "dispatch") {
        this.compileDispatchTree(config.name, config.data);
      } else if (config.type === "workflow") {
        this.compileMCPWorkflow(config.name, config.data);
      } else if (config.type === "policy") {
        this.compileSecurityPolicy(config.name, config.data);
      }
    }

    this._generator.addLine("end SnapKitty");

    return this._generator.getCode();
  }

  /**
   * Get all compiled graphs
   */
  getCompiledGraphs() {
    return Array.from(this._compiledGraphs.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
  }

  /**
   * Map agent type to required permissions
   */
  _agentTypeToPermissions(agentType) {
    const map = {
      forge: ["write", "read"],
      sentinel: ["execute", "read"],
      ledge: ["read"],
      atlas: ["read"],
      oracle: ["read"],
      nexus: ["execute", "read"]
    };
    return map[agentType] || ["read"];
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

const compiler = new VEGToLeanCompiler();

module.exports = {
  VEGToLeanCompiler,
  VEGGraphParser,
  LeanCodeGenerator,
  compiler
};
