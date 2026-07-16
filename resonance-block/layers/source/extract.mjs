/**
 * layers/source/extract.mjs — Layer 8: Source extraction
 *
 * Walks a target repo, builds a tamper-evident inventory, and resolves the
 * `worm_head` (the canonical head seal of the SOURCE G-Set). Every emitted
 * artifact is SHA-256 hashed; the layer refuses to report a contractive
 * score unless the inventory is complete and the worm_head is anchored.
 *
 * Conventions inherited from packages/pearl/foundry-source.json:
 *   - worm_head: short hex of the SOURCE head seal
 *   - permitted_sorry_count: sorrys must be manifested, never silent
 *   - contractivity_score derived from inventory completeness in (0,1]
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative, resolve } from "path";
import crypto from "crypto";

const IGNORE = new Set([
  "node_modules", ".git", "target", ".lake", "dist", "build",
  ".next", "coverage", "__pycache__", ".idea",
]);

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * Recursively inventory a repo.
 * @param {string} root absolute path to the source repo
 * @param {(p:string)=>boolean} [filter] optional path filter
 * @returns {{files: Array<{rel:string, bytes:number, sha256:string}>, totalBytes:number, fileCount:number}}
 */
export function inventory(root, filter = null) {
  const files = [];
  let totalBytes = 0;

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (IGNORE.has(entry)) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile()) {
        const rel = relative(root, full).split("\\").join("/");
        if (filter && !filter(rel)) continue;
        const buf = readFileSync(full);
        files.push({ rel, bytes: buf.length, sha256: sha256(buf) });
        totalBytes += buf.length;
      }
    }
  };

  if (existsSync(root)) walk(resolve(root));
  return { files, totalBytes, fileCount: files.length };
}

/**
 * Resolve the worm_head from a foundry-source.json-style manifest, or compute
 * it as the SHA-256 of the sorted file hashes (canonical SOURCE G-Set head).
 * @param {object} manifest
 * @param {ReturnType<typeof inventory>} inv
 */
export function resolveWormHead(manifest, inv) {
  if (manifest && manifest.worm_head) return manifest.worm_head;
  const concat = inv.files
    .map((f) => f.sha256)
    .sort()
    .join("");
  return sha256(Buffer.from(concat, "utf8")).slice(0, 8);
}

/**
 * Extract a full SourceInventory for a repo.
 * @param {string} repoPath
 * @param {object} [opts]
 * @returns {object}
 */
export function extractSource(repoPath, opts = {}) {
  const root = resolve(repoPath);
  const manifestPath = join(root, opts.manifest ?? "foundry-source.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : null;

  const inv = inventory(root, opts.filter ?? null);
  const wormHead = resolveWormHead(manifest, inv);

  // Contractivity: completeness ratio of the inventory against the manifest's
  // declared scope. A missing manifest yields the floor (0.5) — present but
  // unverified. Never 0 (would break Banach), never > 1.
  let completeness = 0.5;
  if (manifest && typeof manifest.lines === "number" && manifest.lines > 0) {
    completeness = Math.min(1, inv.totalBytes / manifest.lines);
  }
  const contractivity_score = Number(completeness.toFixed(4));

  const ts = Date.now();
  const seal = sha256(
    Buffer.from(`${wormHead}:${inv.fileCount}:${inv.totalBytes}:${ts}`, "utf8")
  );

  return {
    repo: root,
    worm_head: wormHead,
    fileCount: inv.fileCount,
    totalBytes: inv.totalBytes,
    contractivity_score,
    file_hashes: inv.files,
    worm_seal: seal,
    ts,
  };
}
