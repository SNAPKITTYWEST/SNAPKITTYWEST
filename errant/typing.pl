% ════════════════════════════════════════════════════════════════
% ERRANT LFIS v0.1 — Prolog Typing Kernel
% ════════════════════════════════════════════════════════════════
%
% ERRANT = Metal + Logic + Effect
% LFIS   = the verified stack target
%
% This kernel type-checks ERRANT programs.
% A program is valid iff every linear resource is consumed,
% every capability is authorized, and the final state is sealed.
%
% ════════════════════════════════════════════════════════════════

% mode(Type)
mode(lin).
mode(aff).
mode(un).

% stack item: item(Mode, Type)

% ════════════════════════════════════════════════════════════════
% STACK OPERATIONS
% ════════════════════════════════════════════════════════════════

% NOP — no operation
type_op(nop, Stack, Stack).

% PUSH_UN — push unrestricted value
type_op(push_un, Stack, [item(un, A) | Stack]) :-
    mode(A).

% PUSH_LIN — push linear value
type_op(push_lin, Stack, [item(lin, A) | Stack]) :-
    mode(A).

% MOVE — move linear value (identity)
type_op(move, [item(lin, A) | S], [item(lin, A) | S]).

% DROP_AFF — drop affine value
type_op(drop_aff, [item(aff, A) | S], S).

% DUP_UN — duplicate unrestricted value (ONLY allowed for un)
type_op(dup_un, [item(un, A) | S], [item(un, A), item(un, A) | S]).

% SWAP — swap top two linear values
type_op(swap, [item(M1, A), item(M2, B) | S], [item(M2, B), item(M1, A) | S]) :-
    mode(M1), mode(M2).

% PAIR — pair two linear values
type_op(pair, [item(lin, A), item(lin, B) | S], [item(lin, pair(A,B)) | S]).

% UNPAIR — unpair linear pair
type_op(unpair, [item(lin, pair(A,B)) | S], [item(lin, A), item(lin, B) | S]).

% ════════════════════════════════════════════════════════════════
% CONTROL FLOW
% ════════════════════════════════════════════════════════════════

% APPLY — apply linear function
type_op(apply, [item(lin, fn(A,B)), item(lin, A) | S], [item(lin, B) | S]).

% CALL — call function frame
type_op(call, [item(lin, frame) | S], [item(lin, result) | S]) :-
    result(result).

% RETURN — return from call
type_op(return, [item(lin, result) | S], S).

% BRANCH — conditional branch
type_op(branch, [item(lin, bool), item(lin, A), item(lin, B) | S], [item(lin, A) | S]).
type_op(branch, [item(lin, bool), item(lin, A), item(lin, B) | S], [item(lin, B) | S]).

% FAIL — fail with error
type_op(fail, [item(lin, error) | S], S).

% ════════════════════════════════════════════════════════════════
% CRYPTOGRAPHIC OPERATIONS
% ════════════════════════════════════════════════════════════════

% SEAL — seal data with WORM artifact (requires capability)
type_op(seal, [item(lin, cap(seal)), item(lin, Data) | S], [item(lin, sealed(Data)) | S]).

% ATTEST — attest sealed data (requires capability)
type_op(attest, [item(lin, cap(attest)), item(lin, sealed(Data)) | S], [item(lin, attestation) | S]).

% HASH — hash data
type_op(hash, [item(lin, data) | S], [item(lin, hash) | S]).

% SIGN — sign hash with capability
type_op(sign, [item(lin, cap(sign)), item(lin, hash) | S], [item(lin, signature) | S]).

% VERIFY — verify signature
type_op(verify, [item(un, pubkey), item(lin, signature), item(lin, hash) | S], [item(lin, bool) | S]).

% ════════════════════════════════════════════════════════════════
% AGENT OPERATIONS
% ════════════════════════════════════════════════════════════════

% SPAWN — spawn agent process (requires capability)
type_op(spawn, [item(lin, cap(spawn)), item(lin, agent_spec) | S], [item(lin, pid) | S]).

% SEND — send message to agent (requires capability)
type_op(send, [item(lin, cap(send)), item(lin, pid), item(lin, msg) | S], [item(lin, receipt) | S]).

% RECV — receive message from channel (requires capability)
type_op(recv, [item(lin, cap(recv)), item(lin, channel) | S], [item(lin, msg) | S]).

% HALT — halt with sealed final artifact
type_op(halt, [item(lin, sealed(final))], omega).

% ════════════════════════════════════════════════════════════════
% PROGRAM CHECKER
% ════════════════════════════════════════════════════════════════

check_program([], Stack, Stack).

check_program([Op | Ops], StackIn, StackOut) :-
    type_op(Op, StackIn, StackMid),
    check_program(Ops, StackMid, StackOut).

% ════════════════════════════════════════════════════════════════
% GENESIS INVARIANT
% ════════════════════════════════════════════════════════════════

valid_errant_image(Program) :-
    check_program(Program, [], omega).

% ════════════════════════════════════════════════════════════════
% MAGMACORE 12 VERBS (connected to ERRANT)
% ════════════════════════════════════════════════════════════════
%
% The 12 primitive verbs that form the MAGMACORE kernel.
% Each verb maps to ERRANT opcodes.
%
% 1. ME    = decree (activates all)
% 2. AN    = heaven (retrieval bias)
% 3. KI    = earth (filtering bias)
% 4. DINGIR = divine (reasoning bias)
% 5. SEAL  = finalize (WORM)
% 6. HASH  = digest (SHA-256)
% 7. SIGN  = authorize (Ed25519)
% 8. VERIFY = validate (proof)
% 9. SPAWN = create (agent)
% 10. SEND = transmit (message)
% 11. RECV = receive (channel)
% 12. HALT = terminate (Ω)
%
% ════════════════════════════════════════════════════════════════

% MAGMACORE verb definitions
magma_verb(me, push_un).      % ME decree — push authority
magma_verb(an, push_un).      % AN heaven — push retrieval
magma_verb(ki, push_un).      % KI earth — push filtering
magma_verb(dingir, push_un).  % DINGIR divine — push reasoning
magma_verb(seal, seal).       % SEAL — finalize with WORM
magma_verb(hash, hash).       % HASH — digest data
magma_verb(sign, sign).       % SIGN — authorize hash
magma_verb(verify, verify).   % VERIFY — validate proof
magma_verb(spawn, spawn).     % SPAWN — create agent
magma_verb(send, send).       % SEND — transmit message
magma_verb(recv, recv).       % RECV — receive channel
magma_verb(halt, halt).       % HALT — terminate (Ω)

% ════════════════════════════════════════════════════════════════
% ERRANT IMAGE FORMAT
% ════════════════════════════════════════════════════════════════
%
% An Errant.IMG is a binary format:
%
%   [MAGIC: 4 bytes] "ERRN"
%   [VERSION: 1 byte] 0x01
%   [FLAGS: 1 byte]
%   [CODE_SIZE: 4 bytes]
%   [CODE: variable]
%   [DATA_SIZE: 4 bytes]
%   [DATA: variable]
%   [SEAL: 32 bytes] SHA-256 of code+data
%
% The image is valid iff:
%   1. Every linear resource is consumed
%   2. Every capability is authorized
%   3. The final state is sealed
%   4. The seal matches the hash
%
% ════════════════════════════════════════════════════════════════

% Image format constants
errant_magic("ERRN").
errant_version(0x01).

% Image validation
valid_image(Magic, Version, Code, Data, Seal) :-
    errant_magic(Magic),
    errant_version(Version),
    check_program(Code, [], omega),
    seal_matches(Code, Data, Seal).

seal_matches(Code, Data, Seal) :-
    hash_code_data(Code, Data, Hash),
    Seal = Hash.

% ════════════════════════════════════════════════════════════════
% ERRANT GENESIS SEAL PHRASE
% ════════════════════════════════════════════════════════════════
%
% ERRANT_GENESIS_001
%
% Forth is the metal.
% Prolog is the law.
% Linear types are the vow.
% WORM is the memory.
% Ω
%
% ════════════════════════════════════════════════════════════════

genesis_seal("ERRANT_GENESIS_001").
genesis_phrase([
    "Forth is the metal.",
    "Prolog is the law.",
    "Linear types are the vow.",
    "WORM is the memory.",
    "Ω"
]).
