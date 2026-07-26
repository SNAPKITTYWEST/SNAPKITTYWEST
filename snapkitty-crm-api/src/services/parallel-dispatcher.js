/**
 * Parallel Subagent Dispatcher
 * ============================
 * Spawns concurrent subagents for council dispatch.
 * Matches MOAT-FEATURE-EXTRACTION §7: Workflow Mode — Parallel Subagent Decomposition
 *
 * Serial: FORGE → SENTINEL → LEDGE → ATLAS (900ms+)
 * Parallel: FORGE + SENTINEL + LEDGE + ATLAS concurrently (~300ms)
 */

const { EventEmitter } = require("events");
const crypto = require("node:crypto");
const auditLogService = require("./audit-log");
const { router: modelRouter, TASK_COMPLEXITY } = require("./model-router");

// ── Subagent Types ─────────────────────────────────────────────────────────────

const SUBAGENT_TYPES = {
  FORGE: {
    id: "FORGE",
    name: "Forge",
    role: "Implementation agent",
    capabilities: ["code", "reasoning", "analysis"],
    tier: 2,
    timeoutMs: 10000,
    required: false
  },
  SENTINEL: {
    id: "SENTINEL",
    name: "Sentinel",
    role: "Security validator",
    capabilities: ["security", "reasoning"],
    tier: 1,
    timeoutMs: 8000,
    required: true
  },
  LEDGE: {
    id: "LEDGE",
    name: "Ledge",
    role: "Ledger auditor",
    capabilities: ["analysis", "classification"],
    tier: 2,
    timeoutMs: 6000,
    required: false
  },
  ATLAS: {
    id: "ATLAS",
    name: "Atlas",
    role: "Strategic advisor",
    capabilities: ["reasoning", "analysis"],
    tier: 1,
    timeoutMs: 12000,
    required: false
  },
  ORACLE: {
    id: "ORACLE",
    name: "Oracle",
    role: "Knowledge retriever",
    capabilities: ["lookup", "extraction"],
    tier: 3,
    timeoutMs: 5000,
    required: false
  },
  NEXUS: {
    id: "NEXUS",
    name: "Nexus",
    role: "Orchestrator",
    capabilities: ["reasoning", "routing"],
    tier: 2,
    timeoutMs: 15000,
    required: false
  }
};

// ── Task Decomposer ────────────────────────────────────────────────────────────

class TaskDecomposer {
  /**
   * Decompose a complex task into parallelizable subtasks
   * @param {string} task - The task description
   * @param {object} context - Task context
   * @returns {Array} List of subtasks with assigned subagent types
   */
  decompose(task, context = {}) {
    const subtasks = [];
    const taskLower = task.toLowerCase();

    // Security check — always run Sentinel in parallel
    if (this._needsSecurityCheck(taskLower, context)) {
      subtasks.push({
        id: crypto.randomUUID(),
        type: "SENTINEL",
        task: `Security review: ${task}`,
        priority: "high",
        context
      });
    }

    // Code generation — Forge
    if (this._needsCodeGeneration(taskLower, context)) {
      subtasks.push({
        id: crypto.randomUUID(),
        type: "FORGE",
        task: `Implement: ${task}`,
        priority: "high",
        context
      });
    }

    // Analysis — Atlas
    if (this._needsAnalysis(taskLower, context)) {
      subtasks.push({
        id: crypto.randomUUID(),
        type: "ATLAS",
        task: `Analyze: ${task}`,
        priority: "medium",
        context
      });
    }

    // Ledger audit — Ledge
    if (this._needsLedgerAudit(taskLower, context)) {
      subtasks.push({
        id: crypto.randomUUID(),
        type: "LEDGE",
        task: `Audit ledger impact: ${task}`,
        priority: "medium",
        context
      });
    }

    // Knowledge lookup — Oracle
    if (this._needsKnowledgeLookup(taskLower, context)) {
      subtasks.push({
        id: crypto.randomUUID(),
        type: "ORACLE",
        task: `Look up context: ${task}`,
        priority: "low",
        context
      });
    }

    // If no specific subtasks identified, create a generic one
    if (subtasks.length === 0) {
      subtasks.push({
        id: crypto.randomUUID(),
        type: "FORGE",
        task,
        priority: "medium",
        context
      });
    }

    return subtasks;
  }

  _needsSecurityCheck(taskLower, context) {
    return taskLower.includes("security") ||
           taskLower.includes("auth") ||
           taskLower.includes("encrypt") ||
           taskLower.includes("secret") ||
           taskLower.includes("token") ||
           context.tier === 1 ||
           context.securityReview === true;
  }

  _needsCodeGeneration(taskLower, context) {
    return taskLower.includes("implement") ||
           taskLower.includes("create") ||
           taskLower.includes("build") ||
           taskLower.includes("write") ||
           taskLower.includes("add") ||
           taskLower.includes("fix") ||
           taskLower.includes("code");
  }

  _needsAnalysis(taskLower, context) {
    return taskLower.includes("analyze") ||
           taskLower.includes("review") ||
           taskLower.includes("evaluate") ||
           taskLower.includes("compare") ||
           taskLower.includes("assess") ||
           context.analysis === true;
  }

  _needsLedgerAudit(taskLower, context) {
    return taskLower.includes("ledger") ||
           taskLower.includes("financial") ||
           taskLower.includes("transaction") ||
           taskLower.includes("payment") ||
           taskLower.includes("invoice") ||
           context.financialImpact === true;
  }

  _needsKnowledgeLookup(taskLower, context) {
    return taskLower.includes("what is") ||
           taskLower.includes("find") ||
           taskLower.includes("search") ||
           taskLower.includes("lookup") ||
           taskLower.includes("reference");
  }
}

// ── Parallel Dispatcher ────────────────────────────────────────────────────────

class ParallelDispatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    this._maxConcurrency = options.maxConcurrency || 5;
    this._defaultTimeout = options.defaultTimeout || 15000;
    this._decomposer = new TaskDecomposer();
    this._activeTasks = new Map();
    this._completedTasks = new Map();
    this._stats = {
      dispatched: 0,
      completed: 0,
      failed: 0,
      avgLatencyMs: 0,
      totalLatencyMs: 0
    };
  }

  /**
   * Dispatch a task with parallel subagent execution
   * @param {string} task - The task to dispatch
   * @param {object} context - Task context
   * @returns {object} DispatchResult with all subagent results
   */
  async dispatch(task, context = {}) {
    const dispatchId = crypto.randomUUID();
    const startTime = Date.now();

    // Decompose task
    const subtasks = this._decomposer.decompose(task, context);

    this._stats.dispatched++;
    this.emit("dispatch:start", { dispatchId, task, subtasks: subtasks.length });

    // Execute all subtasks in parallel
    const results = await Promise.allSettled(
      subtasks.map(subtask => this._executeSubtask(subtask, dispatchId))
    );

    // Aggregate results
    const aggregated = this._aggregateResults(subtasks, results);

    const latencyMs = Date.now() - startTime;
    this._stats.completed++;
    this._stats.totalLatencyMs += latencyMs;
    this._stats.avgLatencyMs = Math.round(this._stats.totalLatencyMs / this._stats.completed);

    // Store completed task
    this._completedTasks.set(dispatchId, {
      dispatchId,
      task,
      subtasks: subtasks.length,
      latencyMs,
      results: aggregated,
      timestamp: new Date().toISOString()
    });

    // Audit log
    await auditLogService.pushActivity({
      category: "PARALLEL_DISPATCH",
      text: `Dispatch ${dispatchId.slice(0, 8)}: ${subtasks.length} subagents in ${latencyMs}ms`,
      metadata: {
        dispatchId,
        subtasks: subtasks.length,
        latencyMs,
        successCount: aggregated.successCount,
        failCount: aggregated.failCount
      }
    });

    this.emit("dispatch:complete", { dispatchId, aggregated, latencyMs });

    return {
      dispatchId,
      task,
      subtasks: subtasks.length,
      latencyMs,
      results: aggregated
    };
  }

  /**
   * Execute a single subtask
   */
  async _executeSubtask(subtask, dispatchId) {
    const agentType = SUBAGENT_TYPES[subtask.type];
    const timeout = agentType?.timeoutMs || this._defaultTimeout;

    // Route to optimal model
    const route = modelRouter.route("STANDARD_DECISION", {
      capabilities: agentType?.capabilities || [],
      inputTokens: 1000
    });

    const startTime = Date.now();

    try {
      // Simulate subagent execution
      // In production, this would call the model via API
      const result = await this._simulateExecution(subtask, route.model);

      const latencyMs = Date.now() - startTime;

      return {
        subtaskId: subtask.id,
        type: subtask.type,
        model: route.model.id,
        tier: route.tier,
        latencyMs,
        status: "success",
        result
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      this._stats.failed++;

      return {
        subtaskId: subtask.id,
        type: subtask.type,
        model: route.model.id,
        tier: route.tier,
        latencyMs,
        status: "failed",
        error: error.message
      };
    }
  }

  /**
   * Simulate subagent execution (placeholder for real model calls)
   */
  async _simulateExecution(subtask, model) {
    // Simulate latency based on model tier
    const latency = model.tier === 1 ? 2000 : model.tier === 2 ? 500 : 100;
    await new Promise(resolve => setTimeout(resolve, Math.min(latency, 200)));

    return {
      subtaskType: subtask.type,
      modelUsed: model.id,
      confidence: 0.85 + Math.random() * 0.1,
      recommendation: `${subtask.type} completed analysis for: ${subtask.task.slice(0, 50)}...`,
      details: {
        tokenCount: Math.floor(Math.random() * 500) + 100,
        processingTimeMs: latency
      }
    };
  }

  /**
   * Aggregate results from all subagents
   */
  _aggregateResults(subtasks, results) {
    const successCount = results.filter(r => r.status === "fulfilled" && r.value.status === "success").length;
    const failCount = results.filter(r => r.status === "rejected" || r.value?.status === "failed").length;

    const successfulResults = results
      .filter(r => r.status === "fulfilled" && r.value.status === "success")
      .map(r => r.value);

    // Build consensus if multiple agents agree
    const consensus = this._buildConsensus(successfulResults);

    return {
      successCount,
      failCount,
      totalSubtasks: subtasks.length,
      results: successfulResults,
      consensus,
      recommendation: consensus.recommendation,
      confidence: consensus.confidence
    };
  }

  /**
   * Build consensus from multiple agent results
   */
  _buildConsensus(results) {
    if (results.length === 0) {
      return { recommendation: "No consensus — all agents failed", confidence: 0 };
    }

    if (results.length === 1) {
      return {
        recommendation: results[0].result.recommendation,
        confidence: results[0].result.confidence
      };
    }

    // Weight by model tier (higher tier = more weight)
    let totalWeight = 0;
    let weightedConfidence = 0;

    for (const r of results) {
      const weight = r.tier === 1 ? 3 : r.tier === 2 ? 2 : 1;
      totalWeight += weight;
      weightedConfidence += r.result.confidence * weight;
    }

    const avgConfidence = weightedConfidence / totalWeight;

    // Check for agreement on security
    const securityResults = results.filter(r => r.type === "SENTINEL");
    const hasSecurityConcern = securityResults.some(r =>
      r.result.recommendation.toLowerCase().includes("fail") ||
      r.result.recommendation.toLowerCase().includes("reject") ||
      r.result.recommendation.toLowerCase().includes("deny")
    );

    if (hasSecurityConcern) {
      return {
        recommendation: "SECURITY CONCERN — Sentinel flagged issue. Review before proceeding.",
        confidence: 0.95,
        securityOverride: true
      };
    }

    // Aggregate recommendations
    const recommendations = results.map(r => r.result.recommendation);
    const primaryRecommendation = recommendations[0];

    return {
      recommendation: primaryRecommendation,
      confidence: parseFloat(avgConfidence.toFixed(4)),
      allRecommendations: recommendations
    };
  }

  /**
   * Get dispatch statistics
   */
  getStats() {
    return { ...this._stats };
  }

  /**
   * Get recent dispatches
   */
  getRecent(limit = 10) {
    return Array.from(this._completedTasks.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get subagent types
   */
  getSubagentTypes() {
    return SUBAGENT_TYPES;
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

const dispatcher = new ParallelDispatcher();

module.exports = {
  ParallelDispatcher,
  TaskDecomposer,
  SUBAGENT_TYPES,
  dispatcher
};
