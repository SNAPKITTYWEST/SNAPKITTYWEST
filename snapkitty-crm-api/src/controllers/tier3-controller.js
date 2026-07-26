const { router: modelRouter, MODELS, TASK_COMPLEXITY } = require("../services/model-router");
const { dispatcher, SUBAGENT_TYPES } = require("../services/parallel-dispatcher");
const { registry, client } = require("../services/mcp-integration");
const { engine: literateEngine } = require("../services/literate-coding");

// ── Multi-Model Router ─────────────────────────────────────────────────────────

async function routeTask(req, res, next) {
  try {
    const { taskType, context } = req.body;
    const route = modelRouter.route(taskType, context || {});
    res.json(route);
  } catch (error) {
    next(error);
  }
}

async function estimateCost(req, res, next) {
  try {
    const { taskType, inputTokens, outputTokens } = req.body;
    const estimate = modelRouter.estimateCost(taskType, inputTokens || 1000, outputTokens || 500);
    res.json(estimate);
  } catch (error) {
    next(error);
  }
}

async function listModels(req, res, next) {
  try {
    const { tier } = req.query;
    const models = tier ? modelRouter.listByTier(parseInt(tier)) : modelRouter.listModels();
    res.json({ models });
  } catch (error) {
    next(error);
  }
}

async function getRouterStats(req, res, next) {
  try {
    const stats = modelRouter.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

async function listTaskTypes(req, res, next) {
  try {
    res.json({ taskTypes: TASK_COMPLEXITY });
  } catch (error) {
    next(error);
  }
}

// ── Parallel Subagent Dispatcher ───────────────────────────────────────────────

async function dispatchTask(req, res, next) {
  try {
    const { task, context } = req.body;
    const result = await dispatcher.dispatch(task, context || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getDispatchStats(req, res, next) {
  try {
    const stats = dispatcher.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

async function getRecentDispatches(req, res, next) {
  try {
    const { limit } = req.query;
    const recent = dispatcher.getRecent(limit ? parseInt(limit) : 10);
    res.json({ dispatches: recent });
  } catch (error) {
    next(error);
  }
}

async function getSubagentTypes(req, res, next) {
  try {
    res.json({ subagentTypes: SUBAGENT_TYPES });
  } catch (error) {
    next(error);
  }
}

// ── MCP Tool Integration ───────────────────────────────────────────────────────

async function callMCPTool(req, res, next) {
  try {
    const { toolName, args, options } = req.body;
    const result = await client.callTool(toolName, args, options || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function listMCPTools(req, res, next) {
  try {
    const { category } = req.query;
    const tools = registry.listTools(category);
    res.json({ tools });
  } catch (error) {
    next(error);
  }
}

async function listMCPServers(req, res, next) {
  try {
    const servers = registry.listServers();
    res.json({ servers });
  } catch (error) {
    next(error);
  }
}

async function registerMCPServer(req, res, next) {
  try {
    const { serverId, config } = req.body;
    const server = registry.registerServer(serverId, config);
    res.status(201).json(server);
  } catch (error) {
    next(error);
  }
}

async function unregisterMCPServer(req, res, next) {
  try {
    const { serverId } = req.params;
    const result = registry.unregisterServer(serverId);
    res.json({ success: result });
  } catch (error) {
    next(error);
  }
}

// ── Literate Coding ────────────────────────────────────────────────────────────

async function parseSource(req, res, next) {
  try {
    const { source, filename } = req.body;
    const blocks = literateEngine.parseSource(source, filename);
    res.json({ blocks });
  } catch (error) {
    next(error);
  }
}

async function generateImplementation(req, res, next) {
  try {
    const { intent, context } = req.body;
    const implementation = await literateEngine.generateImplementation(intent, context || {});
    res.json(implementation);
  } catch (error) {
    next(error);
  }
}

async function applyImplementation(req, res, next) {
  try {
    const { implementationId } = req.params;
    const result = literateEngine.applyImplementation(implementationId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function rejectImplementation(req, res, next) {
  try {
    const { implementationId } = req.params;
    const result = literateEngine.rejectImplementation(implementationId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getPendingImplementations(req, res, next) {
  try {
    const pending = literateEngine.getPending();
    res.json({ pending });
  } catch (error) {
    next(error);
  }
}

async function getLiterateStats(req, res, next) {
  try {
    const stats = literateEngine.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  routeTask,
  estimateCost,
  listModels,
  getRouterStats,
  listTaskTypes,
  dispatchTask,
  getDispatchStats,
  getRecentDispatches,
  getSubagentTypes,
  callMCPTool,
  listMCPTools,
  listMCPServers,
  registerMCPServer,
  unregisterMCPServer,
  parseSource,
  generateImplementation,
  applyImplementation,
  rejectImplementation,
  getPendingImplementations,
  getLiterateStats
};
