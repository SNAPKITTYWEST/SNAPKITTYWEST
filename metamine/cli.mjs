#!/usr/bin/env node
// cli.mjs — METAMINE CLI Entry Point (Curator)
// Programs are not executed. They are excavated.
// Usage: node cli.mjs <file.meta> [--svg output.svg] [--trace] [--debug] [--art sacred|glitch|pixel]

import { readFileSync, writeFileSync } from 'fs';
import { runMetamine } from './curator.mjs';
import { renderANSI, renderSVG, renderExecutionTrace } from './glitch-renderer.mjs';
import { generateSacredGeometry, generateGlitchArt, generatePixelArt, generateTerminalArt } from './code-art.mjs';
import { formatSeal } from './seal.mjs';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  METAMINE — Programs are not executed.                  ║
║            They are excavated.                          ║
╚══════════════════════════════════════════════════════════╝

Usage: metamine <file.meta> [options]

Options:
  --svg <file>       Output SVG to file
  --art <type>       Generate code art (sacred|glitch|pixel)
  --trace            Show execution trace
  --debug            Show excavation process
  --help, -h         Show this help

Art Types:
  sacred             Sacred geometry (Metatron's Cube)
  glitch             Glitch art with scan lines and noise
  pixel              Pixel art with execution trace

Symbols:
  ☉ ORIGIN           Starting point of excavation
  ◇ RESONANCE        Amplifies stack top by golden ratio
  △ TRANSFORM        Rotates stack (a b c → b c a)
  ⬡ MEMORY           Stores stack top in cell memory
  ⌹ REDUCTION        Collapses stack to sum
  ○ PORTAL           Teleports to matching portal
  M RUPTURE          Mine detonation, conditional branch
  Ω SEAL             Finalize and hash execution

Gallery:
  Gallery 1          Hello World
  Gallery 2          Chaos
  Gallery 3          Resonance
  Gallery 4          Fracture
  Gallery 5          Metatron
  Gallery 6          Live Coding

Examples:
  metamine examples/gallery-1-hello.meta
  metamine examples/gallery-3-resonance.meta --art sacred --svg sacred.svg
  metamine examples/gallery-2-chaos.meta --art glitch --svg glitch.svg
`);
  process.exit(0);
}

const file = args[0];
const svgOutput = args.includes('--svg') ? args[args.indexOf('--svg') + 1] : null;
const artType = args.includes('--art') ? args[args.indexOf('--art') + 1] : null;
const showTrace = args.includes('--trace');
const debug = args.includes('--debug');

try {
  const source = readFileSync(file, 'utf8');
  const result = runMetamine(source, { debug });

  if (artType) {
    // Generate code art
    let artSvg;
    switch (artType) {
      case 'sacred':
        artSvg = generateSacredGeometry(result);
        break;
      case 'glitch':
        artSvg = generateGlitchArt(result);
        break;
      case 'pixel':
        artSvg = generatePixelArt(result);
        break;
      default:
        console.error(`\x1b[31mUnknown art type: ${artType}\x1b[0m`);
        console.error('Available types: sacred, glitch, pixel');
        process.exit(1);
    }
    
    console.log(generateTerminalArt(result));
    
    if (svgOutput) {
      writeFileSync(svgOutput, artSvg);
      console.log(`\n✓ ${artType} art written to ${svgOutput}`);
    }
  } else {
    // Standard output
    console.log(renderANSI(result));
    
    if (showTrace) {
      console.log(renderExecutionTrace(result));
    }
    
    if (svgOutput) {
      writeFileSync(svgOutput, renderSVG(result));
      console.log(`\n✓ SVG written to ${svgOutput}`);
    }
  }

  console.log(formatSeal(result.seal));
} catch (err) {
  console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
  process.exit(1);
}
