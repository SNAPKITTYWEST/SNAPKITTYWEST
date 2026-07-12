/-
  GKN/Properties.lean — Degree-homogeneity of each I4 term individually.

  These are the four sub-lemmas that compose into the main I4_homogeneous theorem.
  Each is proved separately so the proof never needs to expand all 108 components
  simultaneously (which causes Lean's kernel to timeout on Float).

  The strategy: prove homogeneity by structural induction on (α,β,P,Q) components,
  using ring arithmetic after unfolding one level of definition at a time.
-/
import SAUTOCODE.GKN.Axioms
import Mathlib.Algebra.Ring.Basic
import Mathlib.RingTheory.Polynomial.Basic

namespace GKN

variable {R O : Type*} [CommRing R] [AddCommGroup O] [Module R O]
variable [OctonionAlgebra R O]

/-! ## Term 1: (αβ - Tr(P∘Q))² scales as c⁴ -/

lemma t1_homogeneous (s : State56 R O) (c : R) :
    let s' := s56Scale c s
    let trPQ' := jTrace (jordanProduct s'.P s'.Q)
    let trPQ  := jTrace (jordanProduct s.P s.Q)
    (s'.alpha * s'.beta - trPQ') = c ^ 2 * (s.alpha * s.beta - trPQ) := by
  simp only [s56Scale, jordanProduct, jTrace]
  ring

lemma t1_homogeneous_sq (s : State56 R O) (c : R) :
    let s' := s56Scale c s
    let trPQ' := jTrace (jordanProduct s'.P s'.Q)
    let trPQ  := jTrace (jordanProduct s.P s.Q)
    (s'.alpha * s'.beta - trPQ') ^ 2 = c ^ 4 * (s.alpha * s.beta - trPQ) ^ 2 := by
  have h := t1_homogeneous s c
  simp only at h ⊢
  rw [h]; ring

/-! ## Term 2: α·N(Q) scales as c⁴

   cubicNorm(cQ) = c³·N(Q) because N is cubic,
   so  cα · N(cQ) = c · c³ · α·N(Q) = c⁴ · α·N(Q). -/

lemma cubicNorm_homogeneous (X : J3O R O) (c : R) :
    cubicNorm { d1 := c * X.d1, d2 := c * X.d2, d3 := c * X.d3,
                o12 := c • X.o12, o23 := c • X.o23, o31 := c • X.o31 }
    = c ^ 3 * cubicNorm X := by
  simp only [cubicNorm]
  ring

lemma t2_homogeneous (s : State56 R O) (c : R) :
    let s' := s56Scale c s
    s'.alpha * cubicNorm s'.Q = c ^ 4 * (s.alpha * cubicNorm s.Q) := by
  simp only [s56Scale]
  rw [cubicNorm_homogeneous s.Q c]
  ring

lemma t3_homogeneous (s : State56 R O) (c : R) :
    let s' := s56Scale c s
    s'.beta * cubicNorm s'.P = c ^ 4 * (s.beta * cubicNorm s.P) := by
  simp only [s56Scale]
  rw [cubicNorm_homogeneous s.P c]
  ring

/-! ## Term 4: Tr(P# ∘ Q#) scales as c⁴

   freudenthalDual is quadratic: P# is homogeneous of degree 2.
   So Tr((cP)# ∘ (cQ)#) = Tr(c²P# ∘ c²Q#) = c⁴ · Tr(P# ∘ Q#). -/

lemma freudenthalDual_homogeneous (X : J3O R O) (c : R) :
    freudenthalDual { d1 := c * X.d1, d2 := c * X.d2, d3 := c * X.d3,
                      o12 := c • X.o12, o23 := c • X.o23, o31 := c • X.o31 }
    = { d1 := c^2 * (freudenthalDual X).d1,
        d2 := c^2 * (freudenthalDual X).d2,
        d3 := c^2 * (freudenthalDual X).d3,
        o12 := c^2 • (freudenthalDual X).o12,
        o23 := c^2 • (freudenthalDual X).o23,
        o31 := c^2 • (freudenthalDual X).o31 } := by
  simp only [freudenthalDual, jordanProduct, jTrace]
  ext <;> ring

lemma t4_homogeneous (s : State56 R O) (c : R) :
    let s' := s56Scale c s
    jTrace (jordanProduct (freudenthalDual s'.P) (freudenthalDual s'.Q))
    = c ^ 4 * jTrace (jordanProduct (freudenthalDual s.P) (freudenthalDual s.Q)) := by
  simp only [s56Scale]
  rw [freudenthalDual_homogeneous s.P c, freudenthalDual_homogeneous s.Q c]
  simp only [jordanProduct, jTrace]
  ring

end GKN
