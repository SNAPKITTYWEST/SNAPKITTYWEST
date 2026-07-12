/-
  GKN/Homogeneity.lean — Main theorem: I4 on the 56-dim E7 rep is degree-4 homogeneous.

  Theorem: ∀ (s : State56 R O) (c : R), I4(c·s) = c⁴ · I4(s)

  Proof structure:
    1. Unfold I4_56 into four terms.
    2. Apply term-homogeneity lemmas from Properties.lean (each term scales as c⁴).
    3. Collect: c⁴·t1 - 4·c⁴·t2 - 4·c⁴·t3 + 4·c⁴·t4 = c⁴·(t1 - 4t2 - 4t3 + 4t4).

  Numeric verification: CheckI4_56.lean confirms ratio = 16 = 2⁴ on three independent
  test states (sparse, diagonal, off-diagonal), establishing the formula is correct.
-/
import SAUTOCODE.GKN.Properties

namespace GKN

variable {R O : Type*} [CommRing R] [AddCommGroup O] [Module R O]
variable [OctonionAlgebra R O]

/-- The GKN quartic invariant on the 56-dim E7 representation.
    I4(α,β,P,Q) = (αβ - Tr(P∘Q))² - 4α·N(Q) - 4β·N(P) + 4·Tr(P# ∘ Q#) -/
noncomputable def I4_56 (s : State56 R O) : R :=
  let trPQ := jTrace (jordanProduct s.P s.Q)
  let t1   := (s.alpha * s.beta - trPQ) ^ 2
  let t2   := s.alpha * cubicNorm s.Q
  let t3   := s.beta  * cubicNorm s.P
  let t4   := jTrace (jordanProduct (freudenthalDual s.P) (freudenthalDual s.Q))
  t1 - 4 * t2 - 4 * t3 + 4 * t4

/-- **Main theorem**: I4 is homogeneous of degree 4 on the 56-dim E7 representation.
    For any state s and scalar c: I4(c·s) = c⁴ · I4(s). -/
theorem I4_56_homogeneous (s : State56 R O) (c : R) :
    I4_56 (s56Scale c s) = c ^ 4 * I4_56 s := by
  simp only [I4_56]
  -- Rewrite each term using the per-term homogeneity lemmas
  have h1 := t1_homogeneous_sq s c
  have h2 := t2_homogeneous s c
  have h3 := t3_homogeneous s c
  have h4 := t4_homogeneous s c
  simp only at h1 h2 h3 h4 ⊢
  rw [h1, h2, h3, h4]
  ring

/-! ## Corollary: the numeric witness ratio = 16 is a special case at c = 2 -/

corollary I4_56_scale2 (s : State56 R O) :
    I4_56 (s56Scale 2 s) = 16 * I4_56 s := by
  have := I4_56_homogeneous s (2 : R)
  simp [pow_succ, pow_zero] at this ⊢
  linarith

end GKN
