// ════════════════════════════════════════════════════════════════
// ERRANT LFIS v0.1 — Linear Forth Instruction Set
// ════════════════════════════════════════════════════════════════
//
// ERRANT = Metal + Logic + Effect
// LFIS   = the verified stack target
//
// Core value modes:
//   lin   = must be consumed exactly once
//   aff   = may be consumed at most once
//   un    = may be copied/reused
//   cap   = authority token
//   seal  = finalized WORM artifact
//
// ════════════════════════════════════════════════════════════════

export const MODES = {
  LIN: 'lin',   // must be consumed exactly once
  AFF: 'aff',   // may be consumed at most once
  UN: 'un',     // may be copied/reused
  CAP: 'cap',   // authority token
  SEAL: 'seal', // finalized WORM artifact
};

export const OPCODES = {
  // ════════════════════════════════════════════════════════════════
  // STACK OPERATIONS
  // ════════════════════════════════════════════════════════════════

  NOP: 0x00,
  // ( -- )

  PUSH_UN: 0x01,
  // ( -- un a )

  PUSH_LIN: 0x02,
  // ( -- lin a )

  MOVE: 0x03,
  // ( lin a -- lin a )

  DROP_AFF: 0x04,
  // ( aff a -- )

  DUP_UN: 0x05,
  // ( un a -- un a ⊗ un a )

  SWAP: 0x06,
  // ( lin a ⊗ lin b -- lin b ⊗ lin a )

  PAIR: 0x07,
  // ( lin a ⊗ lin b -- lin pair(a,b) )

  UNPAIR: 0x08,
  // ( lin pair(a,b) -- lin a ⊗ lin b )

  // ════════════════════════════════════════════════════════════════
  // CONTROL FLOW
  // ════════════════════════════════════════════════════════════════

  APPLY: 0x09,
  // ( lin (a ⊸ b) ⊗ lin a -- lin b )

  CALL: 0x0A,
  // ( lin frame -- lin result )

  RETURN: 0x0B,
  // ( lin result -- )

  BRANCH: 0x0C,
  // ( lin bool ⊗ lin left ⊗ lin right -- lin result )

  FAIL: 0x0D,
  // ( lin error -- )

  // ════════════════════════════════════════════════════════════════
  // CRYPTOGRAPHIC OPERATIONS
  // ════════════════════════════════════════════════════════════════

  SEAL: 0x10,
  // ( lin cap(seal) ⊗ lin data -- lin sealed(data) )

  ATTEST: 0x11,
  // ( lin cap(attest) ⊗ lin sealed(data) -- lin attestation )

  HASH: 0x12,
  // ( lin data -- lin hash )

  SIGN: 0x13,
  // ( lin cap(sign) ⊗ lin hash -- lin signature )

  VERIFY: 0x14,
  // ( un pubkey ⊗ lin signature ⊗ lin hash -- lin bool )

  // ════════════════════════════════════════════════════════════════
  // AGENT OPERATIONS
  // ════════════════════════════════════════════════════════════════

  SPAWN: 0x20,
  // ( lin cap(spawn) ⊗ lin agent_spec -- lin pid )

  SEND: 0x21,
  // ( lin cap(send) ⊗ lin pid ⊗ lin msg -- lin receipt )

  RECV: 0x22,
  // ( lin cap(recv) ⊗ lin channel -- lin msg )

  HALT: 0x23,
  // ( lin sealed(final) -- Ω )
};

// ════════════════════════════════════════════════════════════════
// FORBIDDEN OPERATIONS (type violations)
// ════════════════════════════════════════════════════════════════
//
// DUP lin a      ❌ illegal
// DROP lin a     ❌ illegal
// COPY cap       ❌ illegal
// SEAL without cap(seal) ❌ illegal
// EXECUTE unverified frame ❌ illegal
//
// ════════════════════════════════════════════════════════════════

export const FORBIDDEN = [
  { op: 'DUP', mode: 'lin', note: 'DUP lin a is illegal' },
  { op: 'DROP', mode: 'lin', note: 'DROP lin a is illegal' },
  { op: 'COPY', mode: 'cap', note: 'COPY cap is illegal' },
  { op: 'SEAL', note: 'SEAL without cap(seal) is illegal' },
  { op: 'EXECUTE', note: 'EXECUTE unverified frame is illegal' },
];

// ════════════════════════════════════════════════════════════════
// OPCODE NAMES (for disassembly)
// ════════════════════════════════════════════════════════════════

export const OPCODE_NAMES = {};
for (const [name, code] of Object.entries(OPCODES)) {
  OPCODE_NAMES[code] = name;
}

// ════════════════════════════════════════════════════════════════
// OPCODE METADATA
// ════════════════════════════════════════════════════════════════

export const OPCODE_INFO = {
  [OPCODES.NOP]: {
    name: 'NOP',
    stack: '( -- )',
    mode: null,
    description: 'No operation',
  },
  [OPCODES.PUSH_UN]: {
    name: 'PUSH_UN',
    stack: '( -- un a )',
    mode: 'un',
    description: 'Push unrestricted value',
  },
  [OPCODES.PUSH_LIN]: {
    name: 'PUSH_LIN',
    stack: '( -- lin a )',
    mode: 'lin',
    description: 'Push linear value',
  },
  [OPCODES.MOVE]: {
    name: 'MOVE',
    stack: '( lin a -- lin a )',
    mode: 'lin',
    description: 'Move linear value (identity)',
  },
  [OPCODES.DROP_AFF]: {
    name: 'DROP_AFF',
    stack: '( aff a -- )',
    mode: 'aff',
    description: 'Drop affine value',
  },
  [OPCODES.DUP_UN]: {
    name: 'DUP_UN',
    stack: '( un a -- un a ⊗ un a )',
    mode: 'un',
    description: 'Duplicate unrestricted value',
  },
  [OPCODES.SWAP]: {
    name: 'SWAP',
    stack: '( lin a ⊗ lin b -- lin b ⊗ lin a )',
    mode: 'lin',
    description: 'Swap top two linear values',
  },
  [OPCODES.PAIR]: {
    name: 'PAIR',
    stack: '( lin a ⊗ lin b -- lin pair(a,b) )',
    mode: 'lin',
    description: 'Pair two linear values',
  },
  [OPCODES.UNPAIR]: {
    name: 'UNPAIR',
    stack: '( lin pair(a,b) -- lin a ⊗ lin b )',
    mode: 'lin',
    description: 'Unpair linear pair',
  },
  [OPCODES.APPLY]: {
    name: 'APPLY',
    stack: '( lin (a ⊸ b) ⊗ lin a -- lin b )',
    mode: 'lin',
    description: 'Apply linear function',
  },
  [OPCODES.CALL]: {
    name: 'CALL',
    stack: '( lin frame -- lin result )',
    mode: 'lin',
    description: 'Call function frame',
  },
  [OPCODES.RETURN]: {
    name: 'RETURN',
    stack: '( lin result -- )',
    mode: 'lin',
    description: 'Return from call',
  },
  [OPCODES.BRANCH]: {
    name: 'BRANCH',
    stack: '( lin bool ⊗ lin left ⊗ lin right -- lin result )',
    mode: 'lin',
    description: 'Conditional branch',
  },
  [OPCODES.FAIL]: {
    name: 'FAIL',
    stack: '( lin error -- )',
    mode: 'lin',
    description: 'Fail with error',
  },
  [OPCODES.SEAL]: {
    name: 'SEAL',
    stack: '( lin cap(seal) ⊗ lin data -- lin sealed(data) )',
    mode: 'lin',
    description: 'Seal data with WORM artifact',
  },
  [OPCODES.ATTEST]: {
    name: 'ATTEST',
    stack: '( lin cap(attest) ⊗ lin sealed(data) -- lin attestation )',
    mode: 'lin',
    description: 'Attest sealed data',
  },
  [OPCODES.HASH]: {
    name: 'HASH',
    stack: '( lin data -- lin hash )',
    mode: 'lin',
    description: 'Hash data',
  },
  [OPCODES.SIGN]: {
    name: 'SIGN',
    stack: '( lin cap(sign) ⊗ lin hash -- lin signature )',
    mode: 'lin',
    description: 'Sign hash with capability',
  },
  [OPCODES.VERIFY]: {
    name: 'VERIFY',
    stack: '( un pubkey ⊗ lin signature ⊗ lin hash -- lin bool )',
    mode: 'lin',
    description: 'Verify signature',
  },
  [OPCODES.SPAWN]: {
    name: 'SPAWN',
    stack: '( lin cap(spawn) ⊗ lin agent_spec -- lin pid )',
    mode: 'lin',
    description: 'Spawn agent process',
  },
  [OPCODES.SEND]: {
    name: 'SEND',
    stack: '( lin cap(send) ⊗ lin pid ⊗ lin msg -- lin receipt )',
    mode: 'lin',
    description: 'Send message to agent',
  },
  [OPCODES.RECV]: {
    name: 'RECV',
    stack: '( lin cap(recv) ⊗ lin channel -- lin msg )',
    mode: 'lin',
    description: 'Receive message from channel',
  },
  [OPCODES.HALT]: {
    name: 'HALT',
    stack: '( lin sealed(final) -- Ω )',
    mode: 'lin',
    description: 'Halt with sealed final artifact',
  },
};
