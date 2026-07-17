/**
 * BOB ENGINE — Glitch Art Render Engine
 * ═══════════════════════════════════════════════════════════════
 *
 * Implementation: double-buffered avatar slots, deterministic
 * glitch masks, ANSI batch writes via writev().
 *
 * SNAPKITTYWEST · BOB's Games · 2026
 * ═══════════════════════════════════════════════════════════════
 */

#include "bob_engine.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/uio.h>
#include <time.h>

/* ── Glitch Glyph Palette ──────────────────────────────────────── */

static const uint8_t GLITCH_GLYPHS[BOB_GLYPH_COUNT] = {
    '@', '#', '%', '&', '?', '!', '*', ';',
    ':', '+', '=', '~', '^', '`', '|', '/'
};

/* ── Avatar Glyph Data (RO) ────────────────────────────────────── */

static const uint8_t AVATAR_GLYPHS[] = {
    /* [o-o] robot — index 0 */
    ' ', ' ', '[', 'o', '-', 'o', ']', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '/', '|', ' ', '|', '\\', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '_', '/', ' ', '\\', '_', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',

    /* ^_^ happy robot — index 1 */
    ' ', ' ', ' ', '^', '_', '^', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '/', 'O', ' ', 'O', '\\', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '\\', '_', '_', '_', '/', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', ' ', '|', ' ', '|', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',

    /* >_< angry robot — index 2 */
    ' ', ' ', '>', '_', '<', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '/', 'X', ' ', 'X', '\\', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '\\', '=', '=', '=', '/', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '/', '\\', ' ', '/', '\\', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',

    /* O_O surprised robot — index 3 */
    ' ', ' ', ' ', 'O', '_', 'O', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '/', '0', ' ', '0', '\\', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '\\', 'o', 'o', 'o', '/', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', ' ', '|', ' ', '|', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',

    /* B-) cool robot — index 4 */
    ' ', ' ', 'B', '-', ')', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '/', 'O', ' ', 'O', '\\', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '\\', '_', '_', '_', '/', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', '/', '\\', ' ', '/', '\\', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
};

static const uint32_t AVATAR_COUNT = 5;
static const uint32_t AVATAR_STRIDE = BOB_AVATAR_W * BOB_AVATAR_H;

/* ── Double Buffer ─────────────────────────────────────────────── */

static uint8_t AVATAR_SLOTS[BOB_MAX_AGENTS][2][BOB_AVATAR_H][BOB_AVATAR_W];

/* ── Glitch Masks (precomputed) ────────────────────────────────── */

static uint8_t GLITCH_MASKS[BOB_FRAME_CYCLE][BOB_AVATAR_H][BOB_AVATAR_W];

/* ── xoshiro256++ PRNG ─────────────────────────────────────────── */

static uint64_t splitmix64(uint64_t *state) {
    uint64_t z = (*state += 0x9e3779b97f4a7c15);
    z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9;
    z = (z ^ (z >> 27)) * 0x94d049bb133111eb;
    return z ^ (z >> 31);
}

static void generate_agent_mask(uint32_t seed, uint32_t agent_idx) {
    uint64_t state = ((uint64_t)seed << 32) | agent_idx;
    for (uint32_t f = 0; f < BOB_FRAME_CYCLE; f++) {
        for (uint32_t r = 0; r < BOB_AVATAR_H; r++) {
            for (uint32_t c = 0; c < BOB_AVATAR_W; c++) {
                uint64_t val = splitmix64(&state);
                /* 70% stable (0), 30% glitch (1-255) */
                GLITCH_MASKS[f][r][c] = (val % 100 < 70) ? 0 : (val & 0xFF);
            }
        }
    }
}

/* ── ANSI Escape Helpers ───────────────────────────────────────── */

static void ansi_clear(void) {
    write(STDOUT_FILENO, "\033[2J\033[H", 7);
}

static void ansi_cursor_move(uint32_t row, uint32_t col) {
    char buf[32];
    int len = snprintf(buf, sizeof(buf), "\033[%u;%uH", row + 1, col + 1);
    write(STDOUT_FILENO, buf, len);
}

/* ── Engine Implementation ─────────────────────────────────────── */

void bob_init(BobEngine *engine, uint32_t width, uint32_t height) {
    memset(engine, 0, sizeof(BobEngine));
    engine->width = width;
    engine->height = height;
    engine->buf_idx = 0;
    engine->dirty = 1;
    ansi_clear();
}

int bob_add_agent(BobEngine *engine, const BobAvatar *avatar, int32_t x, int32_t y) {
    if (engine->agent_count >= BOB_MAX_AGENTS) return -1;

    uint32_t idx = engine->agent_count++;
    BobAgent *agent = &engine->agents[idx];
    agent->x = x;
    agent->y = y;
    agent->frame = 0;
    agent->seed = avatar->mask_seed;
    agent->glitch_rate = 30;
    agent->active = 1;

    return (int)idx;
}

void bob_glitch_blit(uint8_t *dst, const uint8_t *src,
                     const uint8_t *mask, uint32_t seed, uint32_t frame) {
    uint32_t cycle_idx = frame % BOB_FRAME_CYCLE;

    for (uint32_t r = 0; r < BOB_AVATAR_H; r++) {
        for (uint32_t c = 0; c < BOB_AVATAR_W; c++) {
            uint8_t m = mask[cycle_idx * BOB_AVATAR_H * BOB_AVATAR_W +
                            r * BOB_AVATAR_W + c];
            uint8_t clean = src[r * BOB_AVATAR_W + c];

            if (m == 0) {
                dst[r * BOB_AVATAR_W + c] = clean;
            } else {
                dst[r * BOB_AVATAR_W + c] = GLITCH_GLYPHS[m & 0x0F];
            }
        }
    }
}

void bob_generate_masks(BobEngine *engine) {
    for (uint32_t i = 0; i < engine->agent_count; i++) {
        generate_agent_mask(engine->agents[i].seed, i);
    }
}

void bob_render_frame(BobEngine *engine) {
    if (!engine->dirty) return;

    struct iovec iov[BOB_IOV_MAX];
    int iov_count = 0;

    /* Header: clear screen + cursor home */
    static const char header[] = "\033[H\033[2J";
    iov[iov_count].iov_base = (void *)header;
    iov[iov_count].iov_len = sizeof(header) - 1;
    iov_count++;

    uint8_t active_buf = engine->buf_idx;

    for (uint32_t i = 0; i < engine->agent_count; i++) {
        BobAgent *agent = &engine->agents[i];
        if (!agent->active) continue;

        /* Glitch blit into active buffer */
        const uint8_t *src = AVATAR_GLYPHS + (i % AVATAR_COUNT) * AVATAR_STRIDE;
        bob_glitch_blit(&AVATAR_SLOTS[i][active_buf][0][0],
                        src, &GLITCH_MASKS[0][0][0],
                        agent->seed, agent->frame);

        /* Emit rows */
        for (uint32_t r = 0; r < BOB_AVATAR_H; r++) {
            /* Cursor move */
            char cursor[32];
            int clen = snprintf(cursor, sizeof(cursor), "\033[%d;%dH",
                               (int)(agent->y + r + 1), (int)(agent->x + 1));
            iov[iov_count].iov_base = strdup(cursor);
            iov[iov_count].iov_len = clen;
            iov_count++;

            /* Glyph row */
            iov[iov_count].iov_base = &AVATAR_SLOTS[i][active_buf][r][0];
            iov[iov_count].iov_len = BOB_AVATAR_W;
            iov_count++;
        }

        agent->frame++;
    }

    /* Single syscall: writev to stdout */
    writev(STDOUT_FILENO, iov, iov_count);

    /* Free strdup'd cursors */
    for (int i = 1; i < iov_count; i += 2) {
        free((void *)iov[i].iov_base);
    }

    /* Flip buffer */
    engine->buf_idx = !engine->buf_idx;
    engine->dirty = 0;
}

void bob_shutdown(BobEngine *engine) {
    ansi_clear();
    ansi_cursor_move(0, 0);
    printf("\nBOB ENGINE SHUTDOWN\n");
    printf("BOOT VERIFIED · AGENT OFFLINE · WORM SEALED\n");
}
