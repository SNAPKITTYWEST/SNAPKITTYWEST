# ERRANT LFIS v0.1

**Linear Forth Instruction Set**

> **ERRANT = Metal + Logic + Effect**  
> **LFIS = the verified stack target**

---

## Core Value Modes

| Mode | Symbol | Description |
|------|--------|-------------|
| `lin` | ⊸ | Must be consumed exactly once |
| `aff` | ⊸? | May be consumed at most once |
| `un` | ∞ | May be copied/reused |
| `cap` | ⚿ | Authority token |
| `seal` | 🔒 | Finalized WORM artifact |

---

## The Question

Regular Forth lets you do anything.

Errant asks:

**Do you have the resource, the proof, and the right to consume it?**

---

## LFIS Opcode Table

### Stack Operations

| Opcode | Name | Stack Effect | Description |
|--------|------|--------------|-------------|
| `0x00` | NOP | `( -- )` | No operation |
| `0x01` | PUSH_UN | `( -- un a )` | Push unrestricted value |
| `0x02` | PUSH_LIN | `( -- lin a )` | Push linear value |
| `0x03` | MOVE | `( lin a -- lin a )` | Move linear value |
| `0x04` | DROP_AFF | `( aff a -- )` | Drop affine value |
| `0x05` | DUP_UN | `( un a -- un a ⊗ un a )` | Duplicate unrestricted |
| `0x06` | SWAP | `( lin a ⊗ lin b -- lin b ⊗ lin a )` | Swap top two |
| `0x07` | PAIR | `( lin a ⊗ lin b -- lin pair(a,b) )` | Pair two values |
| `0x08` | UNPAIR | `( lin pair(a,b) -- lin a ⊗ lin b )` | Unpair |

### Control Flow

| Opcode | Name | Stack Effect | Description |
|--------|------|--------------|-------------|
| `0x09` | APPLY | `( lin (a ⊸ b) ⊗ lin a -- lin b )` | Apply function |
| `0x0A` | CALL | `( lin frame -- lin result )` | Call frame |
| `0x0B` | RETURN | `( lin result -- )` | Return |
| `0x0C` | BRANCH | `( lin bool ⊗ lin left ⊗ lin right -- lin result )` | Conditional |
| `0x0D` | FAIL | `( lin error -- )` | Fail with error |

### Cryptographic Operations

| Opcode | Name | Stack Effect | Description |
|--------|------|--------------|-------------|
| `0x10` | SEAL | `( lin cap(seal) ⊗ lin data -- lin sealed(data) )` | WORM seal |
| `0x11` | ATTEST | `( lin cap(attest) ⊗ lin sealed(data) -- lin attestation )` | Attest |
| `0x12` | HASH | `( lin data -- lin hash )` | SHA-256 hash |
| `0x13` | SIGN | `( lin cap(sign) ⊗ lin hash -- lin signature )` | Sign hash |
| `0x14` | VERIFY | `( un pubkey ⊗ lin signature ⊗ lin hash -- lin bool )` | Verify |

### Agent Operations

| Opcode | Name | Stack Effect | Description |
|--------|------|--------------|-------------|
| `0x20` | SPAWN | `( lin cap(spawn) ⊗ lin agent_spec -- lin pid )` | Spawn agent |
| `0x21` | SEND | `( lin cap(send) ⊗ lin pid ⊗ lin msg -- lin receipt )` | Send message |
| `0x22` | RECV | `( lin cap(recv) ⊗ lin channel -- lin msg )` | Receive |
| `0x23` | HALT | `( lin sealed(final) -- Ω )` | Halt |

---

## Forbidden Operations

```text
DUP lin a      ❌ illegal
DROP lin a     ❌ illegal
COPY cap       ❌ illegal
SEAL without cap(seal) ❌ illegal
EXECUTE unverified frame ❌ illegal
```

---

## MAGMACORE 12 Verbs

The 12 primitive verbs that form the MAGMACORE kernel:

| # | Verb | ERRANT Opcode | Description |
|---|------|---------------|-------------|
| 1 | ME | PUSH_UN | Decree — activates all |
| 2 | AN | PUSH_UN | Heaven — retrieval bias |
| 3 | KI | PUSH_UN | Earth — filtering bias |
| 4 | DINGIR | PUSH_UN | Divine — reasoning bias |
| 5 | SEAL | SEAL | Finalize — WORM |
| 6 | HASH | HASH | Digest — SHA-256 |
| 7 | SIGN | SIGN | Authorize — Ed25519 |
| 8 | VERIFY | VERIFY | Validate — proof |
| 9 | SPAWN | SPAWN | Create — agent |
| 10 | SEND | SEND | Transmit — message |
| 11 | RECV | RECV | Receive — channel |
| 12 | HALT | HALT | Terminate — Ω |

---

## Prolog Typing Kernel

```prolog
% DUP only allowed for unrestricted values
type_op(dup_un,
    [item(un, A) | S],
    [item(un, A), item(un, A) | S]).

% DROP only allowed for affine values
type_op(drop_aff,
    [item(aff, A) | S],
    S).

% SEAL requires seal capability
type_op(seal,
    [item(lin, cap(seal)), item(lin, Data) | S],
    [item(lin, sealed(Data)) | S]).

% HALT only accepts a sealed final artifact
type_op(halt,
    [item(lin, sealed(final))],
    omega).
```

---

## Genesis Invariant

```prolog
valid_errant_image(Program) :-
    check_program(Program, [], omega).
```

> An `Errant.IMG` is valid only if every linear resource is consumed,  
> every capability is authorized, and the final state is sealed.

---

## Usage

```javascript
import { runErrant, disassemble, createImage } from './interpreter.mjs';
import { OPCODES } from './opcodes.mjs';

// Simple program: push, seal, halt
const code = [
  OPCODES.PUSH_UN,    // Push unrestricted value
  OPCODES.PUSH_LIN,   // Push linear data
  OPCODES.SEAL,       // Seal with capability
  OPCODES.HALT,       // Halt
];

const result = runErrant(code);
console.log(result.vm.sealed);
```

---

## Genesis Seal Phrase

```text
ERRANT_GENESIS_001

Forth is the metal.
Prolog is the law.
Linear types are the vow.
WORM is the memory.
Ω
```

---

## Files

- `opcodes.mjs` — LFIS opcode table
- `typing.pl` — Prolog typing kernel
- `interpreter.mjs` — ERRANT VM interpreter

---

> **Forth is the metal. Prolog is the law. Linear types are the vow. WORM is the memory. Ω**
