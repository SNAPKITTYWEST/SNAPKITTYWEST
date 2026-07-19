# BOB ENGINE — Build System
# ═══════════════════════════════════════════════════════════════
#
# Frameless · Buffer-Centric · Zero-GC · Deterministic
#
# SNAPKITTYWEST · BOB's Games · 2026
# ═══════════════════════════════════════════════════════════════

CC      = gcc
NASM    = nasm
CFLAGS  = -O2 -Wall -Wextra -std=c11 -mavx2
LDFLAGS = -Wall

# Sources
C_SRC   = bob_engine.c demo.c
ASM_SRC = glitch_blit.asm

# Objects
C_OBJ   = $(C_SRC:.c=.o)
ASM_OBJ = $(ASM_SRC:.asm=.o)

# Targets
.PHONY: all clean demo asm

all: bob_demo

# Build C demo
bob_demo: $(C_OBJ)
	$(CC) $(LDFLAGS) -o $@ $^

# Build assembly version
asm: glitch_blit.o
	$(NASM) -f elf64 -o glitch_blit.o glitch_blit.asm

# Compile C files
%.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<

# Compile NASM files
%.o: %.asm
	$(NASM) -f elf64 -o $@ $<

# Run demo
demo: bob_demo
	./bob_demo

# Run assembly demo (requires linking)
asm_demo: glitch_blit.o
	$(NASM) -f elf64 -o glitch_blit.o glitch_blit.asm
	$(CC) $(LDFLAGS) -o asm_demo demo.c glitch_blit.o
	./asm_demo

clean:
	rm -f *.o bob_demo asm_demo
