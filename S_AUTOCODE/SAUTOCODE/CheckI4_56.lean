import SAUTOCODE.MTheory

open S_AUTOCODE_MTheory

/-! Numeric witness for I4_56 homogeneity on the true 56-dim E7 rep.
   Sparse test: α=1, β=1, P=diag(1,0,0), Q=diag(0,1,0).
   Expected ratio = 2^4 = 16. -/

def zeroOct : Octonion := ⟨0,0,0,0,0,0,0,0⟩

def testState : State56 :=
  { alpha := 1.0
    beta  := 1.0
    P     := { d1 := 1.0, d2 := 0.0, d3 := 0.0, o12 := zeroOct, o23 := zeroOct, o31 := zeroOct }
    Q     := { d1 := 0.0, d2 := 1.0, d3 := 0.0, o12 := zeroOct, o23 := zeroOct, o31 := zeroOct } }

#eval
  let x := I4_56 testState
  let y := I4_56 (s56Scale 2.0 testState)
  "I4_56(Ψ)=" ++ toString x
    ++ "  I4_56(2Ψ)=" ++ toString y
    ++ "  16·I4_56(Ψ)=" ++ toString (16.0 * x)
    ++ "  ratio=" ++ toString (y / x)
