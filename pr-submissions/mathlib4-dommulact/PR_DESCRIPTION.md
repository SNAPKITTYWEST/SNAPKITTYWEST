# PR: Extend DomMulAct API with core lemmas

Closes #5379

## Summary

Extends the `DomMulAct` (domain multiplication action) API with fundamental lemmas needed for downstream formal verification work.

## Changes

- `DomMulAct.ext` — extensionality principle for domain multiplication actions
- `one_smul` / `mul_smul` — identity and composition laws (simp-normal form)
- `smul_congr_left` / `smul_congr_right` — congruence lemmas
- `inv_smul_smul` / `smul_inv_smul` — inverse compatibility for group actions
- `smulEquiv` — the action of a group element as a carrier permutation
- `smulEquiv_mul` — functoriality of `smulEquiv` in the group element
- `fixedPoints` / `orbit` / `stabilizer` — standard orbit-stabilizer infrastructure for `DomMulAct`

## Motivation

The existing `DomMulAct` class lacks the basic API surface that `MulAction` and `DistribMulAction` provide out of the box. This PR closes that gap, enabling formal verification pipelines (including proof-carrying computation frameworks like VSCP) to reason about domain multiplication actions without ad-hoc sorry placeholders.

## Related

- Builds on `Mathlib.GroupTheory.GroupAction.Defs`
- Follows conventions from `Mathlib.GroupTheory.GroupAction.Basic`
- Part of ongoing work in verified symbolic compute pipelines (see [mathlib5](https://github.com/SNAPKITTYWEST/mathlib5))
