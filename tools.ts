/**
 * SOVEREIGN TOOLS — tools.ts
 * Mistral's legs. Real execution, not text description.
 * Claude reasons. Mistral executes. These are Mistral's hands.
 *
 * Author: Ahmad Ali Parr + Claude Sonnet 4.6
 */

import { execSync, exec } from "child_process";
import { promises as fs } from "fs";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// ── TOOL DEFINITIONS (OpenAI function-calling schema) ─────────────────────────

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "shell_exec",
      description: "Execute a shell command. Use for git, npm, node, rexx, cargo, etc.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to run" },
          cwd:     { type: "string", description: "Working directory (optional, defaults to SNAPKITTYWEST root)" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "file_write",
      description: "Write content to a file. Creates parent directories if needed.",
      parameters: {
        type: "object",
        properties: {
          path:    { type: "string", description: "Absolute or relative file path" },
          content: { type: "string", description: "File content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "file_read",
      description: "Read a file's contents before editing it.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to read" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "git_push",
      description: "Stage all changes, commit with a message, and push to origin.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Commit message" },
          cwd:     { type: "string", description: "Repo directory (optional)" },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "kernel_invoke",
      description: "Invoke a sovereign kernel via sovereign-glue.rexx. Handles law, trust, math, ACH, FCRA, IRS domains.",
      parameters: {
        type: "object",
        properties: {
          input: { type: "string", description: "Natural language input — the glue detects domain and routes automatically" },
        },
        required: ["input"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ddg_search",
      description: "DuckDuckGo search. Fast fact lookup, current events, general web. DFA-scanned before returning.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "define",
      description: "Merriam-Webster Collegiate Dictionary. Get precise definitions for legal, financial, or technical terms.",
      parameters: {
        type: "object",
        properties: {
          word: { type: "string", description: "Word to define" },
        },
        required: ["word"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "thesaurus",
      description: "Merriam-Webster Thesaurus. Find synonyms — useful for legal language pattern matching.",
      parameters: {
        type: "object",
        properties: {
          word: { type: "string", description: "Word to find synonyms for" },
        },
        required: ["word"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "wiki",
      description: "Wikipedia search + summary. Best for factual background on laws, institutions, technical concepts.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_verify",
      description: "Search the web via Tavily, DFA-scan results for verified facts, block injection attempts. Returns only pattern-matched tokens — statutes, amounts, dates, case cites. The LLM never sees raw web text.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_kernels",
      description: "List all available kernels from the registry with their domains and invoke commands.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ── TOOL IMPLEMENTATIONS ──────────────────────────────────────────────────────

const ROOT = process.cwd();

export async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  switch (name) {

    case "shell_exec": {
      const cwd = args.cwd ?? ROOT;
      console.log(`\n[TOOL shell_exec] $ ${args.command}`);
      try {
        const { stdout, stderr } = await execAsync(args.command, { cwd, timeout: 60000 });
        const out = (stdout + stderr).trim();
        console.log(out ? out : "(no output)");
        return out || "OK";
      } catch (e: any) {
        const msg = `ERROR: ${e.message}\n${e.stderr ?? ""}`.trim();
        console.error(msg);
        return msg;
      }
    }

    case "file_write": {
      const filePath = path.resolve(ROOT, args.path);
      console.log(`\n[TOOL file_write] → ${filePath}`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, args.content, "utf8");
      return `Written: ${filePath}`;
    }

    case "file_read": {
      const filePath = path.resolve(ROOT, args.path);
      console.log(`\n[TOOL file_read] ← ${filePath}`);
      const content = await fs.readFile(filePath, "utf8");
      return content;
    }

    case "git_push": {
      const cwd = args.cwd ?? ROOT;
      console.log(`\n[TOOL git_push] "${args.message}" in ${cwd}`);
      try {
        execSync("git add -A", { cwd, stdio: "pipe" });
        execSync(`git commit -m "${args.message.replace(/"/g, "'")}"`, { cwd, stdio: "pipe" });
        const { stdout } = await execAsync("git push", { cwd });
        console.log(stdout.trim());
        return `Pushed: ${args.message}`;
      } catch (e: any) {
        return `git_push error: ${e.message}`;
      }
    }

    case "kernel_invoke": {
      console.log(`\n[TOOL kernel_invoke] input: ${args.input}`);
      try {
        const glue = path.join(ROOT, "sovereign-glue.rexx");
        const { stdout, stderr } = await execAsync(
          `rexx "${glue}" "${args.input.replace(/"/g, "'")}"`,
          { cwd: ROOT, timeout: 30000 }
        );
        return (stdout + stderr).trim();
      } catch (e: any) {
        return `kernel_invoke error: ${e.message}`;
      }
    }

    case "list_kernels": {
      const regPath = path.join(ROOT, "kernel-registry.json");
      const reg = JSON.parse(await fs.readFile(regPath, "utf8"));
      const summary = reg.kernels.map((k: any) =>
        `${k.id} [${k.lang}] — ${k.domain.join(", ")}\n  invoke: ${k.invoke}`
      ).join("\n\n");
      return summary;
    }

    case "ddg_search": {
      const apiKey = process.env.DDG_API_KEY;
      if (!apiKey) return "DDG_API_KEY not set";
      console.log(`\n[TOOL ddg_search] query: ${args.query}`);
      const resp = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1&skip_disambig=1`,
        { headers: { "X-Api-Key": apiKey } }
      );
      const data = await resp.json() as any;
      // DFA scan before returning
      const raw = [data.AbstractText, ...(data.RelatedTopics ?? []).map((t: any) => t.Text ?? "")]
        .filter(Boolean).join("\n");
      const { scanForLeaks } = await import("./vault.js");
      const { redacted } = scanForLeaks(raw);
      return redacted || data.AbstractText || "No results";
    }

    case "define": {
      const key = process.env.MW_DICT_KEY;
      if (!key) return "MW_DICT_KEY not set";
      console.log(`\n[TOOL define] word: ${args.word}`);
      const resp = await fetch(
        `https://dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(args.word)}?key=${key}`
      );
      const data = await resp.json() as any[];
      if (!Array.isArray(data) || typeof data[0] === "string")
        return `No definition found. Suggestions: ${data.slice(0, 5).join(", ")}`;
      const entry = data[0];
      const defs = entry.shortdef?.slice(0, 3).join(" | ") ?? "no definition";
      return `${entry.hwi?.hw ?? args.word} [${entry.fl ?? ""}]: ${defs}`;
    }

    case "thesaurus": {
      const key = process.env.MW_THESAURUS_KEY;
      if (!key) return "MW_THESAURUS_KEY not set";
      console.log(`\n[TOOL thesaurus] word: ${args.word}`);
      const resp = await fetch(
        `https://dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(args.word)}?key=${key}`
      );
      const data = await resp.json() as any[];
      if (!Array.isArray(data) || typeof data[0] === "string")
        return `No thesaurus entry. Suggestions: ${data.slice(0, 5).join(", ")}`;
      const syns = data[0]?.meta?.syms?.flat().slice(0, 10).join(", ") ?? "none";
      return `Synonyms for "${args.word}": ${syns}`;
    }

    case "wiki": {
      console.log(`\n[TOOL wiki] query: ${args.query}`);
      const resp = await fetch(
        `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(args.query)}&limit=3`
      );
      const data = await resp.json() as any;
      const pages = data.pages ?? [];
      if (!pages.length) return "No Wikipedia results";
      // Fetch summary of top result
      const top = pages[0];
      const sumResp = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(top.title)}`
      );
      const sum = await sumResp.json() as any;
      const { scanForLeaks } = await import("./vault.js");
      const { redacted } = scanForLeaks(sum.extract ?? "");
      return `**${top.title}** — ${redacted}\nSource: ${sum.content_urls?.desktop?.page ?? ""}`;
    }

    case "web_verify": {
      const { webVerify } = await import("./web-verify.mjs");
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) return "TAVILY_API_KEY not set in .env";
      console.log(`\n[TOOL web_verify] query: ${args.query}`);
      const bundle = await webVerify(args.query, apiKey);
      return bundle.summary;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
