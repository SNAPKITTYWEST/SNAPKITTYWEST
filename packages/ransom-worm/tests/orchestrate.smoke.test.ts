/**
 * Smoke test: relay bind → client connect → dispatch frame → ACCEPTED tick
 *
 * Uses an OS-assigned port to avoid collisions with a running orchestrator.
 * The test syncs on the `relay:ready` stdout line before connecting,
 * so there is no race between bind and connect.
 */

import { spawn, ChildProcess } from 'child_process';
import { createHash }          from 'crypto';
import * as net                from 'net';
import { fileURLToPath }       from 'url';
import { join, dirname }       from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ORCH  = join(__dir, '..', 'agents', 'orchestrate.mjs');
const TIMEOUT_MS = 10_000;

function wsHandshake(socket: net.Socket, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const key    = createHash('sha1').update(Math.random().toString()).digest('base64');
    const expect = createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      `GET / HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\n` +
      `Connection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\n` +
      `Sec-WebSocket-Version: 13\r\n\r\n`
    );

    socket.once('data', chunk => {
      const resp = chunk.toString();
      if (resp.includes(expect)) resolve();
      else reject(new Error(`WS handshake failed:\n${resp.slice(0, 200)}`));
    });
  });
}

/** Encode a masked client→server WebSocket text frame */
function maskFrame(text: string): Buffer {
  const body   = Buffer.from(text);
  const mask   = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const masked = Buffer.from(body.map((b, i) => b ^ mask[i % 4]));
  const header = body.length < 126
    ? Buffer.from([0x81, 0x80 | body.length])
    : Buffer.from([0x81, 0xFE, body.length >> 8, body.length & 0xFF]);
  return Buffer.concat([header, mask, masked]);
}

/** Decode a server→client WebSocket text frame (unmasked) */
function decodeFrame(data: Buffer): string {
  const lenByte = data[1] & 127;
  let offset = 2;
  let len = lenByte;
  if (lenByte === 126) { len = data.readUInt16BE(2); offset = 4; }
  else if (lenByte === 127) { len = Number(data.readBigUInt64BE(2)); offset = 10; }
  return data.slice(offset, offset + len).toString();
}

// ── test ─────────────────────────────────────────────────────────────────────

test('relay:ready → connect → dispatch → ACCEPTED within timeout', async () => {
  const port = 0;
  let   proc: ChildProcess | null = null;

  try {
    // 1. Spawn orchestrator with a unique port; suppress tick noise on stderr
    proc = spawn(process.execPath, [ORCH, '--relay-only'], {
      env: {
        ...process.env,
        ORCHESTRATE_WS_PORT: String(port),
        SNAPKITTYWEST_ROOT: join(__dir, '..', '..', '..'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stderrLines: string[] = [];
    proc.stderr!.on('data', (d: Buffer) => stderrLines.push(d.toString().trimEnd()));

    // 2. Wait for relay:ready on stdout (proves port is bound)
    const ready = await new Promise<{ port: number }>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`relay:ready not received within ${TIMEOUT_MS}ms\nstderr:\n${stderrLines.join('\n')}`)),
        TIMEOUT_MS
      );
      let buf = '';
      proc!.stdout!.on('data', (chunk: Buffer) => {
        buf += chunk.toString();
        for (const line of buf.split('\n')) {
          try {
            const msg = JSON.parse(line.trim());
            if (msg.type === 'relay:ready') { clearTimeout(timer); resolve(msg); }
            if (msg.type === 'relay:error') { clearTimeout(timer); reject(new Error(`relay:error: ${msg.message}`)); }
          } catch { /* not JSON yet */ }
        }
        buf = buf.slice(buf.lastIndexOf('\n') + 1);
      });
    });

    expect(ready.port).toBeGreaterThan(0);

    // 3. Connect and handshake
    const socket = net.connect(ready.port, '127.0.0.1');
    await new Promise<void>((res, rej) => socket.once('connect', res).once('error', rej));
    await wsHandshake(socket, ready.port);

    // 4. Send dispatch frame
    const dispatchMsg = JSON.stringify({
      type: 'ransom_worm:dispatch',
      repo: 'https://github.com/test/smoke-test-repo',
      dryRun: true,
    });
    socket.write(maskFrame(dispatchMsg));

    // 5. Wait for ACCEPTED tick — emit() writes to both stdout and the socket;
    //    we race both so a frame-decode edge case can't cause a false timeout.
    const tick = await new Promise<Record<string, unknown>>((resolve, reject) => {
      let settled = false;
      const done = (msg: Record<string, unknown>) => { if (!settled) { settled = true; clearTimeout(timer); socket.destroy(); resolve(msg); } };
      const timer = setTimeout(
        () => { if (!settled) { settled = true; reject(new Error(`ACCEPTED tick not received within ${TIMEOUT_MS}ms\nstderr:\n${stderrLines.join('\n')}`)); } },
        TIMEOUT_MS
      );

      const isAccepted = (msg: Record<string, unknown>) =>
        Array.isArray(msg.agents) &&
        (msg.agents as Array<{ name: string; status: string }>).some(a => a.name === 'resurrect' && a.status === 'ACCEPTED');

      // path A: stdout (emit writes JSON lines here too)
      let stdoutBuf = '';
      proc!.stdout!.on('data', (chunk: Buffer) => {
        stdoutBuf += chunk.toString();
        for (const line of stdoutBuf.split('\n')) {
          try { const m = JSON.parse(line.trim()) as Record<string, unknown>; if (isAccepted(m)) done(m); } catch { /* not json */ }
        }
        stdoutBuf = stdoutBuf.slice(stdoutBuf.lastIndexOf('\n') + 1);
      });

      // path B: WebSocket frame
      let wsBuf = Buffer.alloc(0);
      socket.on('data', (chunk: Buffer) => {
        wsBuf = Buffer.concat([wsBuf, chunk]);
        try { const m = JSON.parse(decodeFrame(wsBuf)) as Record<string, unknown>; if (isAccepted(m)) done(m); }
        catch { /* incomplete frame */ }
      });
    });

    // 6. Assert shape
    expect(tick).toMatchObject({
      repo:   'https://github.com/test/smoke-test-repo',
      dryRun: true,
    });
    const agents = tick.agents as Array<{ name: string; status: string; seal: string }>;
    const resurrectAgent = agents.find(a => a.name === 'resurrect');
    expect(resurrectAgent?.status).toBe('ACCEPTED');
    expect(typeof resurrectAgent?.seal).toBe('string');
    expect(resurrectAgent!.seal.length).toBeGreaterThan(0);

  } finally {
    proc?.kill('SIGTERM');
  }
}, TIMEOUT_MS + 2000);
