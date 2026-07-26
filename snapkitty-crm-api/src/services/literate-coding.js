/**
 * Literate Coding Engine
 * =====================
 * Intent-in-source for FORGE — write what you want, get implementation.
 * Matches MOAT-FEATURE-EXTRACTION §15: Literate Coding
 *
 * Flow:
 * 1. Developer writes intent in source file (comment/block)
 * 2. Engine parses intent blocks
 * 3. FORGE generates implementation as diff
 * 4. Developer reviews and applies
 */

const crypto = require("node:crypto");
const auditLogService = require("./audit-log");
const { router: modelRouter } = require("./model-router");

// ── Intent Block Parser ────────────────────────────────────────────────────────

/**
 * Parse intent blocks from source code
 * Supports multiple formats:
 *   // @intent: Create a function that calculates tax
 *   /* @intent: ... *​/
 *   <!-- @intent: ... -->
 *   # @intent: ...
 */
function parseIntentBlocks(source, language) {
  const blocks = [];
  const lines = source.split("\n");

  let inBlock = false;
  let blockContent = [];
  let blockStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Detect intent block start
    const intentMatch = line.match(/(?:\/\/|\/\*|#|<!--)\s*@intent\s*[:=]\s*(.*)/i);
    if (intentMatch) {
      inBlock = true;
      blockStart = lineNum;
      blockContent = [intentMatch[1].trim()];
      continue;
    }

    // Detect intent block end
    if (inBlock) {
      const endMatch = line.match(/(?:\*\/|-->|@end)/i);
      if (endMatch) {
        blocks.push({
          id: crypto.randomUUID(),
          startLine: blockStart,
          endLine: lineNum,
          content: blockContent.join("\n").trim(),
          language,
          raw: lines.slice(blockStart - 1, lineNum).join("\n")
        });
        inBlock = false;
        blockContent = [];
      } else {
        // Check if line is still part of block (has comment prefix)
        const continuation = line.replace(/^(?:\s*(?:\/\/|\/\*|\*|#|<!--))\s?/, "").trim();
        if (continuation) {
          blockContent.push(continuation);
        }
      }
    }
  }

  return blocks;
}

// ── Intent Classifier ──────────────────────────────────────────────────────────

function classifyIntent(intent) {
  const lower = intent.toLowerCase();

  if (lower.includes("function") || lower.includes("method") || lower.includes("class")) {
    return "CODE_GENERATION";
  }
  if (lower.includes("test") || lower.includes("spec")) {
    return "TEST_GENERATION";
  }
  if (lower.includes("refactor") || lower.includes("clean") || lower.includes("simplify")) {
    return "REFACTORING";
  }
  if (lower.includes("fix") || lower.includes("bug") || lower.includes("error")) {
    return "BUG_FIX";
  }
  if (lower.includes("document") || lower.includes("comment") || lower.includes("explain")) {
    return "DOCUMENTATION";
  }
  if (lower.includes("migrate") || lower.includes("upgrade") || lower.includes("convert")) {
    return "MIGRATION";
  }
  if (lower.includes("optimize") || lower.includes("perf") || lower.includes("speed")) {
    return "OPTIMIZATION";
  }

  return "CODE_GENERATION";
}

// ── Diff Generator ─────────────────────────────────────────────────────────────

function generateDiff(original, generated, startLine, endLine) {
  const originalLines = original.split("\n");
  const generatedLines = generated.split("\n");

  const before = originalLines.slice(0, startLine - 1);
  const after = originalLines.slice(endLine);

  const diff = [
    ...before,
    "// ── BEGIN GENERATED CODE ──────────────────────────────",
    ...generatedLines,
    "// ── END GENERATED CODE ────────────────────────────────",
    ...after
  ];

  return diff.join("\n");
}

// ── Literate Coding Engine ─────────────────────────────────────────────────────

class LiterateCodingEngine {
  constructor() {
    this._pendingIntents = new Map();
    this._completedIntents = new Map();
    this._stats = {
      parsed: 0,
      generated: 0,
      applied: 0,
      rejected: 0
    };
  }

  /**
   * Parse source file and extract intent blocks
   */
  parseSource(source, filename) {
    const ext = filename.split(".").pop();
    const langMap = {
      js: "javascript", ts: "typescript", py: "python",
      java: "java", cs: "csharp", go: "go", rs: "rust",
      rb: "ruby", cpp: "cpp", c: "c"
    };
    const language = langMap[ext] || "unknown";

    const blocks = parseIntentBlocks(source, language);

    this._stats.parsed += blocks.length;

    return blocks.map(block => ({
      ...block,
      filename,
      type: classifyIntent(block.content),
      status: "parsed"
    }));
  }

  /**
   * Generate implementation for an intent block
   */
  async generateImplementation(intent, context = {}) {
    const startTime = Date.now();

    // Route to model based on task type
    const route = modelRouter.route(intent.type, {
      capabilities: ["code", "reasoning"],
      inputTokens: intent.content.length * 2
    });

    // Build prompt for code generation
    const prompt = this._buildGenerationPrompt(intent, context);

    // In production, this calls the model API
    // For now, simulate generation
    const generated = await this._simulateGeneration(intent, route.model);

    const latencyMs = Date.now() - startTime;

    const implementation = {
      id: crypto.randomUUID(),
      intentId: intent.id,
      filename: intent.filename,
      startLine: intent.startLine,
      endLine: intent.endLine,
      type: intent.type,
      originalIntent: intent.content,
      generatedCode: generated.code,
      explanation: generated.explanation,
      model: route.model.id,
      tier: route.tier,
      latencyMs,
      confidence: generated.confidence,
      status: "generated",
      createdAt: new Date().toISOString()
    };

    this._pendingIntents.set(implementation.id, implementation);
    this._stats.generated++;

    await auditLogService.pushActivity({
      category: "LITERATE_CODING",
      text: `Generated implementation for: ${intent.content.slice(0, 50)}... (${route.model.id}, ${latencyMs}ms)`,
      metadata: {
        intentId: intent.id,
        filename: intent.filename,
        model: route.model.id,
        latencyMs
      }
    });

    return implementation;
  }

  /**
   * Build generation prompt
   */
  _buildGenerationPrompt(intent, context) {
    const parts = [
      `You are FORGE, a code generation agent.`,
      ``,
      `Task: ${intent.type}`,
      `Intent: ${intent.content}`,
      ``,
    ];

    if (context.surroundingCode) {
      parts.push(`Surrounding code:\n\`\`\`\n${context.surroundingCode}\n\`\`\``);
    }

    if (context.filepath) {
      parts.push(`File: ${context.filepath}`);
    }

    if (context.conventions) {
      parts.push(`Conventions: ${context.conventions}`);
    }

    parts.push(``, `Generate the implementation as a code diff.`);

    return parts.join("\n");
  }

  /**
   * Simulate code generation
   */
  async _simulateGeneration(intent, model) {
    await new Promise(resolve => setTimeout(resolve, 100));

    const templates = {
      CODE_GENERATION: {
        code: `// Generated by FORGE via ${model.id}\n// Intent: ${intent.content}\n\nfunction generated() {\n  // TODO: Implement ${intent.content}\n  return null;\n}`,
        explanation: `Generated function based on intent: ${intent.content}`,
        confidence: 0.85
      },
      TEST_GENERATION: {
        code: `// Generated test by FORGE\n\ndescribe("Generated", () => {\n  it("should work", () => {\n    // TODO: Test ${intent.content}\n    expect(true).toBe(true);\n  });\n});`,
        explanation: `Generated test scaffold for: ${intent.content}`,
        confidence: 0.80
      },
      BUG_FIX: {
        code: `// Fix by FORGE\n// Original issue: ${intent.content}\n// Applied fix`,
        explanation: `Applied fix for: ${intent.content}`,
        confidence: 0.75
      }
    };

    return templates[intent.type] || templates.CODE_GENERATION;
  }

  /**
   * Apply generated implementation
   */
  applyImplementation(implementationId) {
    const impl = this._pendingIntents.get(implementationId);
    if (!impl) {
      throw new Error("Implementation not found");
    }

    impl.status = "applied";
    this._pendingIntents.delete(implementationId);
    this._completedIntents.set(implementationId, impl);
    this._stats.applied++;

    return {
      filename: impl.filename,
      diff: generateDiff("", impl.generatedCode, impl.startLine, impl.endLine),
      explanation: impl.explanation
    };
  }

  /**
   * Reject generated implementation
   */
  rejectImplementation(implementationId) {
    const impl = this._pendingIntents.get(implementationId);
    if (!impl) {
      throw new Error("Implementation not found");
    }

    impl.status = "rejected";
    this._pendingIntents.delete(implementationId);
    this._completedIntents.set(implementationId, impl);
    this._stats.rejected++;

    return { rejected: true, intentId: impl.intentId };
  }

  /**
   * Get pending implementations
   */
  getPending() {
    return Array.from(this._pendingIntents.values());
  }

  /**
   * Get stats
   */
  getStats() {
    return { ...this._stats };
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

const engine = new LiterateCodingEngine();

module.exports = {
  LiterateCodingEngine,
  parseIntentBlocks,
  classifyIntent,
  generateDiff,
  engine
};
