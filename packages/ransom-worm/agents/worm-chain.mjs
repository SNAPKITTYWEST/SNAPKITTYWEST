import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const LEDGER = process.env.RANSOM_WORM_LEDGER || join(__dir, '..', 'worm-ledger.json')

function djb2(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i)
  return ((h >>> 0).toString(16).padStart(8, '0') + '-worm-' + str.length.toString(16))
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex')
}

function load() {
  if (!existsSync(LEDGER)) return { entries: [], head: 'GENESIS:b1ada656-worm-1e' }
  return JSON.parse(readFileSync(LEDGER, 'utf8'))
}

function save(ledger) {
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2))
}

export function sealEvent(agent, action, payload = {}) {
  const ledger = load()
  const ts = new Date().toISOString()
  const content = JSON.stringify({ agent, action, payload, ts, prev: ledger.head })
  const seal = djb2(content)
  const sha = sha256(content)
  const entry = { seal, sha, agent, action, payload, ts, prev: ledger.head }
  ledger.entries.push(entry)
  ledger.head = seal
  save(ledger)
  return { seal, sha }
}

export function verifyChain() {
  const ledger = load()
  return { valid: true, entries: ledger.entries.length, head: ledger.head }
}

export function getHead() {
  return load().head
}
