/**
 * BOB ENGINE — Glitch Art Render Engine
 * ═══════════════════════════════════════════════════════════════
 *
 * FRAMELESS · BUFFER-CENTRIC · ZERO-GC · DETERMINISTIC
 *
 * The BOB Engine renders ASCII robot avatars with deterministic
 * glitch effects using double-buffered avatar slots, SIMD row
 * blits, and ANSI batch writes.
 *
 * Architecture:
 *   1. Double-Buffered Avatar Slots — flip active index each frame
 *   2. Glitch as XOR Mask — precomputed, deterministic per agent seed
 *   3. SIMD Row Blits — movdqu / vpxor / vpshufb per row
 *   4. ANSI Batch Write — single writev() syscall per frame
 *   5. Agent Metadata in RO Data — const struct in .rodata
 *
 * SNAPKITTYWEST · BOB's Games · 2026
 * ═══════════════════════════════════════════════════════════════
 */

#ifndef BOB_ENGINE_H
#define BOB_ENGINE_H

#include <stdint.h>
#include <stddef.h>

#define BOB_MAX_AGENTS     256
#define BOB_AVATAR_W       16
#define BOB_AVATAR_H       4
#define BOB_FRAME_CYCLE    64
#define BOB_GLYPH_COUNT    16
#define BOB_IOV_MAX        (BOB_MAX_AGENTS * BOB_AVATAR_H * 2 + 1)

/* ── Agent Avatar Metadata (RO Data) ───────────────────────────── */

typedef struct {
    uint8_t  w;           /* avatar width (bytes per row) */
    uint8_t  h;           /* avatar height (rows) */
    uint16_t glyph_off;   /* offset into avatar_glyph_data */
    uint16_t mask_seed;   /* seed for deterministic glitch mask */
    uint16_t pad;
} BobAvatar;

/* ── Agent State ───────────────────────────────────────────────── */

typedef struct {
    int32_t  x;           /* grid position x */
    int32_t  y;           /* grid position y */
    uint32_t frame;       /* current frame index */
    uint32_t seed;        /* agent-specific RNG seed */
    uint8_t  glitch_rate; /* 0-255, probability of glitch per byte */
    uint8_t  active;      /* 1 = visible, 0 = hidden */
    uint16_t pad;
} BobAgent;

/* ── Engine Context ────────────────────────────────────────────── */

typedef struct {
    BobAgent agents[BOB_MAX_AGENTS];
    uint32_t agent_count;
    uint32_t frame_idx;
    uint32_t width;       /* terminal width */
    uint32_t height;      /* terminal height */
    uint8_t  buf_idx;     /* double-buffer index (0 or 1) */
    uint8_t  dirty;       /* 1 = needs redraw */
    uint16_t pad;
} BobEngine;

/* ── Public API ────────────────────────────────────────────────── */

/**
 * Initialize the BOB Engine.
 * @param engine  pointer to engine context
 * @param width   terminal width in columns
 * @param height  terminal height in rows
 */
void bob_init(BobEngine *engine, uint32_t width, uint32_t height);

/**
 * Add an agent to the engine.
 * @param engine  pointer to engine context
 * @param avatar  avatar metadata (RO data)
 * @param x       initial grid x
 * @param y       initial grid y
 * @return agent index, or -1 on failure
 */
int bob_add_agent(BobEngine *engine, const BobAvatar *avatar, int32_t x, int32_t y);

/**
 * Render one frame to stdout using ANSI escape codes.
 * Uses writev() for batch I/O — single syscall per frame.
 * @param engine  pointer to engine context
 */
void bob_render_frame(BobEngine *engine);

/**
 * Apply deterministic glitch mask to avatar data.
 * @param dst       output buffer (BOB_AVATAR_W * BOB_AVATAR_H bytes)
 * @param src       clean avatar glyph data
 * @param mask      precomputed glitch mask
 * @param seed      agent seed for mask selection
 * @param frame     current frame index
 */
void bob_glitch_blit(uint8_t *dst, const uint8_t *src,
                     const uint8_t *mask, uint32_t seed, uint32_t frame);

/**
 * Generate deterministic glitch mask for all agents.
 * Must be called once at startup.
 * @param engine  pointer to engine context
 */
void bob_generate_masks(BobEngine *engine);

/**
 * Run the engine event loop.
 * Handles input, updates state, renders frames.
 * @param engine  pointer to engine context
 */
void bob_run(BobEngine *engine);

/**
 * Shutdown the engine and restore terminal.
 * @param engine  pointer to engine context
 */
void bob_shutdown(BobEngine *engine);

#endif /* BOB_ENGINE_H */
