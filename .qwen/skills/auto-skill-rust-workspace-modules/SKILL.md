---
name: rust-workspace-modules
description: Set up Rust workspace with multiple crates and proper module hierarchy (lib.rs + mod.rs)
source: auto-skill
extracted_at: '2026-07-08T06:37:51.363Z'
---

# Rust Workspace with Module Hierarchy

## Context
Building a Rust project with multiple crates (engine + API) and deep module structure. Common pitfalls around import paths and module declarations.

## Workspace Structure

```
project/
├── Cargo.toml              # Workspace root
├── engine/
│   ├── Cargo.toml          # Library crate
│   └── src/
│       ├── lib.rs          # Public API exports
│       └── kernel/
│           ├── mod.rs      # Module declarations
│           ├── checker.rs  # Implementation
│           └── worm.rs     # Implementation
├── api/
│   ├── Cargo.toml          # Binary crate, depends on engine
│   └── src/
│       └── main.rs         # Uses `engine::` imports
└── src/
    ├── lib.rs              # Top-level lib (re-exports)
    └── main.rs             # CLI binary
```

## Workspace Cargo.toml

```toml
[workspace]
members = ["engine", "api"]
resolver = "2"   # REQUIRED for edition 2021+
```

**Pitfall:** Without `resolver = "2"`, you get: "virtual workspace defaulting to `resolver = "1"` despite one or more workspace members being on edition 2021"

## Module Hierarchy Pattern

### lib.rs — Top-level module tree

```rust
// src/lib.rs
pub mod kernel;
pub mod syntax;
```

### kernel/mod.rs — Submodule declarations

```rust
// src/kernel/mod.rs
pub mod checker;
pub mod worm;

// Re-export for convenience
pub use checker::{Term, Env, infer, check, verify_proof};
pub use worm::{WormDb, ProofEntry};
```

### Import paths in sibling modules

```rust
// src/syntax/parser.rs — importing from kernel
use crate::kernel::checker::Term;  // ✅ Full path from crate root
// NOT: use crate::checker::Term;  // ❌ checker is inside kernel module
```

### Binary crate importing library

```rust
// src/main.rs or api/src/main.rs
use axiom::kernel::{WormDb, Term, Env, check, verify_proof};
use axiom::syntax::parser;
```

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `unresolved import crate::checker` | Missing module path segment | Use `crate::kernel::checker::Term` |
| `no targets specified in manifest` | Missing `src/main.rs` or `src/lib.rs` | Create the file, check `path` in Cargo.toml |
| `resolver = "1"` warning | Workspace missing resolver | Add `resolver = "2"` to workspace Cargo.toml |
| `unused import: infer` | Imported but not used in binary | Remove from `use` statement |
| `cannot find module serde_wasm_bindgen` | Missing dependency | Add `serde-wasm-bindgen = "0.6"` to Cargo.toml |

## Cargo.toml for Library Crate

```toml
[package]
name = "axiom-proof"
version = "0.1.0"
edition = "2021"

[lib]
name = "axiom"           # Crate name for imports
path = "src/lib.rs"

[[bin]]
name = "axiom"
path = "src/main.rs"

[dependencies]
sha2 = "0.10"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

## Cargo.toml for Dependent Crate

```toml
[package]
name = "axiom-api"
version = "0.1.0"
edition = "2021"

[dependencies]
axiom-proof = { path = "../engine" }  # Local path dependency
axum = "0.7"
tokio = { version = "1.0", features = ["full"] }
```

## Module Declaration Rules

1. **lib.rs declares top-level modules** — `pub mod kernel;` means `src/kernel/mod.rs` (or `src/kernel.rs`) exists
2. **mod.rs declares submodules** — `pub mod checker;` inside `kernel/mod.rs` means `src/kernel/checker.rs` exists
3. **Import from crate root** — Always use `crate::` prefix: `use crate::kernel::checker::Term;`
4. **Re-exports for ergonomics** — `pub use checker::Term;` in `kernel/mod.rs` lets users write `use crate::kernel::Term;`

## Testing

```bash
# Run all tests in workspace
cargo test

# Run tests for specific crate
cargo test -p axiom-proof

# Run with output
cargo test -- --nocapture
```

## When to Use

- Multi-crate Rust projects (engine + API + CLI)
- Projects with deep module hierarchies (kernel/syntax/tactics)
- When separating library from binary
- When one crate depends on another via path dependency
