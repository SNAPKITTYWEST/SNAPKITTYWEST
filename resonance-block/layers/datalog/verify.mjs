/**
 * layers/datalog/verify.mjs — Layer 9: Datalog verification gate
 *
 * Reuses the real inverted-turbo datalog engine (engine.mjs) whose
 * negation-as-failure regex was just fixed (`\\+` -> `\\\+`). The engine is a
 * self-contained CLI that exits non-zero on violation; we spawn it as a child
 * process so a detector failure in the engine can never crash the block.
 *
 * The layer reports a contractivity_score in (0,1]: 1.0 when PASS with zero
 * violations, degrading toward the floor as violations accumulate. A crashed
 * engine yields SILENCE (verdict fail) with contractivity_score = 0.5 (present
 * but unverified — Banach precondition still satisfied).
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// inverted-turbo is a sibling of resonance-block under SNAPKITTYWEST.
const INVERTED_TURBO = process.env.INVERTED_TURBO_DIR
  ?? resolve(__dirname, "../../../inverted-turbo");

function runEngine(args) {
  return new Promise((resolvePromise) => {
    const proc = spawn("node", [resolve(INVERTED_TURBO, "datalog/engine.mjs"), ...args], {
      encoding: "utf8",
    });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("close", (code) => resolvePromise({ code, out, err }));
  });
}

/**
 * Run a datalog gate against the inverted-turbo engine.
 * @param {object} opts
 * @param {string} [opts.facts]   path to a .dl facts file
 * @param {string} [opts.rules]   path to a .dl rules file or --dir
 * @param {string} [opts.dir]     directory of .dl rule files
 * @param {string} [opts.query]   query predicate, e.g. "type_error(Var, Msg)"
 * @returns {Promise<object>}
 */
export async function runDatalogGate(opts) {
  const args = [];
  if (opts.facts) args.push("--facts", opts.facts);
  if (opts.dir) args.push("--dir", opts.dir);
  if (opts.rules && !opts.dir) args.push("--rules", opts.rules);
  const query = opts.query ?? "type_error(Var, Msg)";
  args.push("--query", query);

  const ts = Date.now();
  const { code, out, err } = await runEngine(args);

  const verdict = code === 0 ? "PASS" : "FAIL";
  const violations = (out.match(/violation\(s\):/g) || [])
    .map(() => 1)
    .length
    ? Number((out.match(/— (\d+) violation/g) || [])[1] || 0)
    : 0;

  // Contractivity: 1.0 clean, floor 0.5 on crash, monotonic degrade per violation.
  let contractivity_score = 1.0;
  if (code !== 0 && violations === 0) contractivity_score = 0.5; // engine error
  else if (violations > 0) contractivity_score = Math.max(0.5, 1 - violations * 0.1);

  const seal = require_sha256(`${verdict}:${query}:${violations}:${ts}`);

  return {
    verdict,
    query,
    violations,
    contractivity_score: Number(contractivity_score.toFixed(4)),
    engine_output: out,
    engine_error: err,
    worm_seal: seal,
    ts,
  };
}

// Local sha256 to avoid another import line.
import crypto from "crypto";
function require_sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
