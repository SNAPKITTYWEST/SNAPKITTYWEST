# PR: Verified array contracts pattern for Creusot

## Summary

Adds a comprehensive set of verified array operation contracts demonstrating formal proof of memory safety using Creusot's specification system. This serves as both a practical reference and a pattern library for verified array computation.

## Functions included

| Function | What it proves |
|----------|---------------|
| `verified_get` | Safe bounded immutable access via `#[requires]` / `#[ensures]` |
| `verified_get_mut` | Safe bounded mutable access with aliasing constraints |
| `verified_find` | Linear search with loop invariant proving unchecked prefix |
| `verified_sum` | Accumulator loop with invariant tracking partial sums |
| `verified_copy_range` | Bounded copy with pre/postconditions on source and destination ranges |
| `verified_all` | Predicate verification with loop invariant on checked prefix |
| `verified_partition` | In-place partition with three-region invariant |

## Proof patterns demonstrated

1. **Precondition guards** — `#[requires(index < arr.len())]` eliminates bounds checks
2. **Loop invariants** — `#[invariant(i <= arr.len())]` with accumulator state
3. **Postcondition witnesses** — `forall<...>` quantifiers over array indices
4. **Mutation tracking** — `old(...)` for referring to pre-state values
5. **Partition correctness** — three-region invariant (`[0..i)` true, `[i..j)` unknown, `[j..n)` false)

## Motivation

Array operations are the most common source of undefined behavior in systems code. These contracts demonstrate that Creusot can verify:
- No out-of-bounds access
- No use-after-free
- Correct loop termination
- Functional correctness of algorithms

This pattern library connects to verified array work in the [SNAPKITTYWEST sovereign-array](https://github.com/SNAPKITTYWEST/sovereign-array) project, which implements a zero-sorry Lean 4 spec with C++20 kernel.

## Testing

These contracts can be verified by running:
```bash
cargo creusot -- --backend why3
```
