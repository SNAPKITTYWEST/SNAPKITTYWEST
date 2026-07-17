// interpreter.mjs — METAMINE Core Interpreter
// Stack machine + execution loop + rupture mode

import { parseGrid, CELL_TYPES, getNeighbors, findNearestMine } from './metatron-grid.mjs';
import { sealTrace, formatSeal } from './seal.mjs';

const MAX_STEPS = 10_000;

export function createInterpreter(source, options = {}) {
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
    inputBuffer: input.split(''),
  };

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

    if (CELL_TYPES.NOP.includes(symbol)) {
      recordTrace('NOP', x, y);
    } else if (CELL_TYPES.PUSH.includes(symbol)) {
      push(cell.resonance);
      recordTrace('SEED', x, y);
    } else if (CELL_TYPES.POP.includes(symbol)) {
      pop();
      recordTrace('DROP', x, y);
    } else if (CELL_TYPES.ADD.includes(symbol)) {
      const a = pop();
      const b = pop();
      push(a + b);
      recordTrace('FUSE', x, y);
    } else if (CELL_TYPES.SUB.includes(symbol)) {
      const a = pop();
      const b = pop();
      push(b - a);
      recordTrace('CUT', x, y);
    } else if (CELL_TYPES.MUL.includes(symbol)) {
      const a = pop();
      const b = pop();
      push(a * b);
      recordTrace('FORGE', x, y);
    } else if (CELL_TYPES.OUTPUT.includes(symbol)) {
      const val = pop();
      if (val >= 32 && val <= 126) {
        state.output += String.fromCharCode(val);
      } else {
        state.output += `[${val}]`;
      }
      recordTrace('ECHO', x, y);
    } else if (CELL_TYPES.INPUT.includes(symbol)) {
      const char = state.inputBuffer.shift() || '\0';
      push(char.charCodeAt(0));
      recordTrace('LISTEN', x, y);
    } else if (CELL_TYPES.JUMP.includes(symbol)) {
      const target = findNearestMine(grid, x, y, width, height, state.direction);
      state.cursor.x = target.x;
      state.cursor.y = target.y;
      recordTrace('GATE', x, y);
    } else if (CELL_TYPES.MINE.includes(symbol)) {
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
    } else if (CELL_TYPES.HALT.includes(symbol)) {
      state.halted = true;
      recordTrace('SEAL', x, y);
    }

    state.steps++;
    if (state.steps >= maxSteps) {
      state.halted = true;
    }
  }

  function run() {
    while (!state.halted) {
      executeCell();
      if (!state.halted) {
        moveCursor();
      }
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

export function runMetamine(source, options = {}) {
  const interpreter = createInterpreter(source, options);
  return interpreter.run();
}
