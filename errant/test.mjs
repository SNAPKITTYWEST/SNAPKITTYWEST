import { runErrant, disassemble, createImage } from './interpreter.mjs';
import { OPCODES } from './opcodes.mjs';

// Simple program: push, seal, halt
const code = [
  OPCODES.PUSH_UN,    // Push unrestricted value
  OPCODES.PUSH_LIN,   // Push linear data
  OPCODES.SEAL,       // Seal with capability
  OPCODES.HALT,       // Halt
];

console.log('ERRANT LFIS v0.1 — Test');
console.log('========================\n');

const result = runErrant(code);

console.log('Disassembly:');
result.disassembly.forEach(line => {
  console.log('  ' + line.pc.toString(16).padStart(2, '0') + ' ' + line.name + ' ' + line.stack);
});

console.log('\nSealed:', result.vm.sealed);
console.log('\nImage Magic:', result.image.magic);
console.log('Image Version:', result.image.version);
console.log('Image Seal:', result.image.seal);
console.log('\nGenesis: ERRANT_GENESIS_001');
console.log('  Forth is the metal.');
console.log('  Prolog is the law.');
console.log('  Linear types are the vow.');
console.log('  WORM is the memory.');
console.log('  Ω');
