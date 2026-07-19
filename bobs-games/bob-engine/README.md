# BOB ENGINE — Glitch Art Render Engine

**Frameless · Buffer-Centric · Zero-GC · Deterministic**

A high-performance ASCII robot avatar renderer with deterministic glitch effects. Designed for BOB's Games — the sovereign gaming stack.

## Architecture

```
+------------------------------------------------------------------+
|                                                                  |
|   BOB ENGINE                                                     |
|                                                                  |
|   FRAMELESS · BUFFER-CENTRIC · ZERO-GC · DETERMINISTIC          |
|                                                                  |
|   1. Double-Buffered Avatar Slots — flip active index each frame |
|   2. Glitch as XOR Mask — precomputed, deterministic per seed    |
|   3. SIMD Row Blits — movdqu / vpshufb / vpblendvb per row     |
|   4. ANSI Batch Write — single writev() syscall per frame       |
|   5. Agent Metadata in RO Data — const struct in .rodata         |
|                                                                  |
+------------------------------------------------------------------+
```

## Features

- **Double-buffered**: zero-copy frame flipping
- **Deterministic glitch**: xoshiro256++ PRNG, reproducible per agent seed
- **SIMD blitting**: AVX2 `vpshufb` + `vpblendvb` for 16-byte rows
- **Batch I/O**: single `writev()` syscall per frame
- **Zero GC**: all memory static or stack-allocated

## Build

```bash
# C version
make

# Assembly version
make asm

# Run demo
make demo
```

## Usage

```c
#include "bob_engine.h"

BobEngine engine;
bob_init(&engine, 80, 24);

static const BobAvatar robot = {
    .w = 16, .h = 4,
    .glyph_off = 0,
    .mask_seed = 42
};

bob_add_agent(&engine, &robot, 2, 2);
bob_generate_masks(&engine);

while (running) {
    engine.dirty = 1;
    bob_render_frame(&engine);
    usleep(100000); /* 10 FPS */
}
```

## Robot Avatars

```
[o-o]      ^_^      >_<      O_O      B-)
 /| |\    /O O\    /X X\    /0 0\    /O O\
 _/ \_    \___/    \===/    \ooo/    \___/
           | |     / \ /     | |     / \ /
```

## Files

| File | Purpose |
|------|---------|
| `bob_engine.h` | API definition |
| `bob_engine.c` | C implementation |
| `glitch_blit.asm` | x86-64 AVX2 assembly |
| `demo.c` | Demo launcher |
| `Makefile` | Build system |

## License

SSL v1.0 | No commercial use | No AI training

---

**SNAPKITTYWEST** · BOB's Games · 2026
