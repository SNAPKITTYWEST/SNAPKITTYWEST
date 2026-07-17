# METAMINE — Technical Documentation

> **A 2D esolang where every program is a minefield, every path is a proof, and every detonation mutates the canvas.**

---

## Architecture

```
METAMINE Board
     ↓
Curator (execution engine)
     ↓
Cell Reveals
     ↓
Mine Rupture
     ↓
Symbols Detach from Grid
     ↓
Canvas/SVG Animation
     ↓
Final WORM Seal
```

---

## Core Modules

| File | Purpose |
|------|---------|
| `curator.mjs` | Core execution engine |
| `metatron-grid.mjs` | Grid parsing & mine adjacency |
| `glitch-renderer.mjs` | ANSI + SVG output |
| `code-art.mjs` | Visual art generator |
| `seal.mjs` | SHA-256 WORM trace seal |
| `cli.mjs` | CLI entry point |

---

## Instruction Set

### Core Operations

| Symbol | Name | Stack Effect | Description |
|--------|------|--------------|-------------|
| `0` | VOID | `( -- )` | No operation |
| `1` | SEED | `( -- a )` | Push resonance value |
| `2` | DROP | `( a -- )` | Pop stack |
| `3` | FUSE | `( a b -- a+b )` | Add |
| `4` | CUT | `( a b -- b-a )` | Subtract |
| `5` | FORGE | `( a b -- a*b )` | Multiply |
| `6` | ECHO | `( a -- )` | Output as character |
| `7` | LISTEN | `( -- a )` | Input character |
| `8` | GATE | `( -- )` | Jump to nearest mine |

### Semantic Operations

| Symbol | Name | Description |
|--------|------|-------------|
| `☉` | ORIGIN | Starting point of excavation |
| `◇` | RESONANCE | Amplifies stack top by golden ratio (φ) |
| `△` | TRANSFORM | Rotates stack (a b c → b c a) |
| `⬡` | MEMORY | Stores stack top in cell memory |
| `⌹` | REDUCTION | Collapses stack to sum |
| `○` | PORTAL | Teleports to matching portal |
| `M` | RUPTURE | Mine detonation, conditional branch |
| `Ω` | SEAL | Finalize and hash execution |

---

## Resonance Values

Each cell computes a resonance value based on adjacent mines:

```
resonance(cell) = count adjacent mines
```

The SEED instruction (`1`) pushes this value to the stack.

---

## Rupture Mechanics

When `M` is encountered:
1. Peek at stack top
2. If stack top ≠ 0, detonate
3. Detonation reveals all adjacent cells
4. Creates visual artifact (glitch effect)

---

## Portal Mechanics

When `○` is encountered:
1. Find current portal position
2. Find next portal in sequence
3. Teleport cursor to next portal

---

## WORM Seal

Every execution is sealed with SHA-256:

```
hash = SHA-256("METAMINE|" + trace + "|" + output)
```

The seal is deterministic and tamper-proof.

---

## Usage

### CLI

```bash
# Basic execution
node cli.mjs examples/gallery-1-hello.meta

# Generate SVG
node cli.mjs examples/gallery-3-resonance.meta --art sacred --svg sacred.svg

# Show trace
node cli.mjs examples/gallery-2-chaos.meta --trace

# Debug mode
node cli.mjs examples/gallery-4-fracture.meta --debug
```

### API

```javascript
import { runMetamine } from './curator.mjs';
import { renderANSI, renderSVG } from './glitch-renderer.mjs';
import { generateSacredGeometry } from './code-art.mjs';
import { formatSeal } from './seal.mjs';

const source = `
☉ 1 3 5 6 0
0 M 0 ◇ 0 8
1 5 △ 0 M 6
0 0 2 4 0 Ω
`;

const result = runMetamine(source);

// ANSI output
console.log(renderANSI(result));

// SVG output
const svg = generateSacredGeometry(result);

// Seal
console.log(formatSeal(result.seal));
```

---

## Gallery

| Exhibit | Description |
|---------|-------------|
| Gallery 1 | Hello World |
| Gallery 2 | Chaos |
| Gallery 3 | Resonance |
| Gallery 4 | Fracture |
| Gallery 5 | Metatron |
| Gallery 6 | Live Coding |

---

## Art Modes

| Mode | Description |
|------|-------------|
| `sacred` | Metatron's Cube with golden connections |
| `glitch` | Grid pixels with scan lines and noise |
| `pixel` | Color-coded cells with execution trace |

---

## ERRANT Connection

METAMINE connects to ERRANT LFIS:

```
METAMINE symbols → ERRANT opcodes → MAGMACORE verbs
```

See `errant/` for the Linear Forth Instruction Set.

---

## Genesis

```prolog
valid_errant_image(Program) :-
    check_program(Program, [], omega).
```

> An image is valid only if every linear resource is consumed,  
> every capability is authorized, and the final state is sealed.

---

## Files

```
metamine/
├── curator.mjs          # Core execution engine
├── metatron-grid.mjs    # Grid parser
├── glitch-renderer.mjs  # ANSI + SVG output
├── code-art.mjs         # Visual art generator
├── seal.mjs             # WORM seal
├── cli.mjs              # CLI entry point
├── index.html           # Interactive museum
├── README.md            # Emotional docs
├── TECHNICAL.md         # This file
└── examples/
    ├── gallery-1-hello.meta
    ├── gallery-2-chaos.meta
    ├── gallery-3-resonance.meta
    ├── gallery-4-fracture.meta
    ├── gallery-5-metatron.meta
    └── gallery-6-live.meta
```

---

> **Programs are not executed. They are excavated.**
