# Sovereign Goldilocks Compute

Reverse-engineered from [apex-goldilocks](https://github.com/MultiplicityTheory/apex-goldilocks) by MultiplicityTheory.

## What It Is

A sovereign compute stack built on Goldilocks field arithmetic, boundary lattices, and resonance words. Every computation is WORM-sealed for auditability.

## Core Concepts

### Goldilocks Field (p = 2^64 - 2^32 + 1)
The prime field used in PLONK and ZK-proof systems. All arithmetic is mod p.

### Boundary Lattice (G = P x B)
- |G| = 12,288 = 48 × 256
- P = Z/48Z (prime index)
- B = Z/256Z (byte index)

### Resonance Word
Packs a class byte (8 bits) + payload (56 bits) into a single u64.

### URef Subgroup
11 commuting involutions generating orbits of size 2048.

### WORM Seal
Write Once Read Many audit trail. SHA-256 hashed, append-only.

## Usage

```rust
use sovereign_goldilocks::{
    GoldilocksField, LatticeElement, LatticeCertificate,
    ResonanceWord, URef, WormChain,
};

// Field arithmetic
let a = GoldilocksField::new(42);
let b = GoldilocksField::new(58);
let c = a.add(&b); // 100

// Lattice operations
let elem = LatticeElement::new(5, 100);
let cert = LatticeCertificate::verify();

// Resonance words
let word = ResonanceWord::pack(0x0A, 12345);

// URef transformations
let uref = URef::canonical();
let orbit = uref.orbit(elem);

// WORM chain
let mut chain = WormChain::new();
chain.append("COMPUTE", "42+58=100", 1);
assert!(chain.verify());
```

## Tests

```bash
cargo test --workspace
```

## Origin

This is a reverse-engineered, open-source implementation of the sovereign compute concepts from apex-goldilocks. The original is by MultiplicityTheory / UOR Foundation.

**License:** MIT OR Apache-2.0
