# Inverted Turbo

Sovereign Twin + P/NP Swarm monorepo.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVERTED TURBO MONOREPO                        │
├─────────────────────────────────────────────────────────────────┤
│  Haskell: sovereign-twin (ComputableRefinement + ComeFrom)       │
│  Haskell: pnp-core (Problem/Claim/Solution/Verify/Convergence)  │
│  Rust:    pnp-attack (SAT coordinator + Fortran DPLL sweep)      │
│  Rust:    sovereign-daemon (resonance HTTP + COME FROM dispatch)  │
│  Lean 4:  metaprogram (crToSExp/blockToThreaded generation)      │
│  Nix:     devshell (GHC + Rust + Lean + Agda + SBCL + REXX)     │
├─────────────────────────────────────────────────────────────────┤
│  Pipeline: ATLAS → TENSOR → LEDGE → AXIOM → WORM               │
│  Proof:    Haskell linear types → Rust SHA-256 seal → Lean 4    │
└─────────────────────────────────────────────────────────────────┘
```

## Packages

| Package | Language | Purpose |
|---------|----------|---------|
| `sovereign-twin` | Haskell | ComputableRefinement Σ-types, ComeFrom control flow, Agda AST, S-exp translation |
| `pnp-core` | Haskell | P/NP Swarm types: Problem, Claim, Solution, Verify, Convergence |
| `pnp-attack` | Rust + Fortran | SAT proof search coordinator, DPLL heuristic sweep |
| `sovereign-daemon` | Rust | HTTP daemon for resonance blocks, COME FROM dispatch |
| `InvertedTurbo` | Lean 4 | Metaprogram generating crToSExp/blockToThreaded inside Lean |

## Build

```bash
# Nix (recommended)
nix develop

# Haskell
cabal build all
cabal test pnp-core-test

# Rust
cargo build --release --workspace
cargo test --workspace

# Lean 4
cd lean && lake build
```

## Quick Start

```bash
# Bootstrap the sovereign twin
cabal run sovereign-twin-cli -- bootstrap /path/to/repos

# Run the sovereign loop
cabal run sovereign-twin-cli -- loop /path/to/repos

# Run P/NP attack
cargo run --release -p pnp-attack -- --ratio 3.8,4.0,4.2,4.26,4.5

# Check resonance
curl http://localhost:3777/resonance
```

## License

Sovereign Source License v2.0
