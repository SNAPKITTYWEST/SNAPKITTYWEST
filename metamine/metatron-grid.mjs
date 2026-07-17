// metatron-grid.mjs — METAMINE Grid Parser & Mine Adjacency Computer
// Parses ASCII minefields into 2D grids and computes resonance values
//
// Programs are not executed. They are excavated.
// Every sweep reveals computation. Every rupture becomes art.
// Every execution leaves an artifact.

// ════════════════════════════════════════════════════════════════
// SYMBOL DEFINITIONS (with semantic meaning)
// ════════════════════════════════════════════════════════════════

export const SYMBOLS = {
  VOID: '0',
  SEED: '1',
  DROP: '2',
  FUSE: '3',
  CUT: '4',
  FORGE: '5',
  ECHO: '6',
  LISTEN: '7',
  GATE: '8',
  RUPTURE: 'M',
  SEAL: 'Ω',
  ORIGIN: '☉',
  RESONANCE: '◇',    // Amplifies stack top by golden ratio
  TRANSFORM: '△',    // Rotates stack (a b c → b c a)
  MEMORY: '⬡',       // Stores stack top in cell memory
  REDUCTION: '⌹',    // Collapses stack to sum
  PORTAL: '○',       // Teleports to matching portal
};

// ════════════════════════════════════════════════════════════════
// CELL TYPE CLASSIFICATION
// ════════════════════════════════════════════════════════════════

export const CELL_TYPES = {
  NOP: ['0'],
  PUSH: ['1'],
  POP: ['2'],
  ADD: ['3'],
  SUB: ['4'],
  MUL: ['5'],
  OUTPUT: ['6'],
  INPUT: ['7'],
  JUMP: ['8'],
  MINE: ['M'],
  HALT: ['Ω'],
  // Semantic operations
  ORIGIN: ['☉'],
  RESONANCE: ['◇'],
  TRANSFORM: ['△'],
  MEMORY: ['⬡'],
  REDUCTION: ['⌹'],
  PORTAL: ['○'],
};

// ════════════════════════════════════════════════════════════════
// SYMBOL MEANINGS (for documentation)
// ════════════════════════════════════════════════════════════════

export const SYMBOL_MEANINGS = {
  '0': { name: 'VOID', description: 'No operation' },
  '1': { name: 'SEED', description: 'Push resonance value' },
  '2': { name: 'DROP', description: 'Pop stack' },
  '3': { name: 'FUSE', description: 'Add top two values' },
  '4': { name: 'CUT', description: 'Subtract top two values' },
  '5': { name: 'FORGE', description: 'Multiply top two values' },
  '6': { name: 'ECHO', description: 'Output as character' },
  '7': { name: 'LISTEN', description: 'Input character' },
  '8': { name: 'GATE', description: 'Jump to nearest mine' },
  'M': { name: 'RUPTURE', description: 'Mine detonation, conditional branch' },
  'Ω': { name: 'SEAL', description: 'Finalize and hash execution' },
  '☉': { name: 'ORIGIN', description: 'Starting point of excavation' },
  '◇': { name: 'RESONANCE', description: 'Amplifies stack top by golden ratio (φ)' },
  '△': { name: 'TRANSFORM', description: 'Rotates stack (a b c → b c a)' },
  '⬡': { name: 'MEMORY', description: 'Stores stack top in cell memory' },
  '⌹': { name: 'REDUCTION', description: 'Collapses stack to sum' },
  '○': { name: 'PORTAL', description: 'Teleports to matching portal' },
};

// ════════════════════════════════════════════════════════════════
// GRID PARSER
// ════════════════════════════════════════════════════════════════

export function parseGrid(source) {
  const lines = source.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const height = lines.length;
  const width = Math.max(...lines.map(l => l.split(/\s+/).length));

  const grid = [];
  const mines = [];
  const portals = [];

  for (let y = 0; y < height; y++) {
    const row = lines[y].split(/\s+/);
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      const cell = row[x] || '0';
      grid[y][x] = {
        symbol: cell,
        x,
        y,
        revealed: false,
        resonance: 0,
      };
      if (cell === 'M') {
        mines.push({ x, y });
      }
      if (cell === '○') {
        portals.push({ x, y });
      }
    }
  }

  computeResonance(grid, mines, width, height);

  return { grid, mines, portals, width, height };
}

// ════════════════════════════════════════════════════════════════
// RESONANCE COMPUTER
// ════════════════════════════════════════════════════════════════

function computeResonance(grid, mines, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].symbol === 'M') {
        grid[y][x].resonance = -1;
        continue;
      }
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (grid[ny][nx].symbol === 'M') count++;
          }
        }
      }
      grid[y][x].resonance = count;
    }
  }
}

// ════════════════════════════════════════════════════════════════
// GRID RENDERER
// ════════════════════════════════════════════════════════════════

export function renderGrid(grid, width, height, cursor = null, trace = []) {
  const revealed = new Set(trace.map(t => `${t.x},${t.y}`));
  const lines = [];

  for (let y = 0; y < height; y++) {
    let line = '';
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      const key = `${x},${y}`;
      const isCursor = cursor && cursor.x === x && cursor.y === y;
      const isRevealed = revealed.has(key);

      if (isCursor) {
        line += `\x1b[43m\x1b[30m${cell.symbol}\x1b[0m `;
      } else if (isRevealed && cell.symbol === 'M') {
        line += `\x1b[41m\x1b[97m${cell.symbol}\x1b[0m `;
      } else if (isRevealed) {
        line += `\x1b[90m${cell.symbol}\x1b[0m `;
      } else {
        // Color semantic symbols
        if (cell.symbol === '◇') line += `\x1b[36m${cell.symbol}\x1b[0m `;
        else if (cell.symbol === '△') line += `\x1b[33m${cell.symbol}\x1b[0m `;
        else if (cell.symbol === '⬡') line += `\x1b[35m${cell.symbol}\x1b[0m `;
        else if (cell.symbol === '⌹') line += `\x1b[32m${cell.symbol}\x1b[0m `;
        else if (cell.symbol === '○') line += `\x1b[34m${cell.symbol}\x1b[0m `;
        else if (cell.symbol === '☉') line += `\x1b[33m\x1b[1m${cell.symbol}\x1b[0m `;
        else if (cell.symbol === 'Ω') line += `\x1b[32m\x1b[1m${cell.symbol}\x1b[0m `;
        else line += `${cell.symbol} `;
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}

// ════════════════════════════════════════════════════════════════
// GRID UTILITIES
// ════════════════════════════════════════════════════════════════

export function getNeighbors(x, y, width, height) {
  const neighbors = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push({ x: nx, y: ny });
      }
    }
  }
  return neighbors;
}

export function findNearestMine(grid, x, y, width, height, direction = { dx: 1, dy: 0 }) {
  let cx = x + direction.dx;
  let cy = y + direction.dy;
  let steps = 0;

  while (steps < Math.max(width, height) * 2) {
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
      cx -= direction.dx;
      cy -= direction.dy;
      break;
    }
    if (grid[cy][cx].symbol === 'M') {
      return { x: cx, y: cy, steps };
    }
    cx += direction.dx;
    cy += direction.dy;
    steps++;
  }

  return { x: cx, y: cy, steps };
}

// ════════════════════════════════════════════════════════════════
// GEOMETRY SOURCE CODE (future: programs as geometry)
// ════════════════════════════════════════════════════════════════

export function parseGeometrySource(source) {
  // Future: parse ASCII art geometry as source code
  // ☉────◇────⬡
  // │     │
  // ○────M────△
  // │
  // ⌹────Ω
  return parseGrid(source);
}
