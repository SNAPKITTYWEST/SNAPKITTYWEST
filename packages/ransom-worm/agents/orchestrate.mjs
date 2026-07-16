#!/usr/bin/env node
import { readdirSync, statSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import { createHash } from 'node:crypto'
import { join, relative, dirname, basename, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { verifyOnce } from './icp-verifier.mjs'
import { run as runMetrics } from './metric-stream.mjs'
import { run as runBifrost } from './bifrost-translator.mjs'
import { run as runWatermark } from './watermark.mjs'
import { sealEvent } from './worm-chain.mjs'
import { flickerRepo, listArchivedRepos } from './graveyard.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = join(__dir, '..')
const ROOT = resolve(process.env.SNAPKITTYWEST_ROOT || join(PACKAGE_ROOT, '..', '..'))
const SHADOW_ROOT = resolve(process.env.SHADOW_ORCHESTRATOR_ROOT || join(ROOT, 'packages', 'shadow-orchestrator'))
const PAGES = join(SHADOW_ROOT, 'pages')
const OUT = resolve(process.env.RANSOM_WORM_OUT || join(PACKAGE_ROOT, 'bifrost-out'))
const PUBLIC = resolve(process.env.RANSOM_WORM_PUBLIC || join(PACKAGE_ROOT, 'public'))
const DAY_MS = 24 * 60 * 60 * 1000

let tick = 0
let running = false
const relaySockets = new Set()

function parseArgs() {
  const args = process.argv.slice(2)
  const intervalIdx = args.indexOf('--interval')
  return {
    once: args.includes('--once'),
    relayOnly: args.includes('--relay-only'),
    interval: intervalIdx >= 0 ? parseInt(args[intervalIdx + 1], 10) : parseInt(process.env.ORCHESTRATE_INTERVAL_MS || '30000', 10),
  }
}

function walk(dir, match, files = []) {
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()
    let entries = []
    try { entries = readdirSync(current) } catch { continue }
    for (const entry of entries) {
      const full = join(current, entry)
      let stat
      try { stat = statSync(full) } catch { continue }
      if (stat.isDirectory()) stack.push(full)
      else if (match(full, stat)) files.push(full)
    }
  }
  return files
}

function recentPageSources() {
  const cutoff = Date.now() - DAY_MS
  return walk(PAGES, (file, stat) => extname(file) === '.ts' && stat.mtimeMs >= cutoff)
}

function outFiles() {
  return new Set(walk(OUT, file => true).map(file => relative(OUT, file)))
}

function prefixForSource(source) {
  const rel = relative(PAGES, source)
  const parts = rel.split(/[\\/]/).filter(Boolean)
  const stem = basename(source).replace(/\.[^.]+$/, '')
  const scope = parts.length > 1 ? parts.slice(0, -1).join('-') : 'page'
  return stem === 'index' ? `${scope}-` : `${scope}-`
}

async function quiet(fn) {
  const out = console.log
  const err = console.error
  console.log = (...args) => err(...args)
  console.error = (...args) => err(...args)
  try { return await fn() }
  finally {
    console.log = out
    console.error = err
  }
}

function sealed(name, status, payload = {}) {
  const { seal } = sealEvent(name, 'agent-result', { status, ...payload })
  return { name, status, seal }
}

function writeJsonLine(message) {
  const line = JSON.stringify(message) + '\n'
  process.stdout.write(line)
  for (const socket of relaySockets) {
    if (!socket.destroyed) socket.write(encodeWsFrame(JSON.stringify(message)))
  }
}

async function runTick() {
  if (running) return
  running = true
  tick += 1
  const ts = new Date().toISOString()
  const agents = []

  try {
    mkdirSync(PUBLIC, { recursive: true })
    mkdirSync(OUT, { recursive: true })

    const icp = await quiet(() => verifyOnce({}))
    if (icp.status === 'DRIFT_DETECTED') {
      const incident = sealEvent('ORCHESTRATOR', 'icp-drift-incident', { tick, ts, icp })
      agents.push({ name: 'icp-verifier', status: 'DRIFT_DETECTED', seal: incident.seal })
      writeJsonLine({ tick, ts, agents })
      return
    }
    agents.push(sealed('icp-verifier', icp.status || 'VERIFIED', { internalSeal: icp.seal }))

    const metrics = await quiet(() => runMetrics({
      repoPath: ROOT,
      outPath: join(PUBLIC, 'metrics.json'),
    }))
    agents.push(sealed('metric-stream', 'UPDATED', { internalSeal: metrics.wormSeal }))

    const before = outFiles()
    const sources = recentPageSources()
    const translations = []
    for (const sourcePath of sources) {
      const result = await quiet(() => runBifrost({
        sourcePath,
        targets: ['rust', 'lean4'],
        outDir: OUT,
        namePrefix: prefixForSource(sourcePath),
      }))
      translations.push(result)
    }
    agents.push(sealed('bifrost-translator', sources.length ? 'TRANSLATED' : 'IDLE', {
      files: sources.length,
      internalSeals: translations.map(r => r.seal).filter(Boolean),
    }))

    const after = outFiles()
    const newFiles = [...after].filter(file => !before.has(file))
    const watermark = await quiet(() => runWatermark({ target: OUT }))
    agents.push(sealed('watermark', watermark.marks.length ? 'WATERMARKED' : 'IDLE', {
      files: newFiles,
      filesMarked: watermark.marks.length,
      internalSeal: watermark.seal,
    }))

    writeJsonLine({ tick, ts, agents })
  } catch (error) {
    const incident = sealEvent('ORCHESTRATOR', 'tick-error', { tick, ts, message: error.message })
    agents.push({ name: 'orchestrator', status: 'ERROR', seal: incident.seal })
    writeJsonLine({ tick, ts, agents })
  } finally {
    running = false
  }
}

function encodeWsFrame(text) {
  const body = Buffer.from(text)
  if (body.length < 126) return Buffer.concat([Buffer.from([0x81, body.length]), body])
  if (body.length <= 0xffff) {
    const header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 126
    header.writeUInt16BE(body.length, 2)
    return Buffer.concat([header, body])
  }
  const header = Buffer.alloc(10)
  header[0] = 0x81
  header[1] = 127
  header.writeBigUInt64BE(BigInt(body.length), 2)
  return Buffer.concat([header, body])
}

function decodeWsFrame(buffer) {
  if (buffer.length < 2) return null
  const opcode = buffer[0] & 0x0f
  if (opcode === 0x8) return { close: true }
  const masked = (buffer[1] & 0x80) !== 0
  let len = buffer[1] & 0x7f
  let offset = 2
  if (len === 126) {
    if (buffer.length < 4) return null
    len = buffer.readUInt16BE(2)
    offset = 4
  } else if (len === 127) {
    if (buffer.length < 10) return null
    len = Number(buffer.readBigUInt64BE(2))
    offset = 10
  }
  const maskOffset = offset
  if (masked) offset += 4
  if (buffer.length < offset + len) return null
  const payload = Buffer.from(buffer.slice(offset, offset + len))
  if (masked) {
    const mask = buffer.slice(maskOffset, maskOffset + 4)
    for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4]
  }
  return { text: payload.toString('utf8') }
}

function acceptHandshake(socket, request) {
  const key = request.match(/Sec-WebSocket-Key:\s*(.+)\r?\n/i)?.[1]?.trim()
  if (!key) {
    socket.destroy()
    return false
  }
  const accept = createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64')
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  )
  relaySockets.add(socket)
  socket.once('close', () => relaySockets.delete(socket))
  socket.once('error', () => relaySockets.delete(socket))
  return true
}

function handleRelayMessage(text) {
  let message
  try { message = JSON.parse(text) } catch { return }

  if (message.type === 'ransom_worm:dispatch') {
    tick += 1
    const ts = new Date().toISOString()
    const accepted = sealed('resurrect', 'ACCEPTED', {
      repo: message.repo,
      dryRun: Boolean(message.dryRun),
    })
    writeJsonLine({
      tick,
      ts,
      type: 'ransom_worm:accepted',
      repo: message.repo,
      dryRun: Boolean(message.dryRun),
      agents: [accepted],
    })
    return
  }

  if (message.type === 'ransom_worm:graveyard') {
    tick += 1
    const ts = new Date().toISOString()
    const dryRun = Boolean(message.dryRun)
    const allowWrite = Boolean(message.allowWrite)
    const repos = Array.isArray(message.repos) ? message.repos : (message.repo ? [message.repo] : null)

    writeJsonLine({ tick, ts, type: 'ransom_worm:graveyard_accepted', repos, dryRun })

    const doFlicker = async () => {
      const targets = repos ?? (await listArchivedRepos(message.org || 'SNAPKITTYWEST')).map(r => r.fullName)
      for (const fullName of targets) {
        try {
          const result = await flickerRepo(fullName, { dryRun, allowWrite })
          writeJsonLine({ tick, ts, type: 'ransom_worm:graveyard_result', ...result })
        } catch (e) {
          const incident = sealEvent('GRAVEYARD', 'flicker-error', { fullName, message: e.message })
          writeJsonLine({ tick, ts, type: 'ransom_worm:graveyard_error', fullName, error: e.message, seal: incident.seal })
        }
      }
    }
    doFlicker().catch(e => writeJsonLine({ tick, ts, type: 'ransom_worm:graveyard_error', error: e.message }))
    return
  }
}

function startRelay(port) {
  const server = createServer(socket => {
    let handshaken = false
    let pending = Buffer.alloc(0)

    socket.on('data', chunk => {
      if (!handshaken) {
        const request = chunk.toString('utf8')
        if (!request.includes('\r\n\r\n')) return
        handshaken = acceptHandshake(socket, request)
        return
      }

      pending = Buffer.concat([pending, chunk])
      const frame = decodeWsFrame(pending)
      if (!frame) return
      pending = Buffer.alloc(0)
      if (frame.close) {
        socket.end()
        return
      }
      handleRelayMessage(frame.text)
    })
  })

  server.listen(port, '127.0.0.1', () => {
    const address = server.address()
    const boundPort = typeof address === 'object' && address ? address.port : port
    writeJsonLine({ type: 'relay:ready', port: boundPort })
  })
  server.on('error', error => {
    writeJsonLine({ type: 'relay:error', message: error.message })
  })
}

function start() {
  const args = parseArgs()
  const relayPort = Number.parseInt(process.env.ORCHESTRATE_WS_PORT || '', 10)
  if (Number.isInteger(relayPort) || args.relayOnly) startRelay(Number.isInteger(relayPort) ? relayPort : 0)
  if (args.relayOnly) return
  runTick()
  if (!args.once) setInterval(runTick, args.interval)
}

start()
