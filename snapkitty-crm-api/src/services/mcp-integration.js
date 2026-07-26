/**
 * MCP Tool Integration
 * ====================
 * Model Context Protocol — standardized external tool access.
 * Matches MOAT-FEATURE-EXTRACTION §17: MCP Tool Integration
 *
 * MCP lets external tools (Prolog trust deeds, WOZ Vault, IBM Z Understand)
 * participate as MCP servers. The ToolBroker becomes an MCP client.
 */

const { EventEmitter } = require("events");
const crypto = require("node:crypto");
const auditLogService = require("./audit-log");

// ── MCP Protocol Types ─────────────────────────────────────────────────────────

/**
 * MCP Tool Definition
 * @typedef {Object} MCPTool
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {Object} inputSchema - JSON Schema for input
 * @property {string} category - Tool category
 * @property {string} source - Source server
 */

/**
 * MCP Tool Call
 * @typedef {Object} MCPCall
 * @property {string} id - Call ID
 * @property {string} name - Tool name
 * @property {Object} arguments - Tool arguments
 * @property {string} source - Caller ID
 */

/**
 * MCP Tool Result
 * @typedef {Object} MCPResult
 * @property {string} id - Call ID
 * @property {string} name - Tool name
 * @property {*} result - Tool result
 * @property {boolean} isError - Whether result is an error
 * @property {number} latencyMs - Execution time
 */

// ── Built-in MCP Tools ─────────────────────────────────────────────────────────

const BUILTIN_TOOLS = [
  // GL Tools
  {
    name: "gl_get_trial_balance",
    description: "Get trial balance for an entity as of a date",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", default: "default" },
        asOfDate: { type: "string", format: "date" }
      }
    },
    category: "FINANCE",
    source: "builtin"
  },
  {
    name: "gl_get_account_balance",
    description: "Get balance for a specific GL account",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string" },
        startDate: { type: "string" },
        endDate: { type: "string" }
      },
      required: ["accountId"]
    },
    category: "FINANCE",
    source: "builtin"
  },
  {
    name: "gl_create_journal_entry",
    description: "Create a balanced journal entry",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string" },
        description: { type: "string" },
        reference: { type: "string" },
        source: { type: "string" },
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              accountId: { type: "string" },
              debitCents: { type: "integer" },
              creditCents: { type: "integer" }
            }
          }
        }
      },
      required: ["date", "description", "lines"]
    },
    category: "FINANCE",
    source: "builtin"
  },

  // LOC Tools
  {
    name: "loc_audit",
    description: "Perform covenant and collateral audit on a line of credit",
    inputSchema: {
      type: "object",
      properties: {
        locId: { type: "string" },
        auditType: { type: "string", enum: ["COVENANT_CHECK", "COLLATERAL_REVAL", "COMPLIANCE"] }
      },
      required: ["locId"]
    },
    category: "LOC",
    source: "builtin"
  },
  {
    name: "loc_calculate_interest",
    description: "Calculate interest on a line of credit",
    inputSchema: {
      type: "object",
      properties: {
        principalCents: { type: "integer" },
        rateBps: { type: "integer" },
        daysInPeriod: { type: "integer" }
      },
      required: ["principalCents", "rateBps", "daysInPeriod"]
    },
    category: "LOC",
    source: "builtin"
  },

  // Consolidation Tools
  {
    name: "consolidation_eliminate_ic",
    description: "Eliminate intercompany transactions for a period",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string" }
      },
      required: ["period"]
    },
    category: "CONSOLIDATION",
    source: "builtin"
  },
  {
    name: "consolidated_balance_sheet",
    description: "Get consolidated balance sheet across all entities",
    inputSchema: {
      type: "object",
      properties: {
        asOfDate: { type: "string" }
      }
    },
    category: "CONSOLIDATION",
    source: "builtin"
  },

  // Budget Tools
  {
    name: "budget_variance",
    description: "Calculate budget vs actual variance for a period",
    inputSchema: {
      type: "object",
      properties: {
        budgetId: { type: "string" },
        period: { type: "string" },
        criticalThresholdPct: { type: "number", default: 20 },
        warningThresholdPct: { type: "number", default: 10 }
      },
      required: ["budgetId"]
    },
    category: "BUDGET",
    source: "builtin"
  },

  // Prolog Trust Deed Tools
  {
    name: "prolog_verify_deed",
    description: "Verify a trust deed against Prolog rules",
    inputSchema: {
      type: "object",
      properties: {
        deedPath: { type: "string" },
        action: { type: "string" }
      },
      required: ["deedPath", "action"]
    },
    category: "TRUST",
    source: "prolog"
  },

  // WOZ Vault Tools
  {
    name: "woz_vault_status",
    description: "Get WOZ Vault status and recent seals",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", default: 10 }
      }
    },
    category: "VAULT",
    source: "woz-vault"
  }
];

// ── MCP Server Registry ────────────────────────────────────────────────────────

class MCPServerRegistry {
  constructor() {
    this._servers = new Map();
    this._tools = new Map();
    this._callLog = [];

    // Register built-in tools
    for (const tool of BUILTIN_TOOLS) {
      this._tools.set(tool.name, tool);
    }
  }

  /**
   * Register an MCP server
   */
  registerServer(serverId, config) {
    const server = {
      id: serverId,
      name: config.name || serverId,
      url: config.url,
      transport: config.transport || "stdio",
      capabilities: config.capabilities || [],
      tools: config.tools || [],
      status: "registered",
      registeredAt: new Date().toISOString(),
      lastPing: null
    };

    this._servers.set(serverId, server);

    // Register tools from server
    for (const tool of server.tools) {
      this._tools.set(tool.name, { ...tool, source: serverId });
    }

    auditLogService.pushActivity({
      category: "MCP_SERVER",
      text: `MCP server registered: ${server.name} with ${server.tools.length} tools`,
      metadata: { serverId, toolCount: server.tools.length }
    });

    return server;
  }

  /**
   * Unregister an MCP server
   */
  unregisterServer(serverId) {
    const server = this._servers.get(serverId);
    if (!server) return false;

    // Remove tools from server
    for (const toolName of server.tools) {
      this._tools.delete(toolName.name || toolName);
    }

    this._servers.delete(serverId);

    auditLogService.pushActivity({
      category: "MCP_SERVER",
      text: `MCP server unregistered: ${server.name}`,
      metadata: { serverId }
    });

    return true;
  }

  /**
   * List all available tools
   */
  listTools(category) {
    const tools = Array.from(this._tools.values());
    if (category) {
      return tools.filter(t => t.category === category);
    }
    return tools;
  }

  /**
   * Get tool definition
   */
  getTool(toolName) {
    return this._tools.get(toolName);
  }

  /**
   * List registered servers
   */
  listServers() {
    return Array.from(this._servers.values());
  }
}

// ── MCP Client (ToolBroker) ───────────────────────────────────────────────────

class MCPClient extends EventEmitter {
  constructor(registry) {
    super();
    this._registry = registry;
    this._pendingCalls = new Map();
  }

  /**
   * Call an MCP tool
   */
  async callTool(toolName, args, options = {}) {
    const tool = this._registry.getTool(toolName);
    if (!tool) {
      throw new Error(`MCP tool not found: ${toolName}`);
    }

    const callId = crypto.randomUUID();
    const startTime = Date.now();

    this._pendingCalls.set(callId, { toolName, args, startTime });
    this.emit("call:start", { callId, toolName, args });

    try {
      // Validate input against schema
      const validation = this._validateInput(args, tool.inputSchema);
      if (!validation.valid) {
        throw new Error(`Invalid input: ${validation.errors.join(", ")}`);
      }

      // Execute tool
      const result = await this._executeTool(tool, args, options);

      const latencyMs = Date.now() - startTime;
      this._pendingCalls.delete(callId);

      const mcpResult = {
        id: callId,
        name: toolName,
        result,
        isError: false,
        latencyMs
      };

      // Log to audit trail
      await auditLogService.pushActivity({
        category: "MCP_CALL",
        text: `MCP tool called: ${toolName} (${latencyMs}ms)`,
        metadata: { callId, toolName, latencyMs, source: options.source || "internal" }
      });

      this.emit("call:complete", mcpResult);

      return mcpResult;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this._pendingCalls.delete(callId);

      const mcpResult = {
        id: callId,
        name: toolName,
        result: { error: error.message },
        isError: true,
        latencyMs
      };

      this.emit("call:error", mcpResult);

      return mcpResult;
    }
  }

  /**
   * Execute tool based on source
   */
  async _executeTool(tool, args, options) {
    // Built-in tools
    if (tool.source === "builtin") {
      return this._executeBuiltin(tool, args);
    }

    // External MCP server tools
    const server = this._registry._servers.get(tool.source);
    if (server) {
      return this._executeExternal(server, tool, args, options);
    }

    throw new Error(`Unknown tool source: ${tool.source}`);
  }

  /**
   * Execute built-in tool
   */
  async _executeBuiltin(tool, args) {
    // Route to appropriate service
    const glService = require("./gl-service");
    const locService = require("./loc-service");
    const consolidationService = require("./consolidation-service");
    const budgetService = require("./budget-service");

    switch (tool.name) {
      case "gl_get_trial_balance":
        return glService.getTrialBalance(args.entity, args.asOfDate);
      case "gl_get_account_balance":
        return glService.getAccountBalance(args.accountId, args.startDate, args.endDate);
      case "gl_create_journal_entry":
        return require("./journal-service").createJournalEntry(args);
      case "loc_audit":
        return locService.performAudit(args.locId, { auditType: args.auditType || "COVENANT_CHECK" });
      case "loc_calculate_interest":
        return locService.calculateInterest ? locService.calculateInterest(args) : { interest: 0 };
      case "consolidation_eliminate_ic":
        return consolidationService.eliminateIntercompanyTransactions(args.period);
      case "consolidated_balance_sheet":
        return consolidationService.getConsolidatedBalanceSheet(args.asOfDate);
      case "budget_variance":
        return budgetService.calculateVariance(args.budgetId, args.period, args);
      default:
        throw new Error(`Built-in tool not implemented: ${tool.name}`);
    }
  }

  /**
   * Execute external MCP server tool
   */
  async _executeExternal(server, tool, args, options) {
    // In production, this would make HTTP/stdio call to MCP server
    // For now, simulate
    return {
      source: server.id,
      tool: tool.name,
      simulated: true,
      args
    };
  }

  /**
   * Validate input against JSON Schema
   */
  _validateInput(args, schema) {
    if (!schema) return { valid: true, errors: [] };

    const errors = [];

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in args)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get pending calls
   */
  getPendingCalls() {
    return Array.from(this._pendingCalls.values());
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

const registry = new MCPServerRegistry();
const client = new MCPClient(registry);

// Register Prolog trust deed server
registry.registerServer("prolog-trust-deed", {
  name: "Prolog Trust Deed Server",
  transport: "stdio",
  capabilities: ["verification", "compliance"],
  tools: [
    {
      name: "prolog_verify_deed",
      description: "Verify a trust deed against Prolog rules",
      inputSchema: {
        type: "object",
        properties: {
          deedPath: { type: "string" },
          action: { type: "string" }
        },
        required: ["deedPath", "action"]
      },
      category: "TRUST"
    }
  ]
});

// Register WOZ Vault server
registry.registerServer("woz-vault", {
  name: "WOZ Vault Server",
  transport: "stdio",
  capabilities: ["sealing", "verification"],
  tools: [
    {
      name: "woz_vault_status",
      description: "Get WOZ Vault status and recent seals",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "integer", default: 10 }
        }
      },
      category: "VAULT"
    }
  ]
});

module.exports = {
  MCPServerRegistry,
  MCPClient,
  BUILTIN_TOOLS,
  registry,
  client
};
