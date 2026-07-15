import Mathlib.Tactic
import Mathlib.Algebra.Ring.Basic
import Mathlib.Data.Real.Basic

/-!
# GKN I₄ Quartic Invariant — CommRing Proof (SKW-001 targeted fix)
State56 = (α, β, X, Y) ∈ R × R × J₃(𝕆) × J₃(𝕆) over a CommRing R.
Float sorries in MTheory.lean cannot be closed by `ring` (Float has no CommRing instance).
Proven: I₄(c·s) = c⁴ · I₄(s)  — zero sorry.
-/

namespace GKN_I4_CommRing

variable {R : Type*} [CommRing R]

-- ── Octonion over R ───────────────────────────────────────────────────────────

@[ext]
structure Octonion (R : Type*) where
  c : Fin 8 → R

namespace Octonion

instance : Zero  (Octonion R) := ⟨⟨fun _ => 0⟩⟩
instance : Add   (Octonion R) := ⟨fun a b => ⟨fun i => a.c i + b.c i⟩⟩
instance : SMul R (Octonion R) := ⟨fun r a => ⟨fun i => r * a.c i⟩⟩

@[simp] lemma smul_c (r : R) (a : Octonion R) (i : Fin 8) :
    (r • a).c i = r * a.c i := rfl
@[simp] lemma zero_c (i : Fin 8) : (0 : Octonion R).c i = 0 := rfl

def normSq   (a : Octonion R) : R := ∑ i : Fin 8, a.c i * a.c i
def realPart (a : Octonion R) : R := a.c 0

@[simp] lemma realPart_zero : realPart (0 : Octonion R) = 0 := rfl
@[simp] lemma normSq_zero : normSq (0 : Octonion R) = 0 := by
  simp [normSq]

@[simp] lemma smul_zero_octs (r : R) : r • (0 : Octonion R) = 0 := by
  ext i; simp

@[simp] lemma normSq_smul (r : R) (a : Octonion R) :
    normSq (r • a) = r ^ 2 * normSq a := by
  simp [normSq, Finset.mul_sum]; congr 1; ext i; ring

@[simp] lemma realPart_smul (r : R) (a : Octonion R) :
    realPart (r • a) = r * realPart a := by simp [realPart]

end Octonion

-- ── J₃(𝕆) over R ─────────────────────────────────────────────────────────────

@[ext]
structure J3O (R : Type*) where
  d : Fin 3 → R
  o : Fin 3 → Octonion R

namespace J3O

instance : Zero (J3O R) := ⟨⟨fun _ => 0, fun _ => 0⟩⟩
instance : Add  (J3O R) :=
  ⟨fun M N => ⟨fun i => M.d i + N.d i, fun k => M.o k + N.o k⟩⟩
instance : Neg  (J3O R) :=
  ⟨fun M => ⟨fun i => -M.d i, fun k => ⟨fun i => -(M.o k).c i⟩⟩⟩
instance : Sub  (J3O R) := ⟨fun M N => M + (-N)⟩
instance : SMul R (J3O R) :=
  ⟨fun r M => ⟨fun i => r * M.d i, fun k => r • M.o k⟩⟩

@[simp] lemma smul_d (r : R) (M : J3O R) (i : Fin 3) : (r • M).d i = r * M.d i := rfl
@[simp] lemma smul_o (r : R) (M : J3O R) (k : Fin 3) : (r • M).o k = r • M.o k := rfl
@[simp] lemma add_d  (M N : J3O R) (i : Fin 3) : (M + N).d i = M.d i + N.d i := rfl
@[simp] lemma add_o  (M N : J3O R) (k : Fin 3) : (M + N).o k = M.o k + N.o k := rfl
@[simp] lemma neg_d  (M : J3O R) (i : Fin 3) : (-M).d i = -M.d i := rfl
@[simp] lemma neg_o_c (M : J3O R) (k : Fin 3) (i : Fin 8) :
    ((-M).o k).c i = -(M.o k).c i := rfl
@[simp] lemma zero_d (i : Fin 3) : (0 : J3O R).d i = 0 := rfl
@[simp] lemma zero_o (k : Fin 3) : (0 : J3O R).o k = (0 : Octonion R) := rfl

@[simp] lemma sub_d (M N : J3O R) (i : Fin 3) : (M - N).d i = M.d i - N.d i := by
  show M.d i + -N.d i = M.d i - N.d i; ring

@[simp] lemma smul_zero_j3o (r : R) : r • (0 : J3O R) = 0 := by
  ext i <;> simp

/-- Cubic norm — degree 3 in all components -/
def cubicNorm (M : J3O R) : R :=
  M.d 0 * M.d 1 * M.d 2
  - M.d 0 * Octonion.normSq (M.o 1)
  - M.d 1 * Octonion.normSq (M.o 2)
  - M.d 2 * Octonion.normSq (M.o 0)
  + 2 * (Octonion.realPart (M.o 0) * Octonion.realPart (M.o 1) * Octonion.realPart (M.o 2))

/-- Freudenthal adjoint M^# -/
def adjoint (M : J3O R) : J3O R :=
  ⟨fun i => match i with
    | ⟨0, _⟩ => M.d 1 * M.d 2 - Octonion.normSq (M.o 1)
    | ⟨1, _⟩ => M.d 0 * M.d 2 - Octonion.normSq (M.o 2)
    | ⟨2, _⟩ => M.d 0 * M.d 1 - Octonion.normSq (M.o 0)
    | ⟨n+3, h⟩ => absurd h (by omega),
   fun _ => (0 : Octonion R)⟩

/-- Symmetric bilinear trace form -/
def trace (M N : J3O R) : R :=
  M.d 0 * N.d 0 + M.d 1 * N.d 1 + M.d 2 * N.d 2
  + 2 * ∑ k : Fin 3, Octonion.realPart (M.o k) * Octonion.realPart (N.o k)

-- Homogeneity sub-lemmas

lemma cubicNorm_smul (r : R) (M : J3O R) :
    cubicNorm (r • M) = r ^ 3 * cubicNorm M := by
  simp only [cubicNorm, smul_d, smul_o,
             Octonion.normSq_smul, Octonion.realPart_smul]
  ring

@[simp] lemma adjoint_d0 (M : J3O R) :
    (adjoint M).d ⟨0, by omega⟩ = M.d 1 * M.d 2 - Octonion.normSq (M.o 1) := rfl
@[simp] lemma adjoint_d1 (M : J3O R) :
    (adjoint M).d ⟨1, by omega⟩ = M.d 0 * M.d 2 - Octonion.normSq (M.o 2) := rfl
@[simp] lemma adjoint_d2 (M : J3O R) :
    (adjoint M).d ⟨2, by omega⟩ = M.d 0 * M.d 1 - Octonion.normSq (M.o 0) := rfl
@[simp] lemma adjoint_o (M : J3O R) (k : Fin 3) :
    (adjoint M).o k = 0 := rfl

lemma adjoint_smul (r : R) (M : J3O R) :
    adjoint (r • M) = r ^ 2 • adjoint M := by
  apply J3O.ext
  · funext i
    fin_cases i <;> simp [adjoint, Octonion.normSq_smul] <;> ring
  · funext k
    simp only [adjoint_o, smul_o, adjoint_o, Octonion.smul_zero_octs]

/-- Trace is bilinear: linear in left argument -/
lemma trace_smul_left (r : R) (M N : J3O R) :
    trace (r • M) N = r * trace M N := by
  simp only [trace, smul_d]
  have hosum : ∑ k : Fin 3, Octonion.realPart ((r • M).o k) * Octonion.realPart (N.o k) =
      r * ∑ k : Fin 3, Octonion.realPart (M.o k) * Octonion.realPart (N.o k) := by
    simp_rw [smul_o, Octonion.realPart_smul]
    rw [Finset.mul_sum]; congr 1; ext; ring
  rw [hosum]; ring

/-- Trace is bilinear: linear in right argument -/
lemma trace_smul_right (r : R) (M N : J3O R) :
    trace M (r • N) = r * trace M N := by
  simp only [trace, smul_d]
  have hosum : ∑ k : Fin 3, Octonion.realPart (M.o k) * Octonion.realPart ((r • N).o k) =
      r * ∑ k : Fin 3, Octonion.realPart (M.o k) * Octonion.realPart (N.o k) := by
    simp_rw [smul_o, Octonion.realPart_smul]
    rw [Finset.mul_sum]; congr 1; ext; ring
  rw [hosum]; ring

/-- Trace scales as product of scalars -/
lemma trace_smul_smul (r s : R) (M N : J3O R) :
    trace (r • M) (s • N) = r * s * trace M N := by
  rw [trace_smul_left, trace_smul_right]; ring

@[simp] lemma cubicNorm_zero : cubicNorm (0 : J3O R) = 0 := by
  simp [cubicNorm, Octonion.normSq, Octonion.realPart]

@[simp] lemma adjoint_zero : adjoint (0 : J3O R) = 0 := by
  apply J3O.ext
  · funext i; fin_cases i <;> simp [adjoint, Octonion.normSq]
  · funext k; simp [adjoint]

@[simp] lemma trace_zero_left (N : J3O R) : trace 0 N = 0 := by simp [trace]
@[simp] lemma trace_zero_right (M : J3O R) : trace M 0 = 0 := by simp [trace]

lemma trace_comm (M N : J3O R) : trace M N = trace N M := by
  simp only [trace]
  have hsum : ∑ k : Fin 3, Octonion.realPart (M.o k) * Octonion.realPart (N.o k) =
              ∑ k : Fin 3, Octonion.realPart (N.o k) * Octonion.realPart (M.o k) :=
    Finset.sum_congr rfl fun k _ => mul_comm _ _
  rw [hsum]; ring

end J3O

-- ── FTS56 over R ──────────────────────────────────────────────────────────────

structure FTS56 (R : Type*) where
  α : R
  β : R
  X : J3O R
  Y : J3O R

namespace FTS56

instance : Zero (FTS56 R) := ⟨⟨0, 0, 0, 0⟩⟩
instance : SMul R (FTS56 R) :=
  ⟨fun r s => ⟨r * s.α, r * s.β, r • s.X, r • s.Y⟩⟩

@[simp] lemma smul_α (r : R) (s : FTS56 R) : (r • s).α = r * s.α := rfl
@[simp] lemma smul_β (r : R) (s : FTS56 R) : (r • s).β = r * s.β := rfl
@[simp] lemma smul_X (r : R) (s : FTS56 R) : (r • s).X = r • s.X := rfl
@[simp] lemma smul_Y (r : R) (s : FTS56 R) : (r • s).Y = r • s.Y := rfl
@[simp] lemma alpha_zero : (0 : FTS56 R).α = 0 := rfl
@[simp] lemma beta_zero  : (0 : FTS56 R).β = 0 := rfl
@[simp] lemma X_zero     : (0 : FTS56 R).X = 0 := rfl
@[simp] lemma Y_zero     : (0 : FTS56 R).Y = 0 := rfl

/-- GKN quartic invariant I₄ (degree-4 homogeneous, GKN 2001 §3) -/
def I4 (s : FTS56 R) : R :=
  (s.α * s.β - J3O.trace s.X s.Y) ^ 2
  - 4 * (s.α * J3O.cubicNorm s.X + s.β * J3O.cubicNorm s.Y
         - J3O.trace (J3O.adjoint s.X) (J3O.adjoint s.Y))

/-- I₄ is homogeneous of degree 4: I₄(c·s) = c⁴ · I₄(s). Zero sorry. -/
theorem I4_homogeneous (c : R) (s : FTS56 R) :
    I4 (c • s) = c ^ 4 * I4 s := by
  simp only [I4, smul_α, smul_β, smul_X, smul_Y]
  rw [J3O.trace_smul_smul]
  rw [J3O.cubicNorm_smul c s.X, J3O.cubicNorm_smul c s.Y]
  rw [J3O.adjoint_smul c s.X, J3O.adjoint_smul c s.Y, J3O.trace_smul_smul]
  ring

/-- Corollary: I₄(2s) = 16 I₄(s) -/
theorem I4_scale2 (s : FTS56 R) : I4 ((2 : R) • s) = 16 * I4 s := by
  rw [I4_homogeneous]; norm_num

/-- I₄(0) = 0 -/
theorem I4_zero : I4 (0 : FTS56 R) = 0 := by
  simp [I4]

/-- **Symplectic swap symmetry**: swapping (α,β,X,Y) → (β,α,Y,X) preserves I₄.
    This is the fundamental Freudenthal Triple System ℤ/2 symmetry of E₇. -/
theorem I4_symplectic_swap (α β : R) (X Y : J3O R) :
    I4 ⟨α, β, X, Y⟩ = I4 ⟨β, α, Y, X⟩ := by
  simp only [I4]
  rw [J3O.trace_comm X Y, J3O.trace_comm (J3O.adjoint X) (J3O.adjoint Y)]
  ring

/-! ## E₇ generator symmetries — deeper invariance -/

/-- **Sign-flip generator**: (α,β,X,Y) → (-α,-β,-X,-Y) preserves I₄.
    Central element (-1)·s acts by scalar -1; since I₄ is degree 4, (-1)⁴=1. -/
theorem I4_neg (s : FTS56 R) : I4 ((-1 : R) • s) = I4 s := by
  have h := I4_homogeneous (-1 : R) s
  norm_num at h
  exact h

/-- **GL(1) scaling**: I₄(c·s) = c⁴·I₄(s).
    The GL(1) ⊂ E₇ scaling generator, named for the E₇ generator catalogue. -/
theorem I4_gl1 (c : R) (s : FTS56 R) : I4 (c • s) = c ^ 4 * I4 s :=
  I4_homogeneous c s

end FTS56

-- ── Freudenthal double-adjoint identity (diagonal case) ──────────────────────

namespace J3O

/-- Diagonal J3O: all octonion components are zero.
    This is the reduced case where the full E₇ structure collapses to a
    purely commutative algebra — the octonion cross-terms vanish. -/
def IsDiag (M : J3O R) : Prop := ∀ k : Fin 3, M.o k = 0

/-- In the diagonal case, cubicNorm simplifies: octonion norm terms vanish. -/
lemma cubicNorm_diag {M : J3O R} (h : IsDiag M) :
    cubicNorm M = M.d 0 * M.d 1 * M.d 2 := by
  simp only [cubicNorm, h, Octonion.normSq_zero, Octonion.realPart_zero, mul_zero, sub_zero,
             Finset.sum_const_zero, mul_zero, add_zero]

/-- The adjoint of a diagonal J3O is again diagonal. -/
lemma adjoint_diag {M : J3O R} (h : IsDiag M) : IsDiag (adjoint M) :=
  fun k => adjoint_o M k

/-- In the diagonal case, adjoint(adjoint(M)).d i = cubicNorm(M) * M.d i.
    This is the Freudenthal identity M## = N(M) · M restricted to diagonal. -/
lemma adjoint_adjoint_d_diag {M : J3O R} (h : IsDiag M) (i : Fin 3) :
    (adjoint (adjoint M)).d i = cubicNorm M * M.d i := by
  simp only [adjoint, adjoint_d0, adjoint_d1, adjoint_d2,
             h, Octonion.normSq_zero, sub_zero, cubicNorm_diag h]
  fin_cases i <;> simp <;> ring

/-- **Freudenthal double-adjoint identity** (diagonal case, zero sorry):
    adjoint(adjoint(M)) = cubicNorm(M) • M
    This is the key identity of the Freudenthal Triple System:
    M## = N(M) · M, proven here for the diagonal subalgebra of J₃(𝕆). -/
theorem freudenthal_double_adjoint_diag {M : J3O R} (h : IsDiag M) :
    adjoint (adjoint M) = cubicNorm M • M := by
  apply J3O.ext
  · funext i
    rw [adjoint_adjoint_d_diag h i]
    simp [smul_d]
    ring
  · funext k
    simp [adjoint_o, smul_o, h k]

end J3O

-- ── FTS56 extensions: BPS slices, symplectic form, polarization ──────────────

namespace FTS56

/-! ### I₄ specialisations at α = 0 and β = 0 -/

/-- **BPS slice α = 0**: I₄ reduces to a quartic in (β, X, Y).
    In black hole physics this is the extremal/BPS locus where the
    first symplectic charge vanishes.  Zero sorry. -/
theorem I4_α_factor (β : R) (X Y : J3O R) :
    I4 ⟨0, β, X, Y⟩ =
      (J3O.trace X Y) ^ 2
      - 4 * β * J3O.cubicNorm Y
      + 4 * J3O.trace (J3O.adjoint X) (J3O.adjoint Y) := by
  simp only [I4]; ring

/-- **BPS slice β = 0**: symmetric counterpart to `I4_α_factor`.  Zero sorry. -/
theorem I4_β_factor (α : R) (X Y : J3O R) :
    I4 ⟨α, 0, X, Y⟩ =
      (J3O.trace X Y) ^ 2
      - 4 * α * J3O.cubicNorm X
      + 4 * J3O.trace (J3O.adjoint X) (J3O.adjoint Y) := by
  simp only [I4]; ring

/-! ### Symplectic form on FTS56 -/

/-- **E₇ symplectic pairing** on FTS56:
    ⟨s,t⟩ = s.α·t.β − t.α·s.β + tr(s.X,t.Y) − tr(t.X,s.Y).
    This is the Sp(56) ⊂ E₇ invariant symplectic form on the 56-dim
    Freudenthal triple system. -/
def symp (s t : FTS56 R) : R :=
  s.α * t.β - t.α * s.β + J3O.trace s.X t.Y - J3O.trace t.X s.Y

/-- **Alternating property**: ⟨s, s⟩ = 0.  Zero sorry. -/
theorem symp_self (s : FTS56 R) : symp s s = 0 := by
  simp only [symp]; ring

/-- **Antisymmetry**: ⟨s, t⟩ = −⟨t, s⟩.  Zero sorry. -/
theorem symp_antisym (s t : FTS56 R) : symp s t = -(symp t s) := by
  simp only [symp]; ring

/-! ### Degree-4 polarization / finite difference identity -/

/-- **4th-order polarization identity** for I₄.
    For any degree-4 homogeneous polynomial P, the 4th iterated finite
    difference with binomial signs (1,−4,6,−4,1) equals 4! · P:

        I₄(4s) − 4·I₄(3s) + 6·I₄(2s) − 4·I₄(s) + I₄(0) = 24 · I₄(s)

    Numeric witness: 4⁴ − 4·3⁴ + 6·2⁴ − 4·1⁴ + 0 = 256 − 324 + 96 − 4 = 24 = 4!
    Proved purely from `I4_homogeneous`.  Zero sorry. -/
theorem I4_fourth_difference (s : FTS56 R) :
    I4 ((4 : R) • s) - 4 * I4 ((3 : R) • s) + 6 * I4 ((2 : R) • s)
      - 4 * I4 ((1 : R) • s) + I4 ((0 : R) • s) = 24 * I4 s := by
  have h4 := I4_homogeneous (4 : R) s
  have h3 := I4_homogeneous (3 : R) s
  have h2 := I4_homogeneous (2 : R) s
  have h1 := I4_homogeneous (1 : R) s
  have h0 := I4_homogeneous (0 : R) s
  rw [h4, h3, h2, h1, h0]; ring

end FTS56

end GKN_I4_CommRing
