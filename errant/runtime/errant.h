/*
 * errant.h — ERRANT LFIS C Runtime
 * Linear Forth Instruction Set — sovereign verified stack machine
 *
 * liberrant.a is the universal FFI target for the sovereign stack:
 *   Node.js  → N-API binding (errant-node/)
 *   Python   → ctypes / cffi
 *   OCaml    → C stub (Coq-extracted sovereign_judge.ml calls verify)
 *   Haskell  → Foreign.C
 *   SWI-Prolog → NIF (for typing.pl integration)
 *
 * Value modes (QTT multiplicities):
 *   MULT_UN   ω — unrestricted: may be copied and dropped freely
 *   MULT_LIN  1 — linear: must be consumed exactly once
 *   MULT_AFF  ≤1 — affine: may be consumed at most once (drop allowed)
 *   MULT_CAP  1 — capability token: always linear, has a named authority
 *   MULT_SEAL 1 — WORM artifact: sealed, immutable, linear
 *
 * Forbidden operations (type violations — runtime rejects immediately):
 *   DUP  on MULT_LIN or MULT_CAP
 *   DROP on MULT_LIN or MULT_CAP (use DROP_AFF for affine only)
 *   SEAL without cap(seal) on stack
 *   HALT with unconsumed linear values on stack
 *
 * Ahmad Ali Parr · SnapKitty Collective · 2026
 * SEIT NGO — Sovereign Enochian Institute of Technology
 */

#ifndef ERRANT_H
#define ERRANT_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

/* MSVC does not have POSIX strcasecmp — map to _stricmp */
#ifdef _MSC_VER
#  include <string.h>
#  define strcasecmp _stricmp
#  define strncasecmp _strnicmp
#endif

#ifdef __cplusplus
extern "C" {
#endif

/* ── Version ──────────────────────────────────────────────────────────────── */

#define ERRANT_VERSION_MAJOR 1
#define ERRANT_VERSION_MINOR 0
#define ERRANT_VERSION_PATCH 0
#define ERRANT_VERSION "1.0.0"

/* ── Value modes (multiplicities) ─────────────────────────────────────────── */

typedef enum {
    MULT_UN   = 0,   /* ω  — unrestricted                                     */
    MULT_LIN  = 1,   /* 1  — linear (must consume exactly once)                */
    MULT_AFF  = 2,   /* ≤1 — affine (may drop, may not copy)                   */
    MULT_CAP  = 3,   /* 1  — capability token (always linear, named authority)  */
    MULT_SEAL = 4,   /* 1  — WORM-sealed artifact (immutable, linear)           */
} Mult;

/* ── Opcodes ──────────────────────────────────────────────────────────────── */

typedef enum {
    /* Stack */
    OP_NOP       = 0x00,   /* (  --  )                                         */
    OP_PUSH_UN   = 0x01,   /* (  -- un a )                                     */
    OP_PUSH_LIN  = 0x02,   /* (  -- lin a )                                    */
    OP_MOVE      = 0x03,   /* ( lin a -- lin a )   transfer ownership           */
    OP_DROP_AFF  = 0x04,   /* ( aff a --  )        drop affine value            */
    OP_DUP_UN    = 0x05,   /* ( un a -- un a ⊗ un a )                          */
    OP_SWAP      = 0x06,   /* ( lin a ⊗ lin b -- lin b ⊗ lin a )               */
    OP_PAIR      = 0x07,   /* ( lin a ⊗ lin b -- lin (a,b) )                   */
    OP_UNPAIR    = 0x08,   /* ( lin (a,b) -- lin a ⊗ lin b )                   */
    /* Control */
    OP_APPLY     = 0x09,   /* ( lin (a⊸b) ⊗ lin a -- lin b )                  */
    OP_CALL      = 0x0A,   /* ( lin frame -- lin result )                       */
    OP_RETURN    = 0x0B,   /* ( lin result --  )                                */
    OP_BRANCH    = 0x0C,   /* ( lin bool ⊗ lin l ⊗ lin r -- lin result )       */
    OP_FAIL      = 0x0D,   /* ( lin error --  )   raise linear error            */
    /* Crypto / WORM */
    OP_SEAL      = 0x10,   /* ( lin cap(seal) ⊗ lin data -- lin sealed(data) ) */
    OP_ATTEST    = 0x11,   /* ( lin cap(attest) ⊗ lin sealed -- lin attest )   */
    OP_HASH      = 0x12,   /* ( lin data -- lin hash )    SHA-256               */
    OP_SIGN      = 0x13,   /* ( lin cap(sign) ⊗ lin hash -- lin sig )          */
    OP_VERIFY    = 0x14,   /* ( un pubkey ⊗ lin sig ⊗ lin hash -- lin bool )   */
    /* Agent */
    OP_SPAWN     = 0x20,   /* ( lin cap(spawn) ⊗ lin spec -- lin pid )         */
    OP_SEND      = 0x21,   /* ( lin cap(send) ⊗ lin pid ⊗ lin msg -- lin rcpt) */
    OP_RECV      = 0x22,   /* ( lin cap(recv) ⊗ lin chan -- lin msg )           */
    OP_HALT      = 0x23,   /* ( lin sealed(final) -- Ω )   must be last        */
    /* METAMINE bridge ops (translated from trace by bridge.mjs) */
    OP_FUSE      = 0x30,   /* ( a b -- a+b )   ADD                              */
    OP_CUT       = 0x31,   /* ( a b -- b-a )   SUB                              */
    OP_FORGE_OP  = 0x32,   /* ( a b -- a*b )   MUL → MAGMA FORGE               */
    OP_ECHO      = 0x33,   /* ( a --  )   output char → MAGMA FLUX              */
    OP_LISTEN    = 0x34,   /* (  -- a )   input char                            */
    OP_GATE      = 0x35,   /* jump to nearest mine                               */
    OP_RUPTURE   = 0x36,   /* mine detonation → MAGMA SENTINEL                  */
    OP_ORIGIN    = 0x37,   /* excavation start                                   */
    OP_RESONANCE = 0x38,   /* φ amplify → MAGMA ORACLE                          */
    OP_TRANSFORM = 0x39,   /* stack rotate (a b c → b c a)                      */
    OP_MEMORY    = 0x3A,   /* store in cell → MAGMA ANCHOR                      */
    OP_REDUCTION = 0x3B,   /* sum collapse → MAGMA VAULT                        */
    OP_PORTAL    = 0x3C,   /* teleport                                           */
    OP_UNKNOWN   = 0xFF,
} Opcode;

/* ── Stack value ──────────────────────────────────────────────────────────── */

#define ERRANT_CAP_NAME_MAX  64
#define ERRANT_LABEL_MAX     64
#define ERRANT_STACK_DEPTH   256

typedef struct {
    int64_t value;                    /* numeric payload                        */
    Mult    mult;                     /* ownership mode                         */
    bool    consumed;                 /* set true when value is consumed        */
    char    cap_name[ERRANT_CAP_NAME_MAX]; /* non-empty iff mult == MULT_CAP   */
    char    label[ERRANT_LABEL_MAX];  /* debug label (optional)                 */
} EVal;

/* ── Execution stack ──────────────────────────────────────────────────────── */

typedef struct {
    EVal vals[ERRANT_STACK_DEPTH];
    int  top;                         /* index of next free slot (0 = empty)   */
} EStack;

/* ── Trace entry (from bridge.mjs or curator) ─────────────────────────────── */

#define ERRANT_SNAP_MAX  64
#define ERRANT_OP_MAX    32

typedef struct {
    char    op_name[ERRANT_OP_MAX];   /* e.g. "PUSH_LIN", "SEAL", "FORGE"     */
    Opcode  op;                       /* resolved opcode                        */
    int     x, y, step;              /* grid position (METAMINE) or 0          */
    int64_t stack_snap[ERRANT_SNAP_MAX]; /* stack snapshot at this step        */
    int     stack_depth;
} TraceEntry;

/* ── Result ───────────────────────────────────────────────────────────────── */

#define ERRANT_HASH_HEX   65         /* 64 hex chars + NUL                     */
#define ERRANT_ERROR_MAX  512
#define ERRANT_OUTPUT_MAX 4096

typedef struct {
    bool ok;
    bool fallback;                    /* true if Prolog check was skipped       */
    char error[ERRANT_ERROR_MAX];
    char worm_hash[ERRANT_HASH_HEX]; /* SHA-256 of the sealed trace            */
    char output[ERRANT_OUTPUT_MAX];  /* ECHO output                            */
    int  steps;
    int  ruptures;                   /* METAMINE ruptures detonated             */
    int  lin_consumed;               /* count of linear values properly consumed*/
    int  lin_leaked;                 /* count of linear values that were leaked */
} EResult;

/* ── Public API ───────────────────────────────────────────────────────────── */

/*
 * errant_verify_trace
 *   Check linear type invariants on a pre-built trace.
 *   Called by bridge.mjs after METAMINE excavation.
 *   Primary fast path — no Prolog subprocess needed.
 */
EResult errant_verify_trace(const TraceEntry *trace, int count);

/*
 * errant_verify_named
 *   Accepts a flat array of op-name strings (bridge.mjs interop).
 *   Example: ["PUSH_LIN","FORGE","SEAL","HALT"]
 *   Returns same EResult as errant_verify_trace.
 */
EResult errant_verify_named(const char **op_names, int count);

/*
 * errant_execute
 *   Full execution: parse ERRANT source text, run, return result.
 *   input: optional stdin buffer for LISTEN ops.
 */
EResult errant_execute(const char *source, const char *input);

/*
 * errant_sha256_hex
 *   Compute SHA-256 of data[0..len) and write 64 lowercase hex chars + NUL
 *   into hex_out[65].  No external crypto dependency.
 */
void errant_sha256_hex(const uint8_t *data, size_t len, char hex_out[ERRANT_HASH_HEX]);

/*
 * errant_opcode_from_name
 *   Map an op-name string to its Opcode enum value.
 *   Returns OP_UNKNOWN if not found.
 */
Opcode      errant_opcode_from_name(const char *name);
const char *errant_opcode_name(Opcode op);
const char *errant_mult_name(Mult m);
const char *errant_version(void);

/* ── Stack helpers (exposed for embedding) ────────────────────────────────── */

void   estack_init(EStack *s);
bool   estack_push(EStack *s, EVal v, char err[ERRANT_ERROR_MAX]);
bool   estack_pop(EStack *s, EVal *out, char err[ERRANT_ERROR_MAX]);
bool   estack_peek(const EStack *s, EVal *out, char err[ERRANT_ERROR_MAX]);
int    estack_depth(const EStack *s);
bool   estack_all_consumed(const EStack *s, char err[ERRANT_ERROR_MAX]);

#ifdef __cplusplus
}
#endif

#endif /* ERRANT_H */
