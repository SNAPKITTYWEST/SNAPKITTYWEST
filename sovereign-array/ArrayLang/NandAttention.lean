/-!
# NAND Attention — Circuit Extraction Spec

NAND is the universal boolean connective. Attention scores can be
*represented* / *extracted* as NAND circuits. ASIC/FPGA refinement is a
separate step and is NOT done in the metalayer (we do not "run"
univalence on a CPU).

Spec only: the boolean gating can be extracted to a NAND circuit;
the attention *computation* lives over `Float`.
-/

import ArrayLang.Array
import ArrayLang.Softmax

namespace SovereignArray

/-- NAND gate: `¬(a ∧ b)`. -/
def nand (a b : Bool) : Bool := !(a && b)

/-- NAND is universal. -/
def notGate (a : Bool) : Bool := nand a a
def andGate (a b : Bool) : Bool := nand (nand a b) (nand a b)
def orGate  (a b : Bool) : Bool := nand (nand a a) (nand b b)

theorem notGate_eq (a : Bool) : notGate a = !a := rfl
theorem andGate_eq (a b : Bool) : andGate a b = (a && b) := rfl
theorem orGate_eq  (a b : Bool) : orGate a b = (a || b) := rfl

/-- Attention spec over `Float`: scores = q·k, weights = softmax(scores), out = w·v.
This is a composition of `Π`-maps; no loop in the denotation. -/
def attention {n : ℕ} (q k v : Fin n → Float) : Fin n → Float :=
  let scores : Fin n → Float := fun i => sumFin n fun j => q i * k j
  let w      : Fin n → Float := softmax scores
  fun i => sumFin n fun j => w i * v j

/-- The attention output is a `Π`-map over `i` of a softmax-weighted sum. -/
theorem attention_is_pmap {n : ℕ} (q k v : Fin n → Float) :
    attention q k v =
    (let scores i := sumFin n fun j => q i * k j
     let w := softmax scores
     fun i => sumFin n fun j => w i * v j) := rfl

end SovereignArray
