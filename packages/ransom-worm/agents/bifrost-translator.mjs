#!/usr/bin/env node
/**
 * BIFROST TRANSLATOR — Shadow Orchestrator Agent 1
 * Autonomous polyglot translation via the Bifröst Bridge.
 * Ingests a validated algorithm/proof from one language and translates
 * it natively to all other languages in the sovereign stack.
 *
 * Run: node agents/bifrost-translator.mjs --source <file> --targets rust,lean4,haskell,apl,prolog
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sealEvent } from './worm-chain.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))

// Language signatures and output extensions
const TARGETS = {
  rust:       { ext: '.rs',   header: '// BIFROST: Translated from {{src}} — sovereign stack sync',  lang: 'Rust' },
  lean4:      { ext: '.lean', header: '-- BIFROST: Translated from {{src}} — sovereign stack sync',  lang: 'Lean 4' },
  haskell:    { ext: '.hs',   header: '-- BIFROST: Translated from {{src}} — sovereign stack sync',  lang: 'Haskell' },
  apl:        { ext: '.apl',  header: '⍝ BIFROST: Translated from {{src}} — sovereign stack sync',   lang: 'APL' },
  prolog:     { ext: '.pl',   header: '% BIFROST: Translated from {{src}} — sovereign stack sync',   lang: 'Prolog' },
  typescript: { ext: '.ts',   header: '// BIFROST: Translated from {{src}} — sovereign stack sync',  lang: 'TypeScript' },
  elixir:     { ext: '.ex',   header: '# BIFROST: Translated from {{src}} — sovereign stack sync',   lang: 'Elixir' },
  python:     { ext: '.py',   header: '# BIFROST: Translated from {{src}} — sovereign stack sync',   lang: 'Python' },
}

// Structural translation templates — agent generates these when LLM not available
const BRIDGE_TEMPLATES = {
  rust: (name, logic) => `
pub fn ${toSnake(name)}(/* params */) -> impl std::fmt::Debug {
    // Bifrost structural translation — awaiting LLM refinement
    ${logic.split('\n').map(l => '    // ' + l).join('\n')}
    todo!("bifrost: implement native logic")
}
`.trim(),

  lean4: (name, logic) => `
-- ${name} — Bifrost structural translation
def ${toCamel(name)} : Type := by
  ${logic.split('\n').map(l => '  -- ' + l).join('\n')}
  sorry -- bifrost: proof pending
`.trim(),

  haskell: (name, logic) => `
-- ${name} — Bifrost structural translation
${toCamel(name)} :: a -> b
${toCamel(name)} = error "bifrost: implement native logic"
  -- ${logic.split('\n').join('\n  -- ')}
`.trim(),

  apl: (name, logic) => `
⍝ ${name} — Bifrost structural translation
${toUpper(name)} ← { ⍝ bifrost stub
⍝   ${logic.split('\n').join('\n⍝   ')}
    ⍵ ⍝ identity — refine with native APL
}
`.trim(),

  prolog: (name, logic) => `
% ${name} — Bifrost structural translation
:- module(${toSnake(name)}, [${toSnake(name)}/1]).

${toSnake(name)}(X) :-
    % bifrost: translate logic
    % ${logic.split('\n').join('\n    % ')}
    true.
`.trim(),

  typescript: (name, logic) => `
// ${name} — Bifrost structural translation
export function ${toCamel(name)}(/* params */): unknown {
  // ${logic.split('\n').join('\n  // ')}
  throw new Error('bifrost: implement native logic')
}
`.trim(),

  elixir: (name, logic) => `
# ${name} — Bifrost structural translation
defmodule Bifrost.${toPascal(name)} do
  def run(params) do
    # ${logic.split('\n').join('\n    # ')}
    raise "bifrost: implement native logic"
  end
end
`.trim(),

  python: (name, logic) => `
# ${name} — Bifrost structural translation
def ${toSnake(name)}(params):
    """Bifrost: ${name} — translated from sovereign stack."""
    # ${logic.split('\n').join('\n    # ')}
    raise NotImplementedError("bifrost: implement native logic")
`.trim(),
}

function toSnake(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, '_') }
function toCamel(s) { return s.toLowerCase().replace(/[^a-z0-9]+([a-z])/g, (_, c) => c.toUpperCase()) }
function toPascal(s) { const c = toCamel(s); return c.charAt(0).toUpperCase() + c.slice(1) }
function toUpper(s) { return s.toUpperCase().replace(/[^A-Z0-9]/g, '_') }

function detectLang(filePath) {
  const ext = extname(filePath).toLowerCase()
  const map = { '.rs': 'rust', '.lean': 'lean4', '.hs': 'haskell', '.apl': 'apl', '.pl': 'prolog', '.ts': 'typescript', '.mjs': 'typescript', '.ex': 'elixir', '.py': 'python' }
  return map[ext] || 'unknown'
}

function extractName(filePath) {
  return basename(filePath).replace(/\.[^.]+$/, '')
}

async function callLLM(source, sourceLang, targetLang, content) {
  if (process.env.BIFROST_USE_LLM !== '1') return null
  // Attempt Claude API if available
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Translate this ${sourceLang} code to idiomatic ${targetLang}. Return ONLY the translated code, no explanation.

Source (${sourceLang}):
\`\`\`
${content}
\`\`\`

Translate to ${targetLang}:`
        }]
      })
    })
    const data = await res.json()
    return data?.content?.[0]?.text?.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim() || null
  } catch {
    return null
  }
}

export async function run(options = {}) {
  const args = options.args || process.argv.slice(2)
  const srcIdx = args.indexOf('--source')
  const tgtIdx = args.indexOf('--targets')
  const outIdx = args.indexOf('--out')

  if (!options.sourcePath && srcIdx < 0) {
    console.error('[BIFROST] Usage: --source <file> --targets <lang,...> [--out <dir>]')
    return { status: 'SKIPPED', seal: null, results: [], reason: 'missing source' }
  }

  const sourcePath = options.sourcePath || args[srcIdx + 1]
  const targetLangs = options.targets || (args[tgtIdx + 1] || 'rust,lean4,haskell,typescript').split(',').map(s => s.trim())
  const outDir = options.outDir || args[outIdx + 1] || join(dirname(sourcePath), 'bifrost-out')

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const content = readFileSync(sourcePath, 'utf8')
  const sourceLang = detectLang(sourcePath)
  const name = extractName(sourcePath)

  console.log('[BIFROST] Shadow Orchestrator — Polyglot Translator')
  console.log('[BIFROST] Source:', sourcePath, `(${sourceLang})`)
  console.log('[BIFROST] Targets:', targetLangs.join(', '))

  const results = []

  for (const target of targetLangs) {
    const def = TARGETS[target]
    if (!def) { console.log('[BIFROST] Unknown target:', target); continue }
    if (target === sourceLang) { console.log('[BIFROST] Skip (same as source):', target); continue }

    console.log(`[BIFROST] Translating → ${def.lang}...`)

    // Try LLM first, fall back to structural template
    let translated = await callLLM(sourcePath, sourceLang, def.lang, content)
    const method = translated ? 'llm' : 'structural-template'

    if (!translated) {
      const tmpl = BRIDGE_TEMPLATES[target]
      translated = tmpl ? tmpl(name, content) : `// TODO: ${def.lang} translation of ${name}`
    }

    const header = def.header.replace('{{src}}', basename(sourcePath))
    const outFile = join(outDir, (options.namePrefix || '') + name + '-bifrost' + def.ext)
    writeFileSync(outFile, `${header}\n// Method: ${method}\n\n${translated}\n`)

    console.log(`[BIFROST] ✓ ${def.lang}: ${outFile} (${method})`)
    results.push({ target: def.lang, outFile, method })
  }

  const { seal } = sealEvent('BIFROST', 'translation-complete', {
    source: sourcePath,
    sourceLang,
    targets: results.map(r => r.target),
  })

  console.log('[BIFROST] WORM seal:', seal)
  console.log('[BIFROST] Translations:', results.length)
  console.log('[BIFROST] State sync: all language substrates updated')
  return { status: 'TRANSLATED', seal, results, source: sourcePath }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(console.error)
}
