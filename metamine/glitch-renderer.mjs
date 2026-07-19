// glitch-renderer.mjs — METAMINE Glitch Art Renderer
// ANSI terminal + SVG output with rupture effects

const COLORS = {
  gold: '#FFD700',
  black: '#0A0A0A',
  darkGold: '#B8860B',
  rupture: '#FF4444',
  seal: '#44FF44',
  void: '#1A1A1A',
  grid: '#333333',
  text: '#CCCCCC',
};

export function renderANSI(result) {
  const { state, grid, width, height, seal } = result;
  const lines = [];

  lines.push('\x1b[38;2;255;215;0m');
  lines.push('╔══════════════════════════════════════════════════╗');
  lines.push('║  METAMINE — Sweep the Field. Collapse the Cube. ║');
  lines.push('╚══════════════════════════════════════════════════╝');
  lines.push('\x1b[0m');

  for (let y = 0; y < height; y++) {
    let line = '';
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      const isCursor = state.cursor.x === x && state.cursor.y === y;
      const isRupture = state.ruptures.some(r => r.x === x && r.y === y);

      if (isCursor) {
        line += `\x1b[43m\x1b[30m${cell.symbol}\x1b[0m `;
      } else if (isRupture) {
        line += `\x1b[41m\x1b[97m${cell.symbol}\x1b[0m `;
      } else if (cell.revealed) {
        if (cell.symbol === 'M') {
          line += `\x1b[91m${cell.symbol}\x1b[0m `;
        } else {
          line += `\x1b[90m${cell.symbol}\x1b[0m `;
        }
      } else {
        line += `\x1b[38;2;184;134;11m${cell.symbol}\x1b[0m `;
      }
    }
    lines.push(line);
  }

  lines.push('');
  lines.push(`\x1b[38;2;255;215;0mStack:\x1b[0m [${state.stack.join(', ')}]`);
  lines.push(`\x1b[38;2;255;215;0mOutput:\x1b[0m ${state.output || '(none)'}`);
  lines.push(`\x1b[38;2;255;215;0mSteps:\x1b[0m ${state.steps}`);

  if (state.ruptures.length > 0) {
    lines.push('');
    lines.push('\x1b[38;2;255;68;68mRUPTURES:\x1b[0m');
    for (const r of state.ruptures) {
      lines.push(`  💥 (${r.x},${r.y}) power=${r.power} step=${r.step}`);
    }
  }

  lines.push('');
  lines.push(`\x1b[38;2;68;255;68mSEAL:\x1b[0m ${seal.hash}`);

  return lines.join('\n');
}

export function renderSVG(result) {
  const { state, grid, width, height, seal } = result;
  const cellSize = 40;
  const padding = 20;
  const svgWidth = width * cellSize + padding * 2;
  const svgHeight = height * cellSize + padding * 2 + 100;

  const cells = [];
  const ruptures = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      const cx = padding + x * cellSize + cellSize / 2;
      const cy = padding + y * cellSize + cellSize / 2;
      const isCursor = state.cursor.x === x && state.cursor.y === y;
      const isRupture = state.ruptures.some(r => r.x === x && r.y === y);

      let fill = COLORS.void;
      let stroke = COLORS.grid;
      let textColor = COLORS.text;

      if (isCursor) {
        fill = COLORS.gold;
        stroke = COLORS.gold;
        textColor = COLORS.black;
      } else if (isRupture) {
        fill = COLORS.rupture;
        stroke = COLORS.rupture;
        textColor = '#FFFFFF';
        ruptures.push({ cx, cy, power: cell.resonance });
      } else if (cell.revealed) {
        fill = COLORS.void;
        stroke = COLORS.darkGold;
        textColor = COLORS.darkGold;
      }

      cells.push(`
        <rect x="${padding + x * cellSize}" y="${padding + y * cellSize}" 
              width="${cellSize - 2}" height="${cellSize - 2}"
              fill="${fill}" stroke="${stroke}" stroke-width="1" rx="2"/>
        <text x="${cx}" y="${cy + 4}" text-anchor="middle" 
              font-family="monospace" font-size="14" fill="${textColor}">
          ${cell.symbol}
        </text>`);
    }
  }

  for (const r of ruptures) {
    for (let i = 0; i < r.power; i++) {
      const angle = (Math.PI * 2 * i) / r.power;
      const dist = 20 + Math.random() * 30;
      const px = r.cx + Math.cos(angle) * dist;
      const py = r.cy + Math.sin(angle) * dist;
      const char = ['M', 'Ω', '△', '◇', '⬡'][Math.floor(Math.random() * 5)];

      cells.push(`
        <text x="${px}" y="${py}" text-anchor="middle" 
              font-family="monospace" font-size="12" fill="${COLORS.rupture}" opacity="0.7">
          ${char}
        </text>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.gold};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.darkGold};stop-opacity:1" />
    </linearGradient>
    <filter id="glitch">
      <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  
  <rect width="100%" height="100%" fill="${COLORS.black}"/>
  
  <text x="${svgWidth/2}" y="30" text-anchor="middle" 
        font-family="monospace" font-size="18" fill="${COLORS.gold}">
    METAMINE — Sweep the Field. Collapse the Cube.
  </text>
  
  ${cells.join('')}
  
  <text x="${svgWidth/2}" y="${svgHeight - 50}" text-anchor="middle" 
        font-family="monospace" font-size="10" fill="${COLORS.seal}">
    SEAL: ${seal.hash}
  </text>
  <text x="${svgWidth/2}" y="${svgHeight - 30}" text-anchor="middle" 
        font-family="monospace" font-size="10" fill="${COLORS.text}">
    Steps: ${state.steps} | Stack: [${state.stack.join(', ')}] | Output: ${state.output || '(none)'}
  </text>
</svg>`;
}

export function renderExecutionTrace(result) {
  const { state, seal } = result;
  const lines = [];

  lines.push('\x1b[38;2;255;215;0m');
  lines.push('═══════════════════════════════════════════════════');
  lines.push('  EXECUTION TRACE');
  lines.push('═══════════════════════════════════════════════════');
  lines.push('\x1b[0m');

  for (const t of state.trace) {
    const step = String(t.step).padStart(4, '0');
    const op = t.op.padEnd(8);
    const pos = `(${t.x},${t.y})`.padEnd(8);
    const stack = `[${t.stack.slice(-3).join(',')}]`;

    let color = '\x1b[37m';
    if (t.op === 'RUPTURE') color = '\x1b[31m';
    else if (t.op === 'SEAL') color = '\x1b[32m';
    else if (t.op === 'ECHO') color = '\x1b[36m';
    else if (t.op === 'GATE') color = '\x1b[33m';

    lines.push(`${color}  ${step} ${op} ${pos} ${stack}\x1b[0m`);
  }

  lines.push('');
  lines.push(`\x1b[38;2;68;255;68mTotal steps: ${state.steps}\x1b[0m`);
  lines.push(`\x1b[38;2;68;255;68mRuptures: ${state.ruptures.length}\x1b[0m`);

  return lines.join('\n');
}
