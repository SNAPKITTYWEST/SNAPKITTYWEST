// curator.mjs — METAMINE Curator
// Programs are not executed. They are excavated.
// Every sweep reveals computation. Every rupture becomes art.
// Every execution leaves an artifact.

import { parseGrid, CELL_TYPES, getNeighbors, findNearestMine } from './metatron-grid.mjs';
import { sealTrace, formatSeal } from './seal.mjs';

const MAX_STEPS = 10_000;

// ════════════════════════════════════════════════════════════════
// SEMANTIC SYMBOLS (not decorative)
// ════════════════════════════════════════════════════════════════

export const SYMBOL_MEANINGS = {
  '☉': 'ORIGIN — starting point of excavation',
  '◇': 'RESONANCE — amplifies stack top by golden ratio',
  '△': 'TRANSFORM — rotates stack (a b c → b c a)',
  '⬡': 'MEMORY — stores stack top in cell memory',
  '⌹': 'REDUCTION — collapses stack to sum',
  '○': 'PORTAL — teleports to matching portal',
  'M': 'RUPTURE — mine detonation, conditional branch',
  'Ω': 'SEAL — finalize and hash execution',
};

export function createCurator(source, options = {}) {
  const { maxSteps = MAX_STEPS, input = '', debug = false } = options;
  const { grid, mines, width, height } = parseGrid(source);

  const state = {
    stack: [],
    trace: [],
    output: '',
    cursor: { x: 0, y: 0 },
    direction: { dx: 1, dy: 0 },
    steps: 0,
    halted: false,
    ruptures: [],
    symbols: [],
    memory: {},  // Cell memory for ⬡ operations
    portals: [], // Portal locations for ○ operations
    inputBuffer: input.split(''),
  };

  // Find all portals
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].symbol === '○') {
        state.portals.push({ x, y });
      }
    }
  }

  const PHI = 1.618033988749895;

  function push(val) {
    state.stack.push(val);
    return state.stack;
  }

  function pop() {
    return state.stack.pop() || 0;
  }

  function peek() {
    return state.stack[state.stack.length - 1] || 0;
  }

  function recordTrace(op, x, y) {
    state.trace.push({ op, x, y, stack: [...state.stack], step: state.steps });
  }

  function moveCursor() {
    state.cursor.x += state.direction.dx;
    state.cursor.y += state.direction.dy;

    if (state.cursor.x < 0) {
      state.cursor.x = width - 1;
      state.cursor.y = Math.max(0, state.cursor.y - 1);
    } else if (state.cursor.x >= width) {
      state.cursor.x = 0;
      state.cursor.y = Math.min(height - 1, state.cursor.y + 1);
    }

    if (state.cursor.y < 0 || state.cursor.y >= height) {
      state.halted = true;
    }
  }

  function executeCell() {
    const { x, y } = state.cursor;
    const cell = grid[y]?.[x];
    if (!cell) {
      state.halted = true;
      return;
    }

    const symbol = cell.symbol;
    cell.revealed = true;

    if (debug) {
      console.error(`[${state.steps}] (${x},${y}) ${symbol} stack=[${state.stack.join(',')}]`);
    }

    // ═══════════════════════════════════════════════════════════
    // CORE OPERATIONS
    // ═══════════════════════════════════════════════════════════

    if (symbol === '0') {
      // NOP
      recordTrace('NOP', x, y);
    } else if (symbol === '1') {
      // SEED — push resonance
      push(cell.resonance);
      recordTrace('SEED', x, y);
    } else if (symbol === '2') {
      // DROP
      pop();
      recordTrace('DROP', x, y);
    } else if (symbol === '3') {
      // FUSE — add
      const a = pop();
      const b = pop();
      push(a + b);
      recordTrace('FUSE', x, y);
    } else if (symbol === '4') {
      // CUT — subtract
      const a = pop();
      const b = pop();
      push(b - a);
      recordTrace('CUT', x, y);
    } else if (symbol === '5') {
      // FORGE — multiply
      const a = pop();
      const b = pop();
      push(a * b);
      recordTrace('FORGE', x, y);
    } else if (symbol === '6') {
      // ECHO — output
      const val = pop();
      if (val >= 32 && val <= 126) {
        state.output += String.fromCharCode(val);
      } else {
        state.output += `[${val}]`;
      }
      recordTrace('ECHO', x, y);
    } else if (symbol === '7') {
      // LISTEN — input
      const char = state.inputBuffer.shift() || '\0';
      push(char.charCodeAt(0));
      recordTrace('LISTEN', x, y);
    } else if (symbol === '8') {
      // GATE — jump to nearest mine
      const target = findNearestMine(grid, x, y, width, height, state.direction);
      state.cursor.x = target.x;
      state.cursor.y = target.y;
      recordTrace('GATE', x, y);
    }

    // ═══════════════════════════════════════════════════════════
    // SEMANTIC SYMBOLS (with meaning)
    // ═══════════════════════════════════════════════════════════

    else if (symbol === '☉') {
      // ORIGIN — starting point
      recordTrace('ORIGIN', x, y);
    } else if (symbol === '◇') {
      // RESONANCE — amplify by golden ratio
      const top = peek();
      push(Math.round(top * PHI));
      recordTrace('RESONANCE', x, y);
    } else if (symbol === '△') {
      // TRANSFORM — rotate stack
      if (state.stack.length >= 3) {
        const a = pop();
        const b = pop();
        const c = pop();
        push(b);
        push(c);
        push(a);
      }
      recordTrace('TRANSFORM', x, y);
    } else if (symbol === '⬡') {
      // MEMORY — store stack top in cell memory
      const val = peek();
      state.memory[`${x},${y}`] = val;
      recordTrace('MEMORY', x, y);
    } else if (symbol === '⌹') {
      // REDUCTION — collapse stack to sum
      const sum = state.stack.reduce((a, b) => a + b, 0);
      state.stack = [sum];
      recordTrace('REDUCTION', x, y);
    } else if (symbol === '○') {
      // PORTAL — teleport to matching portal
      const currentPortalIndex = state.portals.findIndex(p => p.x === x && p.y === y);
      if (currentPortalIndex >= 0 && state.portals.length >= 2) {
        const nextPortalIndex = (currentPortalIndex + 1) % state.portals.length;
        const target = state.portals[nextPortalIndex];
        state.cursor.x = target.x;
        state.cursor.y = target.y;
      }
      recordTrace('PORTAL', x, y);
    }

    // ═══════════════════════════════════════════════════════════
    // MINE OPERATIONS
    // ═══════════════════════════════════════════════════════════

    else if (symbol === 'M') {
      // RUPTURE — mine detonation
      const top = peek();
      if (top !== 0) {
        const rupture = {
          x, y,
          power: top,
          neighbors: getNeighbors(x, y, width, height),
          step: state.steps,
        };
        state.ruptures.push(rupture);

        for (const n of rupture.neighbors) {
          grid[n.y][n.x].revealed = true;
        }

        state.symbols.push({
          x: x * 20,
          y: y * 20,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          char: symbol,
          life: 60,
        });
      }
      recordTrace('RUPTURE', x, y);
    } else if (symbol === 'Ω') {
      // SEAL — halt and seal
      state.halted = true;
      recordTrace('SEAL', x, y);
    }

    state.steps++;
    if (state.steps >= maxSteps) {
      state.halted = true;
    }
  }

  function run() {
    // ═══════════════════════════════════════════════════════════
    // EXCAVATION ANIMATION
    // ═══════════════════════════════════════════════════════════

    if (debug) {
      console.error('\n╔══════════════════════════════════════════╗');
      console.error('║  EXCAVATING...                          ║');
      console.error('╚══════════════════════════════════════════╝\n');
    }

    while (!state.halted) {
      executeCell();
      if (!state.halted) {
        moveCursor();
      }
    }

    // ═══════════════════════════════════════════════════════════
    // SEALING ANIMATION
    // ═══════════════════════════════════════════════════════════

    if (debug) {
      console.error('\n╔══════════════════════════════════════════╗');
      console.error('║  □□□□□□□□□□□□                          ║');
      console.error('║  HASHING...                             ║');
      console.error('║  □□□□□□□□□□□□                          ║');
      console.error('║  SEALED                                 ║');
      console.error('║  Ω                                      ║');
      console.error('╚══════════════════════════════════════════╝\n');
    }

    const seal = sealTrace(state.trace, state.output);
    return {
      state,
      seal,
      grid,
      width,
      height,
    };
  }

  return { state, grid, width, height, run };
}

// ════════════════════════════════════════════════════════════════
// LEGACY API (for backwards compatibility)
// ════════════════════════════════════════════════════════════════

export function createInterpreter(source, options = {}) {
  return createCurator(source, options);
}

export function runMetamine(source, options = {}) {
  const curator = createCurator(source, options);
  return curator.run();
}
