# Makefile — ERRANT LFIS C Runtime
#
# Targets:
#   make          → liberrant.a (static library)
#   make cli      → errant binary (CLI)
#   make shared   → liberrant.so (dynamic library)
#   make test     → run built-in tests
#   make node     → build Node.js N-API binding (requires node-gyp)
#   make clean
#
# Usage from other languages:
#   C/C++:    #include "errant.h"  -L. -lerrant
#   Python:   ctypes.CDLL("./liberrant.so")
#   OCaml:    ocamlfind ocamlopt -package ctypes.foreign errant_stub.ml liberrant.a
#   Haskell:  foreign import ccall "errant_verify_named" ...
#   Node.js:  require('./build/Release/errant_node')
#
# Ahmad Ali Parr · SnapKitty Collective · 2026

CC      = gcc
CFLAGS  = -std=c11 -O2 -Wall -Wextra -pedantic -fPIC
LDFLAGS =

SRC     = errant.c
OBJ     = errant.o
LIB     = liberrant.a
SHARED  = liberrant.so
CLI     = errant

.PHONY: all cli shared test node clean install

# ── Default: static library ────────────────────────────────────────────────

all: $(LIB)

$(OBJ): $(SRC) errant.h
	$(CC) $(CFLAGS) -c $(SRC) -o $(OBJ)

$(LIB): $(OBJ)
	ar rcs $(LIB) $(OBJ)
	@echo "✓ Built $(LIB)"

# ── CLI binary ─────────────────────────────────────────────────────────────

cli: $(CLI)

$(CLI): $(SRC) errant.h
	$(CC) $(CFLAGS) -DERRANT_MAIN $(SRC) -o $(CLI) $(LDFLAGS)
	@echo "✓ Built $(CLI) binary"

# ── Shared library (.so / .dylib) ─────────────────────────────────────────

shared: $(SHARED)

$(SHARED): $(OBJ)
	$(CC) -shared -o $(SHARED) $(OBJ)
	@echo "✓ Built $(SHARED)"

# ── Tests ──────────────────────────────────────────────────────────────────

test: cli
	@echo "── ERRANT LFIS runtime tests ──"
	@echo "T1: SHA-256 known vector"
	@EXPECTED="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; \
	 GOT=$$(./$(CLI) sha256 ""); \
	 if [ "$$GOT" = "$$EXPECTED" ]; then echo "  PASS sha256(\"\") = $$GOT"; \
	 else echo "  FAIL expected $$EXPECTED got $$GOT"; fi

	@echo "T2: PUSH_UN ECHO SEAL → EVIDENCE (METAMINE bridge path)"
	@./$(CLI) verify PUSH_UN ECHO SEAL && echo "  PASS" || echo "  FAIL"

	@echo "T3: PUSH_LIN MOVE HALT → SILENCE (lin not consumed)"
	@./$(CLI) verify PUSH_LIN MOVE HALT && echo "  FAIL (should have rejected)" || echo "  PASS (correctly rejected)"

	@echo "T4: PUSH_UN FUSE FUSE SEAL → EVIDENCE"
	@./$(CLI) verify PUSH_UN PUSH_UN FUSE SEAL && echo "  PASS" || echo "  FAIL"

	@echo "T5: DUP_UN on LIN → SILENCE (forbidden)"
	@./$(CLI) verify PUSH_LIN DUP_UN SEAL && echo "  FAIL (should reject DUP on lin)" || echo "  PASS (correctly rejected)"

	@echo "T6: PUSH_UN HASH SEAL → EVIDENCE"
	@./$(CLI) verify PUSH_UN HASH SEAL && echo "  PASS" || echo "  FAIL"

	@echo "T7: Full METAMINE gallery trace"
	@./$(CLI) verify ORIGIN SEED NOP RUPTURE FUSE ECHO SEAL && echo "  PASS" || echo "  FAIL"

	@echo "T8: FORGE chain"
	@./$(CLI) verify SEED SEED FORGE SEAL && echo "  PASS" || echo "  FAIL"

	@echo "T9: SWAP preserves both values"
	@./$(CLI) verify PUSH_UN PUSH_UN SWAP SEAL && echo "  PASS" || echo "  FAIL"

	@echo "T10: Opcode listing"
	@./$(CLI) opcodes | grep -q "PUSH_LIN" && echo "  PASS" || echo "  FAIL"

	@echo "── done ──"

# ── Node.js N-API binding ──────────────────────────────────────────────────
# Requires: npm install node-gyp  &&  node-gyp configure

node: $(LIB)
	@if [ -f binding.gyp ]; then node-gyp build; else echo "binding.gyp not found — run: node errant-node/setup.mjs"; fi

# ── Install ────────────────────────────────────────────────────────────────

PREFIX ?= /usr/local

install: $(LIB) $(CLI)
	install -d $(PREFIX)/lib $(PREFIX)/include $(PREFIX)/bin
	install -m 644 $(LIB)    $(PREFIX)/lib/
	install -m 644 errant.h  $(PREFIX)/include/
	install -m 755 $(CLI)    $(PREFIX)/bin/
	@echo "✓ Installed to $(PREFIX)"

# ── Clean ──────────────────────────────────────────────────────────────────

clean:
	rm -f $(OBJ) $(LIB) $(SHARED) $(CLI)
	@echo "✓ Clean"
