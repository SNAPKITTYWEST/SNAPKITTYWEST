/**
 * index.mjs — BOB Reasoning Engine
 * Entry point and public API.
 *
 * The reasoning engine sits between the knowledge corpus and the SSM injection.
 * It does not call Ollama directly — it prepares the reasoning context
 * that METATRON injects into the hidden state before MagmaCore fires.
 *
 * Usage:
 *   import { reason, illuminate, ALL_CHUNKS, CORPUS_SEAL } from '@snapkitty/bob-reasoning-engine'
 */

export { illuminate }          from './illuminate.mjs'
export { reason }              from './reason.mjs'
export {
  ALL_CHUNKS,
  CORPUS_SEAL,
  AOT,
  LADDER,
  SACRED_THREAD,
  TRAP_THEOREMS,
  RAT_DOCTRINE,
  REASONING_RULES,
  METATRON_TOPOLOGY,
} from './knowledge-chunks.mjs'

export { sovereign_step }  from './sovereign-bridge.mjs'
export { sovereign_exec, SHELL } from './backtick-shell.mjs'

// Version seal — changes when corpus changes
export const ENGINE_VERSION  = '0.2.0'
export const ENGINE_NAME     = 'BOB-REASONING-ENGINE'
export const AUTHOR          = 'Ahmad Ali Parr · SnapKitty Collective · 2026'
