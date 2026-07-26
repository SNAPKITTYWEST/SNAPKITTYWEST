const express = require("express");
const tier3 = require("../controllers/tier3-controller");

const router = express.Router();

// ── Multi-Model Router ─────────────────────────────────────────────────────────

router.post("/router/route", tier3.routeTask);
router.post("/router/estimate", tier3.estimateCost);
router.get("/router/models", tier3.listModels);
router.get("/router/stats", tier3.getRouterStats);
router.get("/router/task-types", tier3.listTaskTypes);

// ── Parallel Subagent Dispatcher ───────────────────────────────────────────────

router.post("/dispatch", tier3.dispatchTask);
router.get("/dispatch/stats", tier3.getDispatchStats);
router.get("/dispatch/recent", tier3.getRecentDispatches);
router.get("/dispatch/subagent-types", tier3.getSubagentTypes);

// ── MCP Tool Integration ───────────────────────────────────────────────────────

router.post("/mcp/call", tier3.callMCPTool);
router.get("/mcp/tools", tier3.listMCPTools);
router.get("/mcp/servers", tier3.listMCPServers);
router.post("/mcp/servers", tier3.registerMCPServer);
router.delete("/mcp/servers/:serverId", tier3.unregisterMCPServer);

// ── Literate Coding ────────────────────────────────────────────────────────────

router.post("/literate/parse", tier3.parseSource);
router.post("/literate/generate", tier3.generateImplementation);
router.post("/literate/apply/:implementationId", tier3.applyImplementation);
router.post("/literate/reject/:implementationId", tier3.rejectImplementation);
router.get("/literate/pending", tier3.getPendingImplementations);
router.get("/literate/stats", tier3.getLiterateStats);

module.exports = router;
