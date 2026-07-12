# Module 1 — Borrow-Chain Engineering

**Source of truth:** [`julia/src/BorrowChain.jl`](../../cosmic-invariant-sieve/julia/src/BorrowChain.jl),
[`isabelle/Borrow_Chain.thy`](../../cosmic-invariant-sieve/isabelle/Borrow_Chain.thy).

The borrow chain is the resource-tracking structure INTERCAL encodes. An INTERCAL
engineer must keep it *affine*: every resource is acquired once, used, released; no
alias cycles, no use-after-move, no silent global mutation.

## Discipline (from `policies/`)
```
allow_alias_cycles     = false
allow_use_after_move   = false
allow_implicit_global_mutation = false
require_declared_effects = true
```

## Canonical valid artifact
[`templates/valid_chain.i.in`](../../cosmic-invariant-sieve/intercal/templates/valid_chain.i.in)
lays out three resource arrays (`.` `;` `:`) and MINGLEs them with `$`, closing every
line in `PLEASE` etiquette and ending in `PLEASE GIVE UP`.

## Exercise 1
A borrow graph has a 3-node ownership cycle. Name (a) the tripwire artifact and
(b) the INTERCAL encoding.
> Answer: (a) `ownership_cycle.i.in`  (b) unresolved label dependency.
