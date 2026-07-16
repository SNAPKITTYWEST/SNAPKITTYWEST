#!/usr/bin/env node
/**
 * SNAPKITTYWEST Datalog Verification Engine
 * Bottom-up Datalog evaluator for CI verification gates.
 *
 * Usage:
 *   node datalog/engine.mjs --facts facts.dl --rules rules.dl --query query.dl
 *   node datalog/engine.mjs --dir datalog/rules   (runs all .dl files in dir)
 *
 * Output: JSON verdict per query, exit 1 on violation.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { argv, exit } from "process";

// ─── Parse CLI args ──────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { facts: [], rules: [], queries: [], dir: null, strict: true, expect: false };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--facts":   args.facts.push(argv[++i]); break;
      case "--rules":   args.rules.push(argv[++i]); break;
      case "--query":   args.queries.push(argv[++i]); break;
      case "--dir":     args.dir = argv[++i]; break;
      case "--lenient": args.strict = false; break;
      case "--expect":  args.expect = true; break;
    }
  }
  return args;
}

// ─── Datalog AST ─────────────────────────────────────────────────────────────
// A term is either a constant string or a variable (starts with uppercase).
const isVar = (t) => /^[A-Z_]/.test(t);

// Parse a single Datalog file into { facts: [], rules: [] }
function parseDatalog(source) {
  const rawLines = source.split(/\r?\n/);
  const facts = [];
  const rules = [];

  // Join multi-line rules (lines not ending with '.' are continuations)
  const lines = [];
  let pending = "";
  for (const raw of rawLines) {
    let line = raw.replace(/%.*$/, "").trim();
    if (!line) continue;
    pending += " " + line;
    if (line.endsWith(".")) {
      lines.push(pending.trim());
      pending = "";
    }
  }
  if (pending.trim()) lines.push(pending.trim());

  for (let line of lines) {
    if (line.endsWith(".")) line = line.slice(0, -1).trim();
    if (!line) continue;

    // Fact: pred(args...)
    // Rule: head(args...) :- body1, body2, ...
    const ruleSplit = line.split(":-");
    if (ruleSplit.length === 1) {
      // Fact
    const m = line.match(/^(\w+)\(([^)]*)\)$/);
    if (m) {
      facts.push({
        pred: m[1],
        // Keep quotes on string constants — they discriminate constants
        // from uppercase variables (e.g. "No-Cloning Violation" must NOT
        // be read as a variable).
        args: m[2].split(",").map((s) => s.trim()),
      });
    }
    } else {
      // Rule
      const headStr = ruleSplit[0].trim();
      const bodyStr = ruleSplit.slice(1).join(":-").trim();
      const hm = headStr.match(/^(\w+)\(([^)]*)\)$/);
      if (!hm) continue;
      const head = {
        pred: hm[1],
        // Keep quotes on string constants so they are not mistaken for
        // uppercase variables.
        args: hm[2].split(",").map((s) => s.trim()),
      };

      // Split body on commas (but not inside parens)
      const bodyLits = splitBodyLits(bodyStr);
      const body = bodyLits.map((lit) => {
        // Handle negation: \+ pred(...)
        const neg = lit.startsWith("\\+") || lit.startsWith("not ");
        const clean = neg ? lit.replace(/^\\+\s*|not\s+/, "").trim() : lit;
        const bm = clean.match(/^(\w+)\(([^)]*)\)$/);
        if (!bm) return null;
        return {
          neg,
          pred: bm[1],
          // Keep quotes on string constants.
          args: bm[2].split(",").map((s) => s.trim()),
        };
      }).filter(Boolean);

      // Handle built-in comparisons in body: gt(N, 1), le(P, 1.0), etc.
      const BUILTINS = new Set(["gt", "lt", "ge", "le", "eq"]);
      const realBody = [];
      for (const b of body) {
        if (BUILTINS.has(b.pred)) {
          b.builtin = true;
        }
        realBody.push(b);
      }

      rules.push({ head, body: realBody });
    }
  }
  return { facts, rules };
}

function splitBodyLits(body) {
  const lits = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(") { depth++; current += ch; }
    else if (ch === ")") { depth--; current += ch; }
    else if (ch === "," && depth === 0) {
      lits.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) lits.push(current.trim());
  return lits;
}

// ─── Datalog Evaluator (Naive Bottom-Up) ─────────────────────────────────────
function evaluate(facts, rules, maxIter = 1000) {
  // factSet: Set of "pred(arg0,arg1,...)" strings for dedup
  const factSet = new Set();
  const factMap = new Map(); // pred -> [args[]]

  function addFact(pred, args) {
    const key = `${pred}(${args.join(",")})`;
    if (factSet.has(key)) return false;
    factSet.add(key);
    if (!factMap.has(pred)) factMap.set(pred, []);
    factMap.get(pred).push(args);
    return true;
  }

  // Load initial facts
  for (const f of facts) {
    addFact(f.pred, f.args);
  }

  // Fixed-point iteration
  for (let iter = 0; iter < maxIter; iter++) {
    let newFacts = 0;

    for (const rule of rules) {
      const bindings = [{ env: {} }];

      for (const lit of rule.body) {
        const nextBindings = [];

        for (const bind of bindings) {
          if (lit.builtin) {
            // Built-in comparison: resolve args and evaluate
            const resolved = resolveArgs(lit.args, bind.env);
            const bResult = resolved !== null && evalBuiltin(lit.pred, resolved);
            if (process.env.DEBUG_DATALOG) {
              console.log(`  [debug] builtin ${lit.pred}(${lit.args}) env=`, bind.env, "resolved=", resolved, "=>", bResult);
            }
            if (bResult) {
              nextBindings.push(bind);
            }
          } else if (lit.neg) {
            // Negation: keep binding if NO matching fact exists
            const resolved = resolveArgs(lit.args, bind.env);
            if (resolved === null) { nextBindings.push(bind); continue; }
            const key = `${lit.pred}(${resolved.join(",")})`;
            if (!factSet.has(key)) {
              nextBindings.push(bind);
            }
            // If fact exists, this branch dies
          } else {
            // Positive: join with existing facts
            const paramArgs = lit.args.map((a) => isVar(a) ? null : a);
            const candidates = factMap.get(lit.pred) || [];

            for (const cand of candidates) {
              const newEnv = { ...bind.env };
              let ok = true;
              for (let i = 0; i < lit.args.length; i++) {
                const a = lit.args[i];
                if (isVar(a)) {
                  if (a in newEnv) {
                    if (newEnv[a] !== cand[i]) { ok = false; break; }
                  } else {
                    newEnv[a] = cand[i];
                  }
                } else {
                  if (a !== cand[i]) { ok = false; break; }
                }
              }
              if (ok) nextBindings.push({ env: newEnv });
            }
          }
        }
        bindings.length = 0;
        bindings.push(...nextBindings);
      }

      // Generate new facts from surviving bindings
      for (const bind of bindings) {
        const headArgs = rule.head.args.map((a) =>
          isVar(a) ? (bind.env[a] ?? a) : a
        );
        // Skip if any head arg is still unbound
        if (headArgs.some((a) => isVar(a))) continue;
        if (addFact(rule.head.pred, headArgs)) newFacts++;
      }
    }

    if (newFacts === 0) break; // Fixed point reached
  }

  return factMap;
}

function resolveArgs(args, env) {
  const resolved = [];
  for (const a of args) {
    if (isVar(a)) {
      if (!(a in env)) return null;
      resolved.push(env[a]);
    } else {
      resolved.push(a);
    }
  }
  return resolved;
}

function toNum(v) {
  const n = Number(v);
  return isNaN(n) ? v : n;
}

function evalBuiltin(pred, args) {
  const [a, b] = args.map(toNum);
  switch (pred) {
    case "gt": return a > b;
    case "lt": return a < b;
    case "ge": return a >= b;
    case "le": return a <= b;
    case "eq": return a === b;
    default: return false;
  }
}

// ─── Query Engine ────────────────────────────────────────────────────────────
function runQuery(factMap, query) {
  // query is like "type_error(Var, Msg)" — we need to enumerate
  const m = query.match(/^(\w+)\(([^)]*)\)$/);
  if (!m) return [];
  const pred = m[1];
  const args = m[2].split(",").map((s) => s.trim());
  const candidates = factMap.get(pred) || [];

  const results = [];
  for (const cand of candidates) {
    const binding = {};
    let ok = true;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (isVar(a)) {
        if (a in binding) {
          if (binding[a] !== cand[i]) { ok = false; break; }
        } else {
          binding[a] = cand[i];
        }
      } else {
        if (a !== cand[i]) { ok = false; break; }
      }
    }
    if (ok) {
      // Strip one layer of surrounding quotes from constant display values.
      const clean = {};
      for (const k of Object.keys(binding)) {
        const v = binding[k];
        clean[k] = typeof v === "string" && v.length >= 2 && v.startsWith(`"`) && v.endsWith(`"`) ? v.slice(1, -1) : v;
      }
      results.push(clean);
    }
  }
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(argv);

  // If --dir, load all .dl files from directory
  if (args.dir) {
    const dir = resolve(args.dir);
    if (existsSync(dir)) {
      const files = readdirSync(dir).filter((f) => f.endsWith(".dl")).sort();
      for (const f of files) {
        const content = readFileSync(join(dir, f), "utf8");
        const parsed = parseDatalog(content);
        args.facts.push(...parsed.facts.map((p) => ({ ...p, _src: f })));
        args.rules.push(...parsed.rules.map((r) => ({ ...r, _src: f })));
      }
    }
  }

  // Also support inline --facts/--rules file args
  for (const f of args.facts) {
    if (typeof f === "string" && existsSync(f)) {
      const content = readFileSync(f, "utf8");
      const parsed = parseDatalog(content);
      args.facts.push(...parsed.facts);
      args.rules.push(...parsed.rules);
    }
  }
  for (const r of args.rules) {
    if (typeof r === "string" && existsSync(r)) {
      const content = readFileSync(r, "utf8");
      const parsed = parseDatalog(content);
      args.facts.push(...parsed.facts);
      args.rules.push(...parsed.rules);
    }
  }

  // Filter out the string file paths we already loaded
  const allFacts = args.facts.filter((f) => typeof f === "object");
  const allRules = args.rules.filter((r) => typeof r === "object");

  console.log(`[datalog] Loaded ${allFacts.length} facts, ${allRules.length} rules`);

  // Evaluate
  const factMap = evaluate(allFacts, allRules);
  const totalFacts = [...factMap.values()].reduce((s, v) => s + v.length, 0);
  console.log(`[datalog] Fixed point: ${totalFacts} derived facts`);

  // Run queries
  let violations = 0;
  for (const q of args.queries) {
    const results = runQuery(factMap, q);
    if (results.length === 0) {
      console.log(`[datalog] ✓ ${q} — no matches (PASS)`);
    } else {
      console.log(`[datalog] ✗ ${q} — ${results.length} violation(s):`);
      for (const r of results) {
        const filled = q.replace(/\([^\)]*\)/, "(" +
          args.queries.indexOf(q) >= 0
            ? Object.entries(r).map(([k, v]) => `${k}=${v}`).join(", ")
            : ""
          + ")");
        console.log(`         ${JSON.stringify(r)}`);
      }
      violations += results.length;
    }
  }

  if (args.expect) {
    // Detector self-test mode: we EXPECT at least one violation to prove
    // the engine is alive (not vacuously passing).
    if (violations > 0) {
      console.log(`\n[datalog] SELF-TEST: DETECTOR FIRED (${violations} expected violation(s)) — engine verified alive`);
      exit(0);
    } else {
      console.log(`\n[datalog] SELF-TEST: FAIL — expected a violation but found none (detector dead)`);
      exit(1);
    }
  }

  if (violations > 0 && args.strict) {
    console.log(`\n[datalog] VERDICT: FAIL (${violations} violation(s))`);
    exit(1);
  } else {
    console.log(`\n[datalog] VERDICT: PASS`);
    exit(0);
  }
}

main();
