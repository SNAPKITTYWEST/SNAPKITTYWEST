// code-art.mjs — METAMINE Code Art Generator
// Turns execution traces into visual glitch art

import { createHash } from 'crypto';

const GOLD = '#FFD700';
const DARK_GOLD = '#B8860B';
const BLACK = '#0A0A0A';
const RUPTURE = '#FF4444';
const SEAL = '#44FF44';
const VOID = '#1A1A1A';

export function generateSacredGeometry(result, size = 800) {
  const { state, grid, width, height, seal } = result;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.4;

  const circles = [];
  const lines = [];
  const nodes = [];

  // Metatron's Cube structure
  const metatronPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const x = cx + Math.cos(angle) * maxRadius * 0.6;
    const y = cy + Math.sin(angle) * maxRadius * 0.6;
    metatronPoints.push({ x, y });

    // Inner hexagon
    const ix = cx + Math.cos(angle) * maxRadius * 0.3;
    const iy = cy + Math.sin(angle) * maxRadius * 0.3;
    metatronPoints.push({ x: ix, y: iy });
  }
  metatronPoints.push({ x: cx, y: cy });

  // Draw connections
  for (let i = 0; i < metatronPoints.length; i++) {
    for (let j = i + 1; j < metatronPoints.length; j++) {
      const p1 = metatronPoints[i];
      const p2 = metatronPoints[j];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (dist < maxRadius * 0.8) {
        lines.push({
          x1: p1.x, y1: p1.y,
          x2: p2.x, y2: p2.y,
          opacity: 0.1 + (state.trace.length % 10) * 0.02,
        });
      }
    }
  }

  // Draw circles
  for (const p of metatronPoints) {
    circles.push({
      cx: p.x, cy: p.y,
      r: 8 + (state.trace.length % 5) * 2,
      fill: GOLD,
      opacity: 0.6,
    });
  }

  // Map trace to nodes
  for (const t of state.trace) {
    const angle = (Math.PI * 2 * t.step) / Math.max(state.trace.length, 1);
    const radius = 50 + (t.stack.length * 20);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    let color = GOLD;
    if (t.op === 'RUPTURE') color = RUPTURE;
    else if (t.op === 'SEAL') color = SEAL;
    else if (t.op === 'ECHO') color = '#FF69B4';

    nodes.push({ x, y, color, char: t.op[0], step: t.step });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#1A1A1A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0A0A0A;stop-opacity:1" />
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${2 + state.ruptures.length}"/>
    </filter>
  </defs>
  
  <rect width="100%" height="100%" fill="url(#bgGrad)"/>
  
  <!-- Sacred geometry lines -->
  ${lines.map(l => `
    <line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" 
          stroke="${GOLD}" stroke-width="0.5" opacity="${l.opacity}"/>
  `).join('')}
  
  <!-- Metatron circles -->
  ${circles.map(c => `
    <circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" 
            fill="${c.fill}" opacity="${c.opacity}" filter="url(#glow)"/>
  `).join('')}
  
  <!-- Execution trace nodes -->
  ${nodes.map(n => `
    <text x="${n.x}" y="${n.y}" text-anchor="middle" 
          font-family="monospace" font-size="10" fill="${n.color}" filter="url(#noise)">
      ${n.char}
    </text>
  `).join('')}
  
  <!-- Center seal -->
  <circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="${SEAL}" stroke-width="2" opacity="0.8"/>
  <text x="${cx}" y="${cy + 4}" text-anchor="middle" 
        font-family="monospace" font-size="12" fill="${SEAL}">
    ${seal.hash.slice(0, 6)}
  </text>
  
  <!-- Title -->
  <text x="${size/2}" y="30" text-anchor="middle" 
        font-family="monospace" font-size="14" fill="${GOLD}" opacity="0.8">
    METAMINE — Sacred Geometry
  </text>
  
  <!-- Seal hash -->
  <text x="${size/2}" y="${size - 20}" text-anchor="middle" 
        font-family="monospace" font-size="8" fill="${DARK_GOLD}" opacity="0.6">
    ${seal.hash}
  </text>
</svg>`;
}

export function generateGlitchArt(result, size = 800) {
  const { state, grid, width, height, seal } = result;
  const cellSize = size / Math.max(width, height);

  const pixels = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      const px = x * cellSize;
      const py = y * cellSize;

      // Base color from resonance
      const resonance = cell.resonance;
      const hue = (resonance * 40 + state.steps * 2) % 360;
      const saturation = cell.symbol === 'M' ? 100 : 60;
      const lightness = 20 + resonance * 5;

      let color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

      // Glitch effect for ruptures
      const isRupture = state.ruptures.some(r => r.x === x && r.y === y);
      if (isRupture) {
        const glitchOffset = Math.random() * 10 - 5;
        pixels.push(`
          <rect x="${px + glitchOffset}" y="${py}" 
                width="${cellSize}" height="${cellSize}"
                fill="${RUPTURE}" opacity="0.8" filter="url(#noise)"/>`);
        pixels.push(`
          <rect x="${px - glitchOffset}" y="${py + glitchOffset}" 
                width="${cellSize}" height="${cellSize}"
                fill="${GOLD}" opacity="0.3"/>`);
      }

      // Cell pixel
      pixels.push(`
        <rect x="${px}" y="${py}" 
              width="${cellSize - 1}" height="${cellSize - 1}"
              fill="${color}" stroke="${BLACK}" stroke-width="0.5"/>`);

      // Symbol overlay
      if (cell.revealed) {
        pixels.push(`
          <text x="${px + cellSize/2}" y="${py + cellSize/2 + 3}" 
                text-anchor="middle" font-family="monospace" 
                font-size="${cellSize * 0.4}" fill="${GOLD}" opacity="0.7">
            ${cell.symbol}
          </text>`);
      }
    }
  }

  // Add scan lines
  const scanLines = [];
  for (let i = 0; i < size; i += 4) {
    scanLines.push(`
      <line x1="0" y1="${i}" x2="${size}" y2="${i}" 
            stroke="${BLACK}" stroke-width="1" opacity="0.1"/>`);
  }

  // Add glitch bars
  const glitchBars = [];
  for (const rupture of state.ruptures) {
    const barY = rupture.y * cellSize;
    const barHeight = 5 + rupture.power * 3;
    glitchBars.push(`
      <rect x="0" y="${barY}" width="${size}" height="${barHeight}"
            fill="${RUPTURE}" opacity="0.4" filter="url(#noise)"/>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  
  <rect width="100%" height="100%" fill="${BLACK}"/>
  
  <!-- Grid pixels -->
  ${pixels.join('')}
  
  <!-- Scan lines -->
  ${scanLines.join('')}
  
  <!-- Glitch bars -->
  ${glitchBars.join('')}
  
  <!-- Title -->
  <text x="${size/2}" y="25" text-anchor="middle" 
        font-family="monospace" font-size="12" fill="${GOLD}" opacity="0.8">
    METAMINE — Glitch Art
  </text>
  
  <!-- Seal -->
  <text x="${size/2}" y="${size - 15}" text-anchor="middle" 
        font-family="monospace" font-size="8" fill="${SEAL}" opacity="0.6">
    ${seal.hash}
  </text>
</svg>`;
}

export function generatePixelArt(result, size = 800) {
  const { state, grid, width, height, seal } = result;
  const pixelSize = Math.floor(size / Math.max(width, height));
  const artWidth = width * pixelSize;
  const artHeight = height * pixelSize;

  const pixels = [];

  // Create pixel grid based on execution trace
  const colorMap = {
    '0': '#1A1A1A',
    '1': '#FFD700',
    '2': '#B8860B',
    '3': '#FF69B4',
    '4': '#44FF44',
    '5': '#4444FF',
    '6': '#FF4444',
    '7': '#44FFFF',
    '8': '#FFFF44',
    'M': '#FF0000',
    'Ω': '#00FF00',
    '☉': '#FFD700',
    '◇': '#FF69B4',
    '△': '#44FFFF',
    '⬡': '#FFFF44',
    '⌹': '#FF4444',
    '○': '#4444FF',
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      const px = x * pixelSize;
      const py = y * pixelSize;

      let color = colorMap[cell.symbol] || '#333333';

      // Glitch effect
      if (cell.revealed) {
        const glitch = Math.random() * 0.2;
        if (glitch > 0.1) {
          color = RUPTURE;
        }
      }

      // Rupture explosion
      const isRupture = state.ruptures.some(r => r.x === x && r.y === y);
      if (isRupture) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              pixels.push(`
                <rect x="${nx * pixelSize}" y="${ny * pixelSize}" 
                      width="${pixelSize}" height="${pixelSize}"
                      fill="${RUPTURE}" opacity="${0.5 - Math.abs(dx) * 0.15 - Math.abs(dy) * 0.15}"/>`);
            }
          }
        }
      }

      pixels.push(`
        <rect x="${px}" y="${py}" 
              width="${pixelSize - 1}" height="${pixelSize - 1}"
              fill="${color}"/>`);
    }
  }

  // Add trace path
  const tracePath = state.trace.map((t, i) => {
    const px = t.x * pixelSize + pixelSize / 2;
    const py = t.y * pixelSize + pixelSize / 2;
    return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
  }).join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 60}" viewBox="0 0 ${size} ${size + 60}">
  <defs>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2"/>
    </filter>
  </defs>
  
  <rect width="100%" height="100%" fill="${BLACK}"/>
  
  <!-- Pixel grid -->
  ${pixels.join('')}
  
  <!-- Execution trace path -->
  <path d="${tracePath}" fill="none" stroke="${GOLD}" stroke-width="2" 
        opacity="0.4" filter="url(#noise)"/>
  
  <!-- Title -->
  <text x="${size/2}" y="${artHeight + 25}" text-anchor="middle" 
        font-family="monospace" font-size="14" fill="${GOLD}">
    METAMINE — Pixel Art
  </text>
  
  <!-- Seal -->
  <text x="${size/2}" y="${artHeight + 45}" text-anchor="middle" 
        font-family="monospace" font-size="8" fill="${SEAL}" opacity="0.6">
    ${seal.hash}
  </text>
</svg>`;
}

export function generateTerminalArt(result) {
  const { state, grid, width, height, seal } = result;
  const lines = [];

  lines.push('\x1b[38;2;255;215;0m');
  lines.push('╔══════════════════════════════════════════════════════════╗');
  lines.push('║  METAMINE — CODE ART                                    ║');
  lines.push('╚══════════════════════════════════════════════════════════╝');
  lines.push('\x1b[0m');

  // Draw ASCII art grid
  for (let y = 0; y < height; y++) {
    let line = '';
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      const isRupture = state.ruptures.some(r => r.x === x && r.y === y);

      if (isRupture) {
        line += `\x1b[41m\x1b[97m${cell.symbol}\x1b[0m`;
      } else if (cell.revealed) {
        if (cell.symbol === 'M') {
          line += `\x1b[91m${cell.symbol}\x1b[0m`;
        } else {
          line += `\x1b[38;2;184;134;11m${cell.symbol}\x1b[0m`;
        }
      } else {
        // Color based on resonance
        const r = cell.resonance;
        const colorCode = r === 0 ? '90' : r <= 2 ? '33' : r <= 4 ? '31' : '35';
        line += `\x1b[${colorCode}m${cell.symbol}\x1b[0m`;
      }
    }
    lines.push(line);
  }

  lines.push('');

  // Draw execution trace as ASCII art
  lines.push('\x1b[38;2;255;215;0m');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  EXECUTION TRACE — ASCII ART');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('\x1b[0m');

  // Create trace visualization
  const traceWidth = 60;
  const traceHeight = 20;
  const traceGrid = Array.from({ length: traceHeight }, () => 
    Array(traceWidth).fill(' '));

  for (const t of state.trace) {
    const x = Math.floor((t.step / Math.max(state.trace.length, 1)) * (traceWidth - 1));
    const y = Math.floor((t.stack.length / 10) * (traceHeight - 1));
    if (x >= 0 && x < traceWidth && y >= 0 && y < traceHeight) {
      let char = '·';
      if (t.op === 'RUPTURE') char = '█';
      else if (t.op === 'SEAL') char = '▓';
      else if (t.op === 'ECHO') char = '░';
      else if (t.op === 'GATE') char = '◆';
      traceGrid[y][x] = char;
    }
  }

  for (const row of traceGrid) {
    lines.push('  ' + row.join(''));
  }

  lines.push('');
  lines.push(`\x1b[38;2;68;255;68mSEAL: ${seal.hash}\x1b[0m`);

  return lines.join('\n');
}
