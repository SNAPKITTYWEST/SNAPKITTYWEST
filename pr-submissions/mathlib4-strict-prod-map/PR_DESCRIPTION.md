# PR: Strict group homs are stable by Prod.map

Closes #38421

## Summary

Proves that strict (injective) group homomorphisms are stable under `Prod.map`. If `f : A →* B` and `g : C →* D` are injective group homomorphisms, then `Prod.map f g : A × C → B × D` is also injective.

## Changes

- `MonoidHom.prodMapStrict` — injectivity of `Prod.map` for injective monoid homs
- `GroupHom.prodMap_strictness` — specialization to group homomorphisms
- `StrictMonoidHom.prodMap` — product formation for bundled strict monoid homs
- `StrictGroupHom.prodMap` — product formation for bundled strict group homs

## Approach

Uses `Prod.ext_iff` and the injectivity of each component to derive injectivity of the product map. The `Strict*Hom` bundles package injectivity with the homomorphism laws, making the stability property composable.

## Motivation

This is a standard result in algebra that was missing from mathlib4's API surface. It is needed for:
- Reasoning about product actions in formal verification pipelines
- Composing verified array/matrix operations that require strict homomorphisms
- Eliminating sorry placeholders in downstream proofs

## Related

- Builds on `Mathlib.GroupTheory.GroupAction.Prod`
- Connects to verified compute work in [SNAPKITTYWEST/sovereign-array](https://github.com/SNAPKITTYWEST/sovereign-array)
