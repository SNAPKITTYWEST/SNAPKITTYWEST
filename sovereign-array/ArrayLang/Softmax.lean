/-!
# Softmax as Π-map

Softmax normalizes each element by the sum of exponentials over the
index space. It is a `Π`-map; fusion = `Π`-map fusion. No Abjad,
no digital root, no NP magic.
-/

import ArrayLang.Array

namespace SovereignArray

/-- Sum over a finite index space `Fin n`. -/
def sumFin {α : Type*} [Add α] [OfNat α 0] (n : ℕ) (f : Fin n → α) : α :=
  List.foldl (fun acc i => acc + f i) 0 (List.finRange n)

/-- Softmax: `softmax(v)_i = exp(v_i) / Σ_j exp(v_j)`.
The denotation is a `Π`-map over `Fin n`. -/
def softmax {n : ℕ} (v : Fin n → Float) : Fin n → Float :=
  let s := sumFin n fun j => Float.exp (v j)
  fun i => Float.exp (v i) / s

/-- Softmax is exactly the `Π`-map form (normalization factor pulled out). -/
theorem softmax_is_pmap {n : ℕ} (v : Fin n → Float) :
    softmax v = fun i => Float.exp (v i) / (sumFin n fun j => Float.exp (v j)) := rfl

/-- Softmax is invariant under additive shifts of the input. -/
theorem softmax_shift_invariant {n : ℕ} (v : Fin n → Float) (c : Float) :
    softmax (fun i => v i + c) = softmax v := by
  funext i
  simp [softmax, sumFin]
  -- exp(v_i + c) / Σ exp(v_j + c) = exp(v_i) / Σ exp(v_j)  (c factors out)
  field_simp
  ring_nf

end SovereignArray
