// seal.mjs — METAMINE WORM Seal
// SHA-256 execution trace → cryptographic proof
// Programs are not executed. They are excavated.

import { createHash } from 'crypto';

export function sealTrace(trace, output) {
  const payload = trace.map(t =>
    `${t.op}:${t.x},${t.y}:${t.stackHash || ''}`
  ).join('|');

  const hash = createHash('sha256')
    .update(`METAMINE|${payload}|${output}`)
    .digest('hex');

  return {
    hash,
    steps: trace.length,
    output,
    timestamp: new Date().toISOString(),
    trace: payload,
  };
}

// ════════════════════════════════════════════════════════════════
// ANIMATED SEAL FORMAT
// ════════════════════════════════════════════════════════════════

export function formatSeal(seal) {
  const bar = (val, max = 1, width = 20) => {
    const filled = Math.round((val / max) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
  };

  return `
╔══════════════════════════════════════════════════════════╗
║  METAMINE WORM SEAL                                      ║
╠══════════════════════════════════════════════════════════╣
║  Hash:    ${seal.hash.slice(0, 16)}...                        ║
║  Steps:   ${String(seal.steps).padEnd(4)} / 10000                     ║
║  Output:  ${(seal.output || '(none)').slice(0, 20).padEnd(20)}            ║
║  Time:    ${seal.timestamp}    ║
╚══════════════════════════════════════════════════════════╝

Trace: ${bar(seal.steps, 10000)}
       ${seal.steps} steps executed
       ${seal.hash}
`.trim();
}

// ════════════════════════════════════════════════════════════════
// CEREMONIAL SEAL ANIMATION
// ════════════════════════════════════════════════════════════════

export function formatSealAnimated(seal) {
  const lines = [];
  
  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════╗');
  lines.push('║  EXCAVATION COMPLETE                                     ║');
  lines.push('╠══════════════════════════════════════════════════════════╣');
  lines.push('║                                                          ║');
  lines.push('║  □□□□□□□□□□□□                                          ║');
  lines.push('║                                                          ║');
  lines.push('║  HASHING...                                              ║');
  lines.push('║                                                          ║');
  lines.push('║  □□□□□□□□□□□□                                          ║');
  lines.push('║                                                          ║');
  lines.push('║  SEALED                                                  ║');
  lines.push('║                                                          ║');
  lines.push('║  Ω                                                       ║');
  lines.push('║                                                          ║');
  lines.push('╠══════════════════════════════════════════════════════════╣');
  lines.push(`║  Hash:    ${seal.hash.slice(0, 16)}...                        ║`);
  lines.push(`║  Steps:   ${String(seal.steps).padEnd(4)} / 10000                     ║`);
  lines.push(`║  Output:  ${(seal.output || '(none)').slice(0, 20).padEnd(20)}            ║`);
  lines.push(`║  Time:    ${seal.timestamp}    ║`);
  lines.push('╚══════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`Seal: ${seal.hash}`);
  lines.push('');
  lines.push('Programs are not executed. They are excavated.');
  lines.push('');
  
  return lines.join('\n');
}

// ════════════════════════════════════════════════════════════════
// GENESIS SEAL
// ════════════════════════════════════════════════════════════════

export const GENESIS_SEAL = `
╔══════════════════════════════════════════════════════════╗
║  METAMINE GENESIS                                         ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  ERRANT_GENESIS_001                                      ║
║                                                          ║
║  Forth is the metal.                                     ║
║  Prolog is the law.                                      ║
║  Linear types are the vow.                               ║
║  WORM is the memory.                                     ║
║  Ω                                                       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`.trim();
