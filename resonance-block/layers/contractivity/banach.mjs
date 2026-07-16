/**
 * layers/contractivity/banach.mjs — Layer 10: Contractivity
 *
 * The resonance block converges only if every governance map is a contraction.
 * A map T with Lipschitz constant k satisfies, for all x, y in the metric space:
 *
 *     d(T(x), T(y)) <= k * d(x, y)
 *
 * Banach Fixed-Point Theorem: if 0 < k < 1 on a complete metric space, T has a
 * unique fixed point T_inf, and iterates converge geometrically:
 *
 *     d(T^n(x0), T_inf) <= k^n / (1 - k) * d(T(x0), x0)
 *
 * SYNTH-003 / SYNTH-004 (packages/pearl/src/bob-gate.ts) require
 * contractivity_score in (0, 1]. This layer is the single source of truth for
 * that bound and for the convergence guarantee other layers consume.
 *
 * All thresholds are anchored to ExportThresholds.lean (SYNTH-010): we never
 * hardcode independently — callers pass them in.
 */

import crypto from "crypto";

export const CONTRACTIVITY_LOWER = 0.0; // exclusive floor
export const CONTRACTIVITY_UPPER = 1.0; // inclusive ceiling

/**
 * Classify a contraction constant.
 * @param {number} k
 * @returns {{status: 'contractive'|'non-contractive'|'expansive', note:string}}
 */
export function classify(k) {
  if (k <= CONTRACTIVITY_LOWER) {
    return { status: "non-contractive", note: "k <= 0 — T_inf undefined, no convergence" };
  }
  if (k > CONTRACTIVITY_UPPER) {
    return { status: "expansive", note: "k > 1 — Banach FP fails, divergence" };
  }
  if (k === 1) {
    return { status: "contractive", note: "k = 1 — non-expansive boundary (allowed, marginal)" };
  }
  return { status: "contractive", note: "0 < k < 1 — strict contraction, geometric convergence" };
}

/**
 * Verify a layer's reported contractivity_score sits in the Banach window.
 * @param {number} score
 * @returns {{ok:boolean, status:string, note:string}}
 */
export function verifyScore(score) {
  const c = classify(score);
  return { ok: c.status === "contractive", status: c.status, note: c.note };
}

/**
 * Bound on distance to fixed point after n iterations.
 * @param {number} k   contraction constant in (0,1)
 * @param {number} d0  d(T(x0), x0) initial gap
 * @param {number} n   iteration count
 * @returns {number}   d(T^n(x0), T_inf)
 */
export function fixedPointBound(k, d0, n) {
  if (k <= 0 || k >= 1) return Infinity;
  return (Math.pow(k, n) / (1 - k)) * d0;
}

/**
 * Iterations needed to bring the gap below tolerance eps.
 * @param {number} k
 * @param {number} d0
 * @param {number} eps
 * @returns {number} n (ceiling)
 */
export function iterationsToConverge(k, d0, eps) {
  if (k <= 0 || k >= 1) return Infinity;
  if (d0 <= eps) return 0;
  // k^n/(1-k)*d0 <= eps  =>  n >= log(eps*(1-k)/d0) / log(k)
  const n = Math.log((eps * (1 - k)) / d0) / Math.log(k);
  return Math.max(0, Math.ceil(n));
}

/**
 * Aggregate a set of layer contractivity scores into a single block-wide
 * contraction constant. We take the MAX (worst-case) so the block inherits the
 * loosest map — the safe bound.
 * @param {number[]} scores
 * @returns {{k:number, status:string, ok:boolean}}
 */
export function blockContractivity(scores) {
  if (!scores.length) return { k: 0, status: "non-contractive", ok: false };
  const k = Math.max(...scores);
  const c = classify(k);
  return { k: Number(k.toFixed(6)), status: c.status, ok: c.status === "contractive" };
}

/**
 * WORM-seal a contractivity verdict.
 */
export function sealContractivity(k, ok, ts = Date.now()) {
  return crypto.createHash("sha256")
    .update(`contractivity:${k}:${ok}:${ts}`)
    .digest("hex");
}
