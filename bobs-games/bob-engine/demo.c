/**
 * BOB ENGINE — Demo
 * ═══════════════════════════════════════════════════════════════
 *
 * Launches 5 robots with glitch effects.
 * Press Ctrl+C to exit.
 *
 * SNAPKITTYWEST · BOB's Games · 2026
 * ═══════════════════════════════════════════════════════════════
 */

#include "bob_engine.h"
#include <stdio.h>
#include <signal.h>
#include <unistd.h>

static volatile int running = 1;

static void sigint_handler(int sig) {
    (void)sig;
    running = 0;
}

int main(void) {
    signal(SIGINT, sigint_handler);

    BobEngine engine;
    bob_init(&engine, 80, 24);

    /* Avatar definitions */
    static const BobAvatar avatars[] = {
        { .w = 16, .h = 4, .glyph_off = 0,  .mask_seed = 42 },
        { .w = 16, .h = 4, .glyph_off = 64, .mask_seed = 137 },
        { .w = 16, .h = 4, .glyph_off = 128, .mask_seed = 256 },
        { .w = 16, .h = 4, .glyph_off = 192, .mask_seed = 512 },
        { .w = 16, .h = 4, .glyph_off = 256, .mask_seed = 999 },
    };

    /* Add robots across the terminal */
    bob_add_agent(&engine, &avatars[0], 2, 2);
    bob_add_agent(&engine, &avatars[1], 18, 2);
    bob_add_agent(&engine, &avatars[2], 34, 2);
    bob_add_agent(&engine, &avatars[3], 50, 2);
    bob_add_agent(&engine, &avatars[4], 66, 2);

    /* Generate deterministic glitch masks */
    bob_generate_masks(&engine);

    /* Render loop — 10 FPS */
    printf("BOB ENGINE DEMO — 5 Glitch Robots — Ctrl+C to exit\n");
    usleep(2000000); /* 2 second pause */

    while (running) {
        engine.dirty = 1;
        bob_render_frame(&engine);
        usleep(100000); /* 100ms = 10 FPS */
    }

    bob_shutdown(&engine);
    return 0;
}
