/**
 * Multi-Model Router
 * ==================
 * Routes tasks to the right model based on complexity, accuracy, cost.
 * Matches MOAT-FEATURE-EXTRACTION §13: Multi-Model Orchestration
 *
 * Tier 1 (frontier): Claude Opus, GPT-4 — complex reasoning, security audits
 * Tier 2 (balanced): Nemotron-Mini-4B — standard decisions, council votes
 * Tier 3 (fast):     Granite SLMs — completions, classifications, simple lookups
 */

const auditLogService = require("./audit-log");

// ── Model Registry ─────────────────────────────────────────────────────────────

const MODELS = {
  // Tier 1 — Frontier
  "claude-opus": {
    id: "claude-opus",
    name: "Claude Opus",
    tier: 1,
    provider: "anthropic",
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    maxTokens: 200000,
    capabilities: ["reasoning", "security", "code", "analysis", "creative"],
    latencyMs: 3000,
    accuracy: 0.98
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    tier: 1,
    provider: "openai",
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    maxTokens: 128000,
    capabilities: ["reasoning", "code", "analysis", "vision"],
    latencyMs: 2000,
    accuracy: 0.95
  },

  // Tier 2 — Balanced
  "nemotron-mini-4b": {
    id: "nemotron-mini-4b",
    name: "Nemotron-Mini-4B-Instruct",
    tier: 2,
    provider: "nvidia",
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0003,
    maxTokens: 8192,
    capabilities: ["reasoning", "code", "classification", "decision"],
    latencyMs: 500,
    accuracy: 0.88,
    fineTunable: true
  },
  "claude-haiku": {
    id: "claude-haiku",
    name: "Claude 3.5 Haiku",
    tier: 2,
    provider: "anthropic",
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
    maxTokens: 200000,
    capabilities: ["reasoning", "code", "analysis"],
    latencyMs: 800,
    accuracy: 0.90
  },

  // Tier 3 — Fast
  "granite-slm": {
    id: "granite-slm",
    name: "IBM Granite SLM",
    tier: 3,
    provider: "ibm",
    costPer1kInput: 0.00005,
    costPer1kOutput: 0.0001,
    maxTokens: 4096,
    capabilities: ["classification", "completion", "lookup", "extraction"],
    latencyMs: 100,
    accuracy: 0.82
  },
  "nemotron-mini-qlora": {
    id: "nemotron-mini-qlora",
    name: "Nemotron-Mini-4B QLoRA",
    tier: 3,
    provider: "nvidia",
    costPer1kInput: 0.00005,
    costPer1kOutput: 0.0001,
    maxTokens: 8192,
    capabilities: ["classification", "completion", "decision"],
    latencyMs: 150,
    accuracy: 0.85,
    fineTuned: true
  }
};

// ── Task Classification ────────────────────────────────────────────────────────

const TASK_COMPLEXITY = {
  // Tier 1 — Frontier required
  SECURITY_AUDIT: { tier: 1, reason: "Security analysis requires highest accuracy" },
  ARCHITECTURE_DECISION: { tier: 1, reason: "Architecture decisions are irreversible" },
  COMPLEX_REASONING: { tier: 1, reason: "Multi-step reasoning needs frontier model" },
  CODE_REVIEW_CRITICAL: { tier: 1, reason: "Critical code review needs highest accuracy" },

  // Tier 2 — Balanced
  STANDARD_DECISION: { tier: 2, reason: "Standard council decisions use balanced model" },
  CODE_GENERATION: { tier: 2, reason: "Code generation needs good reasoning + speed" },
  ANALYSIS: { tier: 2, reason: "Analysis tasks need balanced accuracy" },
  COUNCIL_VOTE: { tier: 2, reason: "Council votes use balanced model for cost" },
  SUMMARY: { tier: 2, reason: "Summaries need good quality at reasonable cost" },

  // Tier 3 — Fast
  CLASSIFICATION: { tier: 3, reason: "Classification is simple pattern matching" },
  COMPLETION: { tier: 3, reason: "Completions need speed, not depth" },
  LOOKUP: { tier: 3, reason: "Lookups are factual retrieval" },
  EXTRACTION: { tier: 3, reason: "Data extraction is structured parsing" },
  ROUTING: { tier: 3, reason: "Routing decisions are simple" },
  VALIDATION: { tier: 3, reason: "Validation checks are boolean" }
};

// ── Router Engine ──────────────────────────────────────────────────────────────

class MultiModelRouter {
  constructor(options = {}) {
    this._fallbackChain = options.fallbackChain || [
      "nemotron-mini-4b",
      "claude-haiku",
      "nemotron-mini-qlora",
      "granite-slm"
    ];
    this._costBudget = options.costBudget || null; // Max cost per request
    this._stats = {
      routed: 0,
      fallbacks: 0,
      totalCost: 0
    };
  }

  /**
   * Route a task to the optimal model
   * @param {string} taskType - Task classification key
   * @param {object} context - Task context (tokens, urgency, etc.)
   * @returns {object} { model, reason, estimatedCost }
   */
  route(taskType, context = {}) {
    const complexity = TASK_COMPLEXITY[taskType];
    if (!complexity) {
      return this._routeByHeuristic(context);
    }

    const targetTier = complexity.tier;
    const requiredCapabilities = context.capabilities || [];

    // Find best model for tier + capabilities
    let bestModel = null;
    let bestScore = -1;

    for (const [id, model] of Object.entries(MODELS)) {
      if (model.tier !== targetTier) continue;

      // Check capabilities match
      if (requiredCapabilities.length > 0) {
        const hasAll = requiredCapabilities.every(cap => model.capabilities.includes(cap));
        if (!hasAll) continue;
      }

      // Score: accuracy * (1 / latency) * (1 / cost)
      const score = model.accuracy * (1000 / model.latencyMs) * (1 / (model.costPer1kInput + model.costPer1kOutput + 0.0001));
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    // Fallback if no model found at target tier
    if (!bestModel) {
      bestModel = this._findFallback(targetTier, requiredCapabilities);
      this._stats.fallbacks++;
    }

    const estimatedTokens = context.inputTokens || 1000;
    const estimatedCost = (estimatedTokens / 1000) * (bestModel.costPer1kInput + bestModel.costPer1kOutput);

    this._stats.routed++;
    this._stats.totalCost += estimatedCost;

    return {
      model: bestModel,
      reason: complexity.reason,
      estimatedCost: parseFloat(estimatedCost.toFixed(6)),
      tier: targetTier
    };
  }

  /**
   * Heuristic routing when task type is unknown
   */
  _routeByHeuristic(context) {
    const inputTokens = context.inputTokens || 1000;
    const urgency = context.urgency || "normal";

    if (urgency === "critical" || inputTokens > 50000) {
      return this.route("COMPLEX_REASONING", context);
    }

    if (inputTokens < 500) {
      return this.route("CLASSIFICATION", context);
    }

    return this.route("STANDARD_DECISION", context);
  }

  /**
   * Find fallback model from chain
   */
  _findFallback(preferredTier, capabilities) {
    for (const modelId of this._fallbackChain) {
      const model = MODELS[modelId];
      if (!model) continue;

      if (capabilities.length > 0) {
        const hasAll = capabilities.every(cap => model.capabilities.includes(cap));
        if (!hasAll) continue;
      }

      return model;
    }

    // Ultimate fallback
    return MODELS["granite-slm"];
  }

  /**
   * Get cost estimate for a task
   */
  estimateCost(taskType, inputTokens = 1000, outputTokens = 500) {
    const route = this.route(taskType, { inputTokens });
    const model = route.model;

    const inputCost = (inputTokens / 1000) * model.costPer1kInput;
    const outputCost = (outputTokens / 1000) * model.costPer1kOutput;

    return {
      model: model.id,
      tier: model.tier,
      inputCost: parseFloat(inputCost.toFixed(6)),
      outputCost: parseFloat(outputCost.toFixed(6)),
      totalCost: parseFloat((inputCost + outputCost).toFixed(6)),
      latencyMs: model.latencyMs
    };
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      ...this._stats,
      avgCostPerRequest: this._stats.routed > 0
        ? parseFloat((this._stats.totalCost / this._stats.routed).toFixed(6))
        : 0
    };
  }

  /**
   * List all available models
   */
  listModels() {
    return Object.values(MODELS);
  }

  /**
   * List models by tier
   */
  listByTier(tier) {
    return Object.values(MODELS).filter(m => m.tier === tier);
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

const router = new MultiModelRouter();

module.exports = {
  MultiModelRouter,
  MODELS,
  TASK_COMPLEXITY,
  router
};
