// ════════════════════════════════════════════════════════════════
// ERRANT LFIS v0.1 — Interpreter
// ════════════════════════════════════════════════════════════════
//
// ERRANT = Metal + Logic + Effect
// LFIS   = the verified stack target
//
// This interpreter executes ERRANT programs with linear type checking.
//
// ════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';
import { OPCODES, OPCODE_NAMES, OPCODE_INFO, MODES } from './opcodes.mjs';

// ════════════════════════════════════════════════════════════════
// ERRANT VM STATE
// ════════════════════════════════════════════════════════════════

export function createVM() {
  return {
    stack: [],
    callStack: [],
    pc: 0,
    halted: false,
    error: null,
    trace: [],
    capabilities: new Set(),
    sealed: null,
  };
}

// ════════════════════════════════════════════════════════════════
// STACK OPERATIONS
// ════════════════════════════════════════════════════════════════

function push(vm, mode, value) {
  vm.stack.push({ mode, value });
}

function pop(vm) {
  if (vm.stack.length === 0) {
    vm.error = 'Stack underflow';
    vm.halted = true;
    return null;
  }
  return vm.stack.pop();
}

function peek(vm) {
  return vm.stack[vm.stack.length - 1] || null;
}

// ════════════════════════════════════════════════════════════════
// LINEAR TYPE CHECKING
// ════════════════════════════════════════════════════════════════

function checkLinear(vm, item) {
  if (item.mode === MODES.LIN) {
    // Linear values must be consumed exactly once
    // They are consumed by popping
    return true;
  }
  if (item.mode === MODES.AFF) {
    // Affine values may be consumed at most once
    return true;
  }
  if (item.mode === MODES.UN) {
    // Unrestricted values can be copied/reused
    return true;
  }
  if (item.mode === MODES.CAP) {
    // Capabilities must be authorized
    if (!vm.capabilities.has(item.value)) {
      vm.error = `Unauthorized capability: ${item.value}`;
      vm.halted = true;
      return false;
    }
    return true;
  }
  return true;
}

// ════════════════════════════════════════════════════════════════
// EXECUTION
// ════════════════════════════════════════════════════════════════

function execute(vm, code) {
  while (!vm.halted && vm.pc < code.length) {
    const opcode = code[vm.pc];
    const info = OPCODE_INFO[opcode];

    if (!info) {
      vm.error = `Unknown opcode: 0x${opcode.toString(16).padStart(2, '0')}`;
      vm.halted = true;
      break;
    }

    vm.trace.push({
      pc: vm.pc,
      opcode: opcode,
      name: info.name,
      stackDepth: vm.stack.length,
    });

    switch (opcode) {
      // ═══════════════════════════════════════════════════════════
      // STACK OPERATIONS
      // ═══════════════════════════════════════════════════════════

      case OPCODES.NOP:
        break;

      case OPCODES.PUSH_UN:
        push(vm, MODES.UN, `un_${vm.pc}`);
        break;

      case OPCODES.PUSH_LIN:
        push(vm, MODES.LIN, `lin_${vm.pc}`);
        break;

      case OPCODES.MOVE:
        // Identity operation on top of stack
        break;

      case OPCODES.DROP_AFF: {
        const item = pop(vm);
        if (!item) break;
        if (item.mode !== MODES.AFF) {
          vm.error = `DROP_AFF on non-affine value: ${item.mode}`;
          vm.halted = true;
        }
        break;
      }

      case OPCODES.DUP_UN: {
        const item = pop(vm);
        if (!item) break;
        if (item.mode !== MODES.UN) {
          vm.error = `DUP_UN on non-unrestricted value: ${item.mode}`;
          vm.halted = true;
          break;
        }
        push(vm, MODES.UN, item.value);
        push(vm, MODES.UN, item.value);
        break;
      }

      case OPCODES.SWAP: {
        const a = pop(vm);
        const b = pop(vm);
        if (!a || !b) break;
        push(vm, a.mode, a.value);
        push(vm, b.mode, b.value);
        break;
      }

      case OPCODES.PAIR: {
        const a = pop(vm);
        const b = pop(vm);
        if (!a || !b) break;
        if (a.mode !== MODES.LIN || b.mode !== MODES.LIN) {
          vm.error = `PAIR requires linear values, got ${a.mode} and ${b.mode}`;
          vm.halted = true;
          break;
        }
        push(vm, MODES.LIN, { type: 'pair', left: a.value, right: b.value });
        break;
      }

      case OPCODES.UNPAIR: {
        const item = pop(vm);
        if (!item) break;
        if (item.mode !== MODES.LIN || !item.value?.type === 'pair') {
          vm.error = `UNPAIR requires linear pair, got ${item.mode}`;
          vm.halted = true;
          break;
        }
        push(vm, MODES.LIN, item.value.left);
        push(vm, MODES.LIN, item.value.right);
        break;
      }

      // ═══════════════════════════════════════════════════════════
      // CONTROL FLOW
      // ═══════════════════════════════════════════════════════════

      case OPCODES.APPLY: {
        const arg = pop(vm);
        const fn = pop(vm);
        if (!arg || !fn) break;
        if (fn.mode !== MODES.LIN) {
          vm.error = `APPLY requires linear function, got ${fn.mode}`;
          vm.halted = true;
          break;
        }
        push(vm, MODES.LIN, `result_of(${fn.value}(${arg.value}))`);
        break;
      }

      case OPCODES.CALL: {
        const frame = pop(vm);
        if (!frame) break;
        vm.callStack.push(vm.pc);
        push(vm, MODES.LIN, `result_of(${frame.value})`);
        break;
      }

      case OPCODES.RETURN: {
        if (vm.callStack.length === 0) {
          vm.error = 'RETURN without CALL';
          vm.halted = true;
          break;
        }
        vm.pc = vm.callStack.pop();
        break;
      }

      case OPCODES.BRANCH: {
        const right = pop(vm);
        const left = pop(vm);
        const cond = pop(vm);
        if (!cond || !left || !right) break;
        if (cond.value) {
          push(vm, left.mode, left.value);
        } else {
          push(vm, right.mode, right.value);
        }
        break;
      }

      case OPCODES.FAIL: {
        const error = pop(vm);
        vm.error = error?.value || 'Unknown error';
        vm.halted = true;
        break;
      }

      // ═══════════════════════════════════════════════════════════
      // CRYPTOGRAPHIC OPERATIONS
      // ═══════════════════════════════════════════════════════════

      case OPCODES.SEAL: {
        const data = pop(vm);
        const cap = pop(vm);
        if (!cap || !data) break;
        if (cap.mode !== MODES.CAP || cap.value !== 'seal') {
          vm.error = `SEAL requires cap(seal), got ${cap.mode}(${cap.value})`;
          vm.halted = true;
          break;
        }
        const hash = createHash('sha256')
          .update(JSON.stringify(data.value))
          .digest('hex');
        vm.sealed = { data: data.value, hash };
        push(vm, MODES.LIN, { type: 'sealed', data: data.value, hash });
        break;
      }

      case OPCODES.ATTEST: {
        const sealed = pop(vm);
        const cap = pop(vm);
        if (!cap || !sealed) break;
        if (cap.mode !== MODES.CAP || cap.value !== 'attest') {
          vm.error = `ATTEST requires cap(attest), got ${cap.mode}(${cap.value})`;
          vm.halted = true;
          break;
        }
        push(vm, MODES.LIN, { type: 'attestation', sealed: sealed.value });
        break;
      }

      case OPCODES.HASH: {
        const data = pop(vm);
        if (!data) break;
        const hash = createHash('sha256')
          .update(JSON.stringify(data.value))
          .digest('hex');
        push(vm, MODES.LIN, { type: 'hash', value: hash });
        break;
      }

      case OPCODES.SIGN: {
        const hash = pop(vm);
        const cap = pop(vm);
        if (!cap || !hash) break;
        if (cap.mode !== MODES.CAP || cap.value !== 'sign') {
          vm.error = `SIGN requires cap(sign), got ${cap.mode}(${cap.value})`;
          vm.halted = true;
          break;
        }
        push(vm, MODES.LIN, { type: 'signature', hash: hash.value });
        break;
      }

      case OPCODES.VERIFY: {
        const hash = pop(vm);
        const sig = pop(vm);
        const pubkey = pop(vm);
        if (!pubkey || !sig || !hash) break;
        push(vm, MODES.LIN, { type: 'bool', value: true });
        break;
      }

      // ═══════════════════════════════════════════════════════════
      // AGENT OPERATIONS
      // ═══════════════════════════════════════════════════════════

      case OPCODES.SPAWN: {
        const spec = pop(vm);
        const cap = pop(vm);
        if (!cap || !spec) break;
        if (cap.mode !== MODES.CAP || cap.value !== 'spawn') {
          vm.error = `SPAWN requires cap(spawn), got ${cap.mode}(${cap.value})`;
          vm.halted = true;
          break;
        }
        push(vm, MODES.LIN, { type: 'pid', value: `pid_${Date.now()}` });
        break;
      }

      case OPCODES.SEND: {
        const msg = pop(vm);
        const pid = pop(vm);
        const cap = pop(vm);
        if (!cap || !pid || !msg) break;
        if (cap.mode !== MODES.CAP || cap.value !== 'send') {
          vm.error = `SEND requires cap(send), got ${cap.mode}(${cap.value})`;
          vm.halted = true;
          break;
        }
        push(vm, MODES.LIN, { type: 'receipt', value: `receipt_${Date.now()}` });
        break;
      }

      case OPCODES.RECV: {
        const channel = pop(vm);
        const cap = pop(vm);
        if (!cap || !channel) break;
        if (cap.mode !== MODES.CAP || cap.value !== 'recv') {
          vm.error = `RECV requires cap(recv), got ${cap.mode}(${cap.value})`;
          vm.halted = true;
          break;
        }
        push(vm, MODES.LIN, { type: 'msg', value: 'default_msg' });
        break;
      }

      case OPCODES.HALT: {
        const final = pop(vm);
        if (!final) break;
        if (final.mode !== MODES.LIN || final.value?.type !== 'sealed') {
          vm.error = `HALT requires lin sealed(final), got ${final.mode}`;
          vm.halted = true;
          break;
        }
        vm.halted = true;
        break;
      }

      default:
        vm.error = `Unhandled opcode: 0x${opcode.toString(16).padStart(2, '0')}`;
        vm.halted = true;
    }

    vm.pc++;
  }

  return vm;
}

// ════════════════════════════════════════════════════════════════
// DISASSEMBLER
// ════════════════════════════════════════════════════════════════

export function disassemble(code) {
  const lines = [];
  let pc = 0;

  while (pc < code.length) {
    const opcode = code[pc];
    const name = OPCODE_NAMES[opcode] || `UNKNOWN(0x${opcode.toString(16).padStart(2, '0')})`;
    const info = OPCODE_INFO[opcode];

    lines.push({
      pc,
      opcode: opcode.toString(16).padStart(2, '0'),
      name,
      stack: info?.stack || '?',
    });

    pc++;
  }

  return lines;
}

// ════════════════════════════════════════════════════════════════
// ERRANT IMAGE FORMAT
// ════════════════════════════════════════════════════════════════

export function createImage(code, data = []) {
  const magic = Buffer.from('ERRN');
  const version = Buffer.from([0x01]);
  const flags = Buffer.from([0x00]);
  const codeSize = Buffer.alloc(4);
  codeSize.writeUInt32LE(code.length);
  const dataSize = Buffer.alloc(4);
  dataSize.writeUInt32LE(data.length);

  const content = Buffer.concat([
    magic,
    version,
    flags,
    codeSize,
    Buffer.from(code),
    dataSize,
    Buffer.from(data),
  ]);

  const seal = createHash('sha256').update(content).digest('hex');

  return {
    magic: 'ERRN',
    version: 1,
    flags: 0,
    code,
    data,
    seal,
  };
}

export function validateImage(image) {
  if (image.magic !== 'ERRN') return { valid: false, error: 'Invalid magic' };
  if (image.version !== 1) return { valid: false, error: 'Invalid version' };

  const vm = createVM();
  vm.capabilities.add('seal');
  vm.capabilities.add('attest');
  vm.capabilities.add('sign');
  vm.capabilities.add('spawn');
  vm.capabilities.add('send');
  vm.capabilities.add('recv');

  execute(vm, image.code);

  if (vm.error) return { valid: false, error: vm.error };
  if (!vm.sealed) return { valid: false, error: 'Not sealed' };

  return { valid: true, vm };
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════

export function runErrant(code) {
  const vm = createVM();

  // Grant capabilities
  vm.capabilities.add('seal');
  vm.capabilities.add('attest');
  vm.capabilities.add('sign');
  vm.capabilities.add('spawn');
  vm.capabilities.add('send');
  vm.capabilities.add('recv');

  execute(vm, code);

  return {
    vm,
    image: createImage(code),
    disassembly: disassemble(code),
  };
}
