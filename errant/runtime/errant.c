/*
 * errant.c — ERRANT LFIS C Runtime implementation
 *
 * Build:  make          → liberrant.a + errant CLI
 * Embed:  #include "errant.h" and link -lerrant
 *
 * No external dependencies. SHA-256 implemented inline (FIPS 180-4).
 * Prolog bridge is optional: falls back to structural check if swipl absent.
 *
 * Ahmad Ali Parr · SnapKitty Collective · 2026
 */

#include "errant.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <ctype.h>

/* ════════════════════════════════════════════════════════════════════════════
 * SHA-256 — FIPS 180-4, no external dependency
 * ════════════════════════════════════════════════════════════════════════════ */

static const uint32_t K256[64] = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,
    0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,
    0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,
    0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,
    0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,
    0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,
    0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,
    0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,
    0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
};

#define ROTR32(x,n) (((x) >> (n)) | ((x) << (32-(n))))
#define CH(x,y,z)   (((x) & (y)) ^ (~(x) & (z)))
#define MAJ(x,y,z)  (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define EP0(x)      (ROTR32(x,2)  ^ ROTR32(x,13) ^ ROTR32(x,22))
#define EP1(x)      (ROTR32(x,6)  ^ ROTR32(x,11) ^ ROTR32(x,25))
#define SIG0(x)     (ROTR32(x,7)  ^ ROTR32(x,18) ^ ((x) >> 3))
#define SIG1(x)     (ROTR32(x,17) ^ ROTR32(x,19) ^ ((x) >> 10))

typedef struct { uint8_t data[64]; uint32_t h[8]; uint64_t bits; uint32_t len; } Sha256Ctx;

static void sha256_init(Sha256Ctx *c) {
    c->bits = 0; c->len = 0;
    c->h[0]=0x6a09e667; c->h[1]=0xbb67ae85; c->h[2]=0x3c6ef372; c->h[3]=0xa54ff53a;
    c->h[4]=0x510e527f; c->h[5]=0x9b05688c; c->h[6]=0x1f83d9ab; c->h[7]=0x5be0cd19;
}

static void sha256_transform(Sha256Ctx *c, const uint8_t *b) {
    uint32_t w[64], a,e,t1,t2,i;
    for (i=0;i<16;i++) w[i] = ((uint32_t)b[i*4]<<24)|((uint32_t)b[i*4+1]<<16)|((uint32_t)b[i*4+2]<<8)|b[i*4+3];
    for (i=16;i<64;i++) w[i] = SIG1(w[i-2])+w[i-7]+SIG0(w[i-15])+w[i-16];
    uint32_t s[8]; for(i=0;i<8;i++) s[i]=c->h[i];
    for (i=0;i<64;i++) {
        t1 = s[7]+EP1(s[4])+CH(s[4],s[5],s[6])+K256[i]+w[i];
        t2 = EP0(s[0])+MAJ(s[0],s[1],s[2]);
        s[7]=s[6]; s[6]=s[5]; s[5]=s[4]; s[4]=s[3]+t1;
        s[3]=s[2]; s[2]=s[1]; s[1]=s[0]; s[0]=t1+t2;
        (void)a; (void)e; /* silence unused warnings */
    }
    for(i=0;i<8;i++) c->h[i]+=s[i];
}

static void sha256_update(Sha256Ctx *c, const uint8_t *d, size_t n) {
    for (size_t i=0;i<n;i++) {
        c->data[c->len++] = d[i];
        if (c->len==64) { sha256_transform(c,c->data); c->bits+=512; c->len=0; }
    }
}

static void sha256_final(Sha256Ctx *c, uint8_t hash[32]) {
    uint32_t i = c->len;
    c->data[i++] = 0x80;
    if (i > 56) { while(i<64) c->data[i++]=0; sha256_transform(c,c->data); i=0; }
    while(i<56) c->data[i++]=0;
    c->bits += (uint64_t)c->len*8;
    for(int j=7;j>=0;j--) { c->data[56+(7-j)]=(uint8_t)(c->bits>>(j*8)); }
    sha256_transform(c,c->data);
    for(i=0;i<4;i++) for(int j=0;j<8;j++) hash[j*4+i]=(uint8_t)(c->h[j]>>((3-i)*8));
}

void errant_sha256_hex(const uint8_t *data, size_t len, char hex_out[ERRANT_HASH_HEX]) {
    Sha256Ctx c; uint8_t h[32];
    sha256_init(&c);
    sha256_update(&c, data, len);
    sha256_final(&c, h);
    for (int i=0;i<32;i++) snprintf(hex_out+i*2, 3, "%02x", h[i]);
    hex_out[64]='\0';
}

/* ════════════════════════════════════════════════════════════════════════════
 * Opcode / mode name tables
 * ════════════════════════════════════════════════════════════════════════════ */

typedef struct { const char *name; Opcode op; } OpEntry;

static const OpEntry OP_TABLE[] = {
    {"NOP",       OP_NOP},
    {"PUSH_UN",   OP_PUSH_UN},   {"PUSH_LIN",  OP_PUSH_LIN},
    {"MOVE",      OP_MOVE},      {"DROP_AFF",  OP_DROP_AFF},
    {"DUP_UN",    OP_DUP_UN},    {"SWAP",      OP_SWAP},
    {"PAIR",      OP_PAIR},      {"UNPAIR",    OP_UNPAIR},
    {"APPLY",     OP_APPLY},     {"CALL",      OP_CALL},
    {"RETURN",    OP_RETURN},    {"BRANCH",    OP_BRANCH},
    {"FAIL",      OP_FAIL},
    {"SEAL",      OP_SEAL},      {"ATTEST",    OP_ATTEST},
    {"HASH",      OP_HASH},      {"SIGN",      OP_SIGN},
    {"VERIFY",    OP_VERIFY},
    {"SPAWN",     OP_SPAWN},     {"SEND",      OP_SEND},
    {"RECV",      OP_RECV},      {"HALT",      OP_HALT},
    /* METAMINE bridge names */
    {"FUSE",      OP_FUSE},      {"CUT",       OP_CUT},
    {"FORGE",     OP_FORGE_OP},  {"ECHO",      OP_ECHO},
    {"LISTEN",    OP_LISTEN},    {"GATE",      OP_GATE},
    {"RUPTURE",   OP_RUPTURE},   {"ORIGIN",    OP_ORIGIN},
    {"RESONANCE", OP_RESONANCE}, {"TRANSFORM", OP_TRANSFORM},
    {"MEMORY",    OP_MEMORY},    {"REDUCTION", OP_REDUCTION},
    {"PORTAL",    OP_PORTAL},
    /* bridge.mjs also sends these names from METAMINE traces */
    {"SEED",      OP_PUSH_UN},   {"DROP",      OP_DROP_AFF},
    {"NOP",       OP_NOP},
    {NULL, OP_UNKNOWN},
};

Opcode errant_opcode_from_name(const char *name) {
    for (int i=0; OP_TABLE[i].name; i++)
        if (strcasecmp(OP_TABLE[i].name, name)==0) return OP_TABLE[i].op;
    return OP_UNKNOWN;
}

const char *errant_opcode_name(Opcode op) {
    for (int i=0; OP_TABLE[i].name; i++)
        if (OP_TABLE[i].op == op) return OP_TABLE[i].name;
    return "UNKNOWN";
}

const char *errant_mult_name(Mult m) {
    switch(m) {
        case MULT_UN:   return "un";
        case MULT_LIN:  return "lin";
        case MULT_AFF:  return "aff";
        case MULT_CAP:  return "cap";
        case MULT_SEAL: return "seal";
        default:        return "?";
    }
}

const char *errant_version(void) { return ERRANT_VERSION; }

/* ════════════════════════════════════════════════════════════════════════════
 * Stack operations
 * ════════════════════════════════════════════════════════════════════════════ */

void estack_init(EStack *s) { memset(s, 0, sizeof(*s)); }

bool estack_push(EStack *s, EVal v, char err[ERRANT_ERROR_MAX]) {
    if (s->top >= ERRANT_STACK_DEPTH) {
        snprintf(err, ERRANT_ERROR_MAX, "stack overflow at depth %d", s->top);
        return false;
    }
    s->vals[s->top++] = v;
    return true;
}

bool estack_pop(EStack *s, EVal *out, char err[ERRANT_ERROR_MAX]) {
    if (s->top <= 0) {
        snprintf(err, ERRANT_ERROR_MAX, "stack underflow");
        return false;
    }
    *out = s->vals[--s->top];
    return true;
}

bool estack_peek(const EStack *s, EVal *out, char err[ERRANT_ERROR_MAX]) {
    if (s->top <= 0) {
        snprintf(err, ERRANT_ERROR_MAX, "stack underflow on peek");
        return false;
    }
    *out = s->vals[s->top - 1];
    return true;
}

int estack_depth(const EStack *s) { return s->top; }

/* Check: no unconsumed linear/cap/seal values remain on stack */
bool estack_all_consumed(const EStack *s, char err[ERRANT_ERROR_MAX]) {
    for (int i = 0; i < s->top; i++) {
        const EVal *v = &s->vals[i];
        if (!v->consumed && (v->mult == MULT_LIN || v->mult == MULT_CAP || v->mult == MULT_SEAL)) {
            snprintf(err, ERRANT_ERROR_MAX,
                "linear resource leaked at stack[%d]: %s value \"%s\" (0x%llx) not consumed",
                i, errant_mult_name(v->mult), v->label,
                (unsigned long long)v->value);
            return false;
        }
    }
    return true;
}

/* ════════════════════════════════════════════════════════════════════════════
 * WORM trace sealer
 * Seals the execution trace with SHA-256: "ERRANT|op:step:x,y|...|output"
 * ════════════════════════════════════════════════════════════════════════════ */

static void seal_trace(const TraceEntry *trace, int count,
                        const char *output, char hex_out[ERRANT_HASH_HEX]) {
    /* Build canonical trace string */
    char buf[65536];
    int pos = snprintf(buf, sizeof(buf), "ERRANT");
    for (int i = 0; i < count && pos < (int)sizeof(buf)-64; i++) {
        pos += snprintf(buf+pos, sizeof(buf)-pos,
                        "|%s:%d:%d,%d", trace[i].op_name, trace[i].step,
                        trace[i].x, trace[i].y);
    }
    if (output && *output)
        pos += snprintf(buf+pos, sizeof(buf)-pos, "|%s", output);
    errant_sha256_hex((const uint8_t*)buf, (size_t)pos, hex_out);
}

/* ════════════════════════════════════════════════════════════════════════════
 * Core linear type checker
 * Runs in O(n) over the trace, tracking mult/consumed for every value.
 * This is the primary verification path — called by bridge.mjs fast path.
 * ════════════════════════════════════════════════════════════════════════════ */

static EResult run_checker(const TraceEntry *trace, int count) {
    EResult res; memset(&res, 0, sizeof(res));
    EStack  stack; estack_init(&stack);
    char    err[ERRANT_ERROR_MAX];
    char    output[ERRANT_OUTPUT_MAX]; output[0]='\0';
    int     outpos = 0;
    bool    has_seal_cap = false;

    for (int i = 0; i < count; i++) {
        const TraceEntry *t = &trace[i];
        Opcode op = t->op != OP_UNKNOWN ? t->op : errant_opcode_from_name(t->op_name);
        res.steps++;

        switch (op) {

        /* ── NOP / ORIGIN — no type effect ──────────────────────────────── */
        case OP_NOP:
        case OP_ORIGIN:
            break;

        /* ── PUSH_UN — push unrestricted value ───────────────────────────── */
        case OP_PUSH_UN:
        case OP_FUSE:   /* METAMINE: pushes computed int (unrestricted) */
        case OP_CUT:
        case OP_RESONANCE:
        case OP_REDUCTION:
        case OP_LISTEN: {
            EVal v = {0};
            v.value = (t->stack_depth > 0) ? t->stack_snap[t->stack_depth-1] : 0;
            v.mult  = MULT_UN;
            snprintf(v.label, ERRANT_LABEL_MAX, "%s@%d", t->op_name, i);
            if (!estack_push(&stack, v, err)) goto fail;
            break;
        }

        /* ── PUSH_LIN — push linear value ────────────────────────────────── */
        case OP_PUSH_LIN: {
            EVal v = {0};
            v.value = (t->stack_depth > 0) ? t->stack_snap[t->stack_depth-1] : 0;
            v.mult  = MULT_LIN;
            snprintf(v.label, ERRANT_LABEL_MAX, "lin@%d", i);
            if (!estack_push(&stack, v, err)) goto fail;
            break;
        }

        /* ── MOVE — transfer linear ownership (identity on type) ──────────── */
        case OP_MOVE: {
            EVal v;
            if (!estack_pop(&stack, &v, err)) goto fail;
            if (v.mult != MULT_LIN && v.mult != MULT_CAP && v.mult != MULT_SEAL) {
                snprintf(err, ERRANT_ERROR_MAX, "MOVE requires lin/cap/seal, got %s", errant_mult_name(v.mult));
                goto fail;
            }
            v.consumed = false; /* ownership transferred, not consumed */
            if (!estack_push(&stack, v, err)) goto fail;
            break;
        }

        /* ── DROP_AFF — drop affine (FORBIDDEN on lin/cap) ──────────────── */
        case OP_DROP_AFF: {
            EVal v;
            if (!estack_pop(&stack, &v, err)) goto fail;
            if (v.mult == MULT_LIN || v.mult == MULT_CAP || v.mult == MULT_SEAL) {
                snprintf(err, ERRANT_ERROR_MAX,
                    "DROP_AFF illegal on %s value \"%s\" — linear resources must be consumed",
                    errant_mult_name(v.mult), v.label);
                goto fail;
            }
            break;
        }

        /* ── DUP_UN — duplicate unrestricted ONLY ────────────────────────── */
        case OP_DUP_UN: {
            EVal v;
            if (!estack_peek(&stack, &v, err)) goto fail;
            if (v.mult != MULT_UN) {
                snprintf(err, ERRANT_ERROR_MAX,
                    "DUP_UN illegal on %s value \"%s\" — only un values may be duplicated",
                    errant_mult_name(v.mult), v.label);
                goto fail;
            }
            if (!estack_push(&stack, v, err)) goto fail;
            break;
        }

        /* ── SWAP ────────────────────────────────────────────────────────── */
        case OP_SWAP:
        case OP_TRANSFORM: {
            if (stack.top < 2) { snprintf(err, ERRANT_ERROR_MAX, "SWAP/TRANSFORM needs ≥2 values"); goto fail; }
            EVal a = stack.vals[stack.top-1];
            EVal b = stack.vals[stack.top-2];
            stack.vals[stack.top-1] = b;
            stack.vals[stack.top-2] = a;
            break;
        }

        /* ── PAIR — consume two linear values, produce one ───────────────── */
        case OP_PAIR: {
            EVal a, b;
            if (!estack_pop(&stack, &a, err)) goto fail;
            if (!estack_pop(&stack, &b, err)) goto fail;
            /* Both must not be already consumed */
            if (a.consumed) { snprintf(err, ERRANT_ERROR_MAX, "PAIR: first value already consumed"); goto fail; }
            if (b.consumed) { snprintf(err, ERRANT_ERROR_MAX, "PAIR: second value already consumed"); goto fail; }
            EVal pair = {0};
            pair.mult  = (a.mult == MULT_LIN || b.mult == MULT_LIN) ? MULT_LIN : MULT_UN;
            pair.value = (a.value << 32) | (uint32_t)b.value;
            snprintf(pair.label, ERRANT_LABEL_MAX, "pair(%s,%s)", a.label, b.label);
            if (!estack_push(&stack, pair, err)) goto fail;
            break;
        }

        /* ── UNPAIR ──────────────────────────────────────────────────────── */
        case OP_UNPAIR: {
            EVal p;
            if (!estack_pop(&stack, &p, err)) goto fail;
            EVal a = {.value=(int64_t)((uint64_t)p.value>>32), .mult=p.mult};
            EVal b = {.value=(int32_t)(p.value & 0xFFFFFFFF),  .mult=p.mult};
            snprintf(a.label, ERRANT_LABEL_MAX, "fst(%s)", p.label);
            snprintf(b.label, ERRANT_LABEL_MAX, "snd(%s)", p.label);
            if (!estack_push(&stack, b, err)) goto fail;
            if (!estack_push(&stack, a, err)) goto fail;
            break;
        }

        /* ── FORGE (MUL) — unrestricted arithmetic ───────────────────────── */
        case OP_FORGE_OP: {
            EVal a, b;
            if (!estack_pop(&stack, &a, err)) goto fail;
            if (!estack_pop(&stack, &b, err)) goto fail;
            EVal r = {.value = a.value * b.value, .mult = MULT_UN};
            snprintf(r.label, ERRANT_LABEL_MAX, "forge@%d", i);
            if (!estack_push(&stack, r, err)) goto fail;
            break;
        }

        /* ── ECHO — consume top, emit to output ──────────────────────────── */
        case OP_ECHO: {
            EVal v;
            if (!estack_pop(&stack, &v, err)) goto fail;
            v.consumed = true;
            if (v.value >= 32 && v.value <= 126 && outpos < ERRANT_OUTPUT_MAX-1)
                output[outpos++] = (char)v.value;
            output[outpos] = '\0';
            res.lin_consumed++;
            break;
        }

        /* ── HASH — consume data, produce hash (un) ──────────────────────── */
        case OP_HASH: {
            EVal v;
            if (!estack_pop(&stack, &v, err)) goto fail;
            v.consumed = true;
            char hex[ERRANT_HASH_HEX];
            errant_sha256_hex((const uint8_t*)&v.value, sizeof(v.value), hex);
            EVal h = {0};
            h.value = (int64_t)strtoll(hex, NULL, 16); /* first 8 hex bytes as int */
            h.mult  = MULT_UN;
            snprintf(h.label, ERRANT_LABEL_MAX, "hash@%d", i);
            if (!estack_push(&stack, h, err)) goto fail;
            if (v.mult == MULT_LIN || v.mult == MULT_CAP) res.lin_consumed++;
            break;
        }

        /* ── SEAL — either cryptographic (requires cap) or METAMINE Ω (last op) ── */
        case OP_SEAL: {
            /* If this is the LAST instruction, it is the METAMINE Ω halt-seal.
               Structural path: seal the trace and accept without cap requirement. */
            if (i == count - 1) {
                seal_trace(trace, count, output, res.worm_hash);
                memcpy(res.output, output, ERRANT_OUTPUT_MAX-1);
                res.output[ERRANT_OUTPUT_MAX-1] = '\0';
                res.ok       = true;
                res.fallback = true;
                res.steps    = i + 1;
                return res;
            }
            /* Mid-program SEAL: requires cap(seal) — cryptographic WORM sealing */
            if (!has_seal_cap) {
                snprintf(err, ERRANT_ERROR_MAX,
                    "SEAL at step %d: no cap(seal) in scope — SEAL without cap(seal) is FORBIDDEN", i);
                goto fail;
            }
            EVal data;
            if (!estack_pop(&stack, &data, err)) goto fail;
            data.consumed = true;
            EVal sealed = {0};
            sealed.mult  = MULT_SEAL;
            sealed.value = data.value ^ (int64_t)i; /* tag with step */
            snprintf(sealed.label, ERRANT_LABEL_MAX, "sealed(%s)@%d", data.label, i);
            if (!estack_push(&stack, sealed, err)) goto fail;
            if (data.mult == MULT_LIN || data.mult == MULT_CAP) res.lin_consumed++;
            break;
        }

        /* ── RUPTURE — METAMINE mine detonation → SENTINEL ───────────────── */
        case OP_RUPTURE: {
            res.ruptures++;
            /* Peek at stack top (power); does NOT consume it */
            break;
        }

        /* ── MEMORY — store to cell (consumes nothing, just records) ─────── */
        case OP_MEMORY:
            break;

        /* ── GATE / PORTAL — flow control, no type effect ───────────────── */
        case OP_GATE:
        case OP_PORTAL:
            break;

        /* ── APPLY / CALL / RETURN / BRANCH / FAIL ───────────────────────── */
        case OP_APPLY:
        case OP_CALL:
        case OP_RETURN:
        case OP_BRANCH: {
            /* Stub: consume top value (linear function or frame) */
            if (stack.top > 0) {
                EVal v;
                estack_pop(&stack, &v, err);
                if (v.mult == MULT_LIN || v.mult == MULT_CAP) res.lin_consumed++;
            }
            break;
        }
        case OP_FAIL: {
            EVal v;
            if (stack.top > 0) estack_pop(&stack, &v, err);
            snprintf(err, ERRANT_ERROR_MAX, "FAIL at step %d", i);
            goto fail;
        }

        /* ── SPAWN / SEND / RECV ─────────────────────────────────────────── */
        case OP_SPAWN:
        case OP_SEND:
        case OP_RECV: {
            /* Require cap on top of stack */
            EVal cap;
            if (!estack_pop(&stack, &cap, err)) goto fail;
            if (cap.mult != MULT_CAP) {
                snprintf(err, ERRANT_ERROR_MAX,
                    "%s at step %d: requires cap on stack, got %s",
                    t->op_name, i, errant_mult_name(cap.mult));
                goto fail;
            }
            cap.consumed = true;
            res.lin_consumed++;
            /* Push result as MULT_LIN */
            EVal result = {0};
            result.mult = MULT_LIN;
            snprintf(result.label, ERRANT_LABEL_MAX, "%s_result@%d", t->op_name, i);
            if (!estack_push(&stack, result, err)) goto fail;
            break;
        }

        /* ── HALT — final instruction: stack must be clean ───────────────── */
        case OP_HALT: {
            /* Consume the final sealed artifact */
            if (stack.top > 0) {
                EVal v;
                if (!estack_pop(&stack, &v, err)) goto fail;
                if (v.mult == MULT_SEAL) {
                    v.consumed = true;
                    res.lin_consumed++;
                } else if (v.mult == MULT_LIN || v.mult == MULT_CAP) {
                    snprintf(err, ERRANT_ERROR_MAX,
                        "HALT: expected sealed(final) on stack, got %s \"%s\"",
                        errant_mult_name(v.mult), v.label);
                    goto fail;
                }
            }
            /* All remaining values must be consumed */
            if (!estack_all_consumed(&stack, err)) {
                /* Count leaks */
                for (int j=0; j<stack.top; j++)
                    if (!stack.vals[j].consumed &&
                        (stack.vals[j].mult==MULT_LIN||stack.vals[j].mult==MULT_CAP||stack.vals[j].mult==MULT_SEAL))
                        res.lin_leaked++;
                goto fail;
            }
            /* Emit seal */
            seal_trace(trace, count, output, res.worm_hash);
            strncpy(res.output, output, ERRANT_OUTPUT_MAX-1);
            res.ok = true;
            return res;
        }

        default:
            /* Unknown op: treat as NOP in structural check */
            break;
        }

        /* Track has_seal_cap: if any cap named "seal" has been pushed and not consumed */
        for (int j=0; j<stack.top; j++) {
            if (stack.vals[j].mult == MULT_CAP &&
                strncmp(stack.vals[j].cap_name, "seal", 4)==0 &&
                !stack.vals[j].consumed)
                has_seal_cap = true;
        }
    }

    /* Reached end of trace without HALT */
    /* Fallback path for METAMINE traces: if SEAL (Ω) is the last op, accept */
    if (count > 0) {
        const TraceEntry *last = &trace[count-1];
        Opcode last_op = last->op != OP_UNKNOWN ? last->op
                       : errant_opcode_from_name(last->op_name);
        if (last_op == OP_SEAL || strcmp(last->op_name,"SEAL")==0) {
            /* METAMINE Ω seal — structural pass */
            seal_trace(trace, count, output, res.worm_hash);
            strncpy(res.output, output, ERRANT_OUTPUT_MAX-1);
            res.ok       = true;
            res.fallback = true;
            return res;
        }
    }

    snprintf(err, ERRANT_ERROR_MAX,
        "trace ended without HALT or SEAL — linear resources not fully consumed (%d steps)", count);

fail:
    res.ok = false;
    strncpy(res.error, err, ERRANT_ERROR_MAX-1);
    seal_trace(trace, count, output, res.worm_hash); /* seal even failed traces */
    return res;
}

/* ════════════════════════════════════════════════════════════════════════════
 * Public API implementations
 * ════════════════════════════════════════════════════════════════════════════ */

EResult errant_verify_trace(const TraceEntry *trace, int count) {
    return run_checker(trace, count);
}

EResult errant_verify_named(const char **op_names, int count) {
    /* Build TraceEntry array from flat name list */
    TraceEntry *entries = (TraceEntry*)calloc((size_t)count, sizeof(TraceEntry));
    if (!entries) {
        EResult r; memset(&r,0,sizeof(r));
        snprintf(r.error, ERRANT_ERROR_MAX, "out of memory");
        return r;
    }
    for (int i=0; i<count; i++) {
        strncpy(entries[i].op_name, op_names[i], ERRANT_OP_MAX-1);
        entries[i].op   = errant_opcode_from_name(op_names[i]);
        entries[i].step = i;
    }
    EResult r = run_checker(entries, count);
    free(entries);
    return r;
}

EResult errant_execute(const char *source, const char *input) {
    /* Minimal source executor: tokenize whitespace-separated op names and run */
    if (!source) {
        EResult r; memset(&r,0,sizeof(r));
        snprintf(r.error, ERRANT_ERROR_MAX, "null source");
        return r;
    }

    /* Tokenize */
    char *buf = strdup(source);
    const char *names[4096];
    int count = 0;
    char *p = buf;
    while (*p && count < 4096) {
        while (*p && isspace((unsigned char)*p)) p++;
        if (!*p || *p == ';') { while (*p && *p!='\n') p++; continue; }
        if (*p == '-' && *(p+1)=='-') { while (*p && *p!='\n') p++; continue; }
        char *start = p;
        while (*p && !isspace((unsigned char)*p)) p++;
        if (*p) *p++ = '\0';
        names[count++] = start;
    }

    EResult r = errant_verify_named(names, count);
    free(buf);
    return r;
}

/* ════════════════════════════════════════════════════════════════════════════
 * CLI entry point (compiled into errant binary)
 * ════════════════════════════════════════════════════════════════════════════ */

#ifdef ERRANT_MAIN
#include <stdio.h>

static void usage(const char *argv0) {
    fprintf(stderr,
        "errant v%s — ERRANT LFIS C Runtime\n"
        "Usage:\n"
        "  %s verify  <op> [<op> ...]   verify a named opcode sequence\n"
        "  %s exec    <source.errant>   execute source file\n"
        "  %s sha256  <string>          print SHA-256 hex\n"
        "  %s opcodes                   list all opcodes\n"
        "\nExamples:\n"
        "  %s verify PUSH_LIN HASH SEAL HALT\n"
        "  echo 'PUSH_LIN FORGE SEAL HALT' | %s verify -\n",
        ERRANT_VERSION,
        argv0, argv0, argv0, argv0, argv0, argv0);
}

int main(int argc, char **argv) {
    if (argc < 2) { usage(argv[0]); return 1; }

    if (strcmp(argv[1], "verify")==0) {
        /* Inline: errant verify OP1 OP2 ... */
        if (argc < 3) { fprintf(stderr, "verify: no opcodes given\n"); return 1; }
        const char **ops = (const char**)&argv[2];
        int n = argc - 2;
        /* Handle "-" for stdin */
        char **stdin_ops = NULL;
        if (n==1 && strcmp(ops[0],"-")==0) {
            char line[8192]; int cnt=0;
            stdin_ops = malloc(4096*sizeof(char*));
            while (fgets(line,sizeof(line),stdin)) {
                char *tok = strtok(line," \t\n");
                while (tok && cnt<4096) { stdin_ops[cnt++]=strdup(tok); tok=strtok(NULL," \t\n"); }
            }
            ops = (const char**)stdin_ops; n = cnt;
        }
        EResult r = errant_verify_named(ops, n);
        if (r.ok) {
            printf("EVIDENCE\n");
            printf("worm:  %s\n", r.worm_hash);
            printf("steps: %d\n", r.steps);
            if (r.output[0]) printf("output: %s\n", r.output);
            if (r.fallback)  printf("note:  structural fallback (SEAL-last rule)\n");
        } else {
            printf("SILENCE\n");
            fprintf(stderr, "error: %s\n", r.error);
            fprintf(stderr, "worm:  %s\n", r.worm_hash);
        }
        if (stdin_ops) { for(int i=0;i<n;i++) free(stdin_ops[i]); free(stdin_ops); }
        return r.ok ? 0 : 1;

    } else if (strcmp(argv[1],"exec")==0) {
        if (argc < 3) { fprintf(stderr, "exec: no file given\n"); return 1; }
        FILE *f = fopen(argv[2],"r");
        if (!f) { perror(argv[2]); return 1; }
        fseek(f,0,SEEK_END); long sz=ftell(f); rewind(f);
        char *src = malloc((size_t)sz+1);
        fread(src,1,(size_t)sz,f); src[sz]='\0'; fclose(f);
        EResult r = errant_execute(src, "");
        free(src);
        printf("%s\nworm: %s\n", r.ok?"EVIDENCE":"SILENCE", r.worm_hash);
        if (!r.ok) fprintf(stderr, "error: %s\n", r.error);
        return r.ok ? 0 : 1;

    } else if (strcmp(argv[1],"sha256")==0) {
        if (argc < 3) { fprintf(stderr, "sha256: no input\n"); return 1; }
        char hex[ERRANT_HASH_HEX];
        errant_sha256_hex((const uint8_t*)argv[2], strlen(argv[2]), hex);
        printf("%s\n", hex);
        return 0;

    } else if (strcmp(argv[1],"opcodes")==0) {
        printf("ERRANT LFIS opcodes:\n");
        for (int i=0; OP_TABLE[i].name; i++) {
            if (i>0 && OP_TABLE[i].op == OP_TABLE[i-1].op) continue; /* skip aliases */
            printf("  0x%02x  %s\n", OP_TABLE[i].op, OP_TABLE[i].name);
        }
        return 0;
    }

    usage(argv[0]); return 1;
}
#endif /* ERRANT_MAIN */
