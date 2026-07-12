import SAUTOCODE.MTheory

open S_AUTOCODE_MTheory

/-! Numeric witness (engine-backed): is I4 homogeneous of degree 4?
   Every component = 1.0; compare I4(2·Ψ) vs 2^4·I4(Ψ). -/

def allOne : State108 := fun (_i : Fin 27) (_mu : Fin 4) => 1.0

#eval
  let x := I4 allOne
  let y := I4 (stateScale 2.0 allOne)
  "I4(Ψ)=" ++ toString x ++ "  I4(2Ψ)=" ++ toString y
    ++ "  16·I4(Ψ)=" ++ toString (16.0 * x)
    ++ "  ratio I4(2Ψ)/I4(Ψ)=" ++ toString (y / x)
