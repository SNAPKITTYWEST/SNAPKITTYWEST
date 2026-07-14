/-!
# Broadcasting as Pullback

Broadcasting = pullback along projection `π : J → I`.
`broadcast(f, π) = f ∘ π` is the categorical semantics of broadcasting.
-/

import ArrayLang.Array

namespace SovereignArray

/-- General pullback along a projection. `pullback π f = f ∘ π`. -/
def pullback {I J : Type*} (π : J → I) (f : I → α) : J → α := f ∘ π

/-- Broadcasting: align `v` (indexed by `I`) to `J` via `π`, then add `w` (indexed by `J`).
This is the `Π`-map `fun j => v (π j) + w j`. -/
def broadcast {α : Type*} [Add α] {I J : Type*} (π : J → I)
    (v : I → α) (w : J → α) : J → α :=
  fun j => v (π j) + w j

/-- The definition is literally the pullback-plus-add form. -/
theorem broadcast_is_pullback {α : Type*} [Add α] {I J : Type*} (π : J → I) :
    (fun (v : I → α) (w : J → α) => broadcast π v w) =
    (fun v w j => v (π j) + w j) := rfl

/-- `broadcast` is `pullback π v` added pointwise to `w`. -/
theorem broadcast_eq_pullback {α : Type*} [Add α] {I J : Type*} (π : J → I)
    (v : I → α) (w : J → α) :
    broadcast π v w = fun j => pullback π v j + w j := rfl

/-- Two successive broadcasts along `π₂ ∘ π₁` fuse into one pullback. -/
theorem broadcast_comp {α : Type*} [Add α] {I J K : Type*}
    (π₁ : J → I) (π₂ : K → J) (v : I → α) (w : K → α) :
    broadcast π₂ (pullback π₁ v) w = broadcast (π₁ ∘ π₂) v w := rfl

end SovereignArray
