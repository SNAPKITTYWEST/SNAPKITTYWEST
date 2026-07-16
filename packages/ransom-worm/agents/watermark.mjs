#!/usr/bin/env node
/**
 * WATERMARK — Shadow Orchestrator Agent 2
 * Injects immutable cryptographic provenance into sovereign source code and artifacts.
 * If the watermarked code runs outside the validated environment, it leaves an
 * unalterable cryptographic receipt signed to the sovereign OS identity.
 *
 * Run: node agents/watermark.mjs --target <file_or_dir> [--entity <id>]
 */
import { createHash, sign as cryptoSign, generateKeyPairSync } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sealEvent } from './worm-chain.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const MANIFEST_PATH = join(__dir, '..', 'WATERMARK.MANIFEST.json')
const KEY_PATH = join(__dir, '..', '.watermark-key.json')

const ENTITY = 'SNAPKITTY-SOVEREIGN-OS:AHMAD-ALI-PARR:2026'

// Language-specific watermark comment patterns
const COMMENT = {
  '.rs':   (w) => `// ${w}`,
  '.ts':   (w) => `// ${w}`,
  '.tsx':  (w) => `// ${w}`,
  '.mjs':  (w) => `// ${w}`,
  '.js':   (w) => `// ${w}`,
  '.hs':   (w) => `-- ${w}`,
  '.lean': (w) => `-- ${w}`,
  '.pl':   (w) => `% ${w}`,
  '.py':   (w) => `# ${w}`,
  '.ex':   (w) => `# ${w}`,
  '.exs':  (w) => `# ${w}`,
  '.apl':  (w) => `⍝ ${w}`,
}

function getOrCreateKey() {
  if (existsSync(KEY_PATH)) {
    const k = JSON.parse(readFileSync(KEY_PATH, 'utf8'))
    return k
  }
  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  const key = { privateKey, publicKey, created: new Date().toISOString() }
  writeFileSync(KEY_PATH, JSON.stringify(key, null, 2))
  console.log('[WATERMARK] Generated new Ed25519 sovereign key')
  return key
}

function contentHash(content) {
  return createHash('sha256').update(content).digest('hex')
}

function sign(privateKeyPem, data) {
  return cryptoSign(null, Buffer.from(data), privateKeyPem).toString('hex')
}

function buildWatermarkBlock(filePath, contentSha, sig, ts) {
  return [
    `SOVEREIGN_FINGERPRINT_BEGIN`,
    `  ENTITY   : ${ENTITY}`,
    `  FILE     : ${basename(filePath)}`,
    `  SHA256   : ${contentSha}`,
    `  SIGNED   : ${sig.slice(0, 32)}...`,
    `  TIMESTAMP: ${ts}`,
    `  NOTICE   : Local WORM provenance marker. No network receipt is emitted.`,
    `SOVEREIGN_FINGERPRINT_END`,
  ]
}

// Self-reporting runtime check injected into JS/TS files
function runtimeCheckJS(entity, fileSha) {
  return `
// ─── SOVEREIGN RUNTIME GUARD ────────────────────────────────────────────────
;(function sovereignGuard() {
  const ENTITY = ${JSON.stringify(entity)};
  const FILE_SHA = ${JSON.stringify(fileSha)};
  if (typeof window !== 'undefined') {
    const host = window?.location?.hostname ?? '';
    if (host && !['localhost', '127.0.0.1', 'snapkittywest.github.io'].some(o => host === o || host.endsWith('.' + o))) {
      console.warn('[SOVEREIGN] Provenance notice', { entity: ENTITY, file: FILE_SHA, host });
    }
  }
})();
// ─────────────────────────────────────────────────────────────────────────────`
}

function runtimeCheckRust(entity, fileSha) {
  return `
// ─── SOVEREIGN RUNTIME GUARD ────────────────────────────────────────────────
// ENTITY: ${entity}
// SHA256: ${fileSha}
// Local provenance marker only. No network call is performed.
// ─────────────────────────────────────────────────────────────────────────────`
}

async function watermarkFile(filePath, key) {
  const ext = extname(filePath).toLowerCase()
  const commenter = COMMENT[ext]
  if (!commenter) {
    console.log('[WATERMARK] Skip (unsupported ext):', filePath)
    return null
  }

  let content = readFileSync(filePath, 'utf8')

  // Skip if already watermarked
  if (content.includes('SOVEREIGN_FINGERPRINT_BEGIN')) {
    console.log('[WATERMARK] Already marked:', filePath)
    return null
  }

  const ts = new Date().toISOString()
  const contentSha = contentHash(content)
  const sigData = `${ENTITY}:${filePath}:${contentSha}:${ts}`
  const sig = sign(key.privateKey, sigData)

  const block = buildWatermarkBlock(filePath, contentSha, sig, ts)
  const commentBlock = block.map(commenter).join('\n')

  let runtimeCheck = ''
  if (['.ts', '.tsx', '.mjs', '.js'].includes(ext)) {
    runtimeCheck = runtimeCheckJS(ENTITY, contentSha)
  } else if (ext === '.rs') {
    runtimeCheck = runtimeCheckRust(ENTITY, contentSha)
  }

  const watermarked = `${commentBlock}\n${runtimeCheck}\n${content}`
  writeFileSync(filePath, watermarked)

  console.log('[WATERMARK] ✓ Marked:', filePath, '| sha:', contentSha.slice(0, 12) + '...')
  return { filePath, contentSha, sig: sig.slice(0, 32) + '...', ts }
}

function collectFiles(target) {
  const stat = statSync(target)
  if (stat.isFile()) return [target]
  const files = []
  const IGNORE = new Set(['node_modules', '.git', 'dist', 'target', '.next'])
  function walk(dir) {
    for (const e of readdirSync(dir)) {
      if (IGNORE.has(e)) continue
      const full = join(dir, e)
      try {
        const s = statSync(full)
        if (s.isDirectory()) walk(full)
        else if (COMMENT[extname(e).toLowerCase()]) files.push(full)
      } catch {}
    }
  }
  walk(target)
  return files
}

export async function run(options = {}) {
  const args = options.args || process.argv.slice(2)
  const targetIdx = args.indexOf('--target')
  const target = options.target || (targetIdx >= 0 ? args[targetIdx + 1] : join(__dir, '..'))

  console.log('[WATERMARK] Shadow Orchestrator — Cryptographic Provenance Agent')
  console.log('[WATERMARK] Entity:', ENTITY)
  console.log('[WATERMARK] Target:', target)

  const key = getOrCreateKey()
  const files = collectFiles(target)
  console.log('[WATERMARK] Files eligible:', files.length)

  const manifest = { entity: ENTITY, generated: new Date().toISOString(), marks: [] }

  for (const f of files) {
    const result = await watermarkFile(f, key)
    if (result) manifest.marks.push(result)
  }

  const { seal } = sealEvent('WATERMARK', 'provenance-injected', {
    entity: ENTITY,
    filesMarked: manifest.marks.length,
  })
  manifest.wormSeal = seal
  manifest.publicKey = key.publicKey

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log('[WATERMARK] Manifest sealed:', MANIFEST_PATH)
  console.log('[WATERMARK] WORM seal:', seal)
  console.log('[WATERMARK] Files marked:', manifest.marks.length)
  return { status: 'WATERMARKED', seal, marks: manifest.marks, target }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(console.error)
}
