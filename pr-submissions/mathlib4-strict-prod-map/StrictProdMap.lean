import Mathlib.GroupTheory.Subgroup.Basic
import Mathlib.GroupTheory.GroupAction.Prod
import Mathlib.Algebra.Group.Hom.Defs

/-!
# Strict homomorphisms are stable under `Prod.map`

Proves that injective (strict) monoid/group homomorphisms are preserved
by `Prod.map`. This is the idiomatic Mathlib approach: lemmas over
`MonoidHom` with `Function.Injective` hypotheses.
-/

namespace MonoidHom

variable {A B C D : Type*} [Monoid A] [Monoid B] [Monoid C] [Monoid D]

/-- `Prod.map` of two injective monoid homomorphisms is injective. -/
theorem prodMap_injective {f : A →* B} {g : C →* D}
    (hf : Function.Injective f) (hg : Function.Injective g) :
    Function.Injective (MonoidHom.prodMap f g) := by
  intro ⟨a₁, c₁⟩ ⟨a₂, c₂⟩ h
  simp only [prodMap_apply, Prod.mk.injEq] at h
  exact Prod.mk.inj_iff.mpr ⟨hf h.1, hg h.2⟩

end MonoidHom

namespace GroupHom

variable {A B C D : Type*} [Group A] [Group B] [Group C] [Group D]

/-- `Prod.map` of two injective group homomorphisms is injective. -/
theorem prodMap_injective {f : A →* B} {g : C →* D}
    (hf : Function.Injective f) (hg : Function.Injective g) :
    Function.Injective (MonoidHom.prodMap f g) :=
  MonoidHom.prodMap_injective hf hg

end GroupHom
