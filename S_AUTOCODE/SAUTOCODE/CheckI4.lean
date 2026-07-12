import SAUTOCODE.MTheory

open S_AUTOCODE_MTheory

/-! Numeric witness for I4 homogeneity.

   We test with a SPARSE basis state (single nonzero J3O column, d1=d2=d3=1)
   so that N(c0) = d1*d2*d3 = 1 (clean, no cross-term pollution).
   allOne (all 108 components = 1) was a degenerate maximally-coupled test — wrong.

   I4(Ψ)  should equal some value x.
   I4(rΨ) should equal r^k * x  where k is the true homogeneity degree.
   ratio  = I4(rΨ) / I4(Ψ) for r=2; expected 2^k.
-/

-- Sparse basis: only col 0 is nonzero, d1=d2=d3=1, all octonion parts 0.
-- cubicNorm(col 0) = 1*1*1 + 0 - 0 = 1  →  I4term1 = 1, all cross-terms = 0.
def basis0 : State108 := fun (i : Fin 27) (mu : Fin 4) =>
  if mu.val == 0 && (i.val == 0 || i.val == 1 || i.val == 2) then 1.0 else 0.0

-- Check N(col 0) directly so we see the cubic norm of the test element.
#eval
  let c0 := col basis0 ⟨0, by decide⟩
  "cubicNorm(c0)=" ++ toString (cubicNorm c0)

-- Homogeneity test: compute ratio I4(2Ψ) / I4(Ψ).
-- If quartic (degree 4): ratio = 2^4 = 16
-- If sextic  (degree 6): ratio = 2^6 = 64
#eval
  let x := I4 basis0
  let y := I4 (stateScale 2.0 basis0)
  "I4(Ψ)=" ++ toString x ++ "  I4(2Ψ)=" ++ toString y
    ++ "  16·I4(Ψ)=" ++ toString (16.0 * x)
    ++ "  64·I4(Ψ)=" ++ toString (64.0 * x)
    ++ "  ratio=" ++ toString (y / x)
