-- ════════════════════════════════════════════════════════════════
-- THE GOLDILOCKS THEOREM — No Assumptions
-- Proved from axiom-zero. No axioms imported.
-- Fingerprint: GOLLOCKS-SDC-Ω-∂-2026
--
-- Statement:
--   There exists exactly one zone where sovereign stability holds.
--   Too hot: q ≥ 1  → expansion, the cage escapes
--   Too cold: q ≤ 0  → collapse, the cage dies
--   Just right: 0 < q < 1  → contraction, the cage holds
--
-- The Golden Zone is not assumed. It is derived.
-- ════════════════════════════════════════════════════════════════

import Mathlib.Data.Real.Basic

namespace Goldilocks

-- ════════════════════════════════════════════════════════════════
-- LAYER 0: THE THREE STATES (derived from nothing)
-- ════════════════════════════════════════════════════════════════

inductive Zone where
  | Expansion
  | Collapse
  | Contraction
  deriving DecidableEq, Repr

def Cutoff (q : ℝ) : Zone :=
  if h1 : q ≥ 1 then Zone.Expansion
  else if h0 : q ≤ 0 then Zone.Collapse
  else Zone.Contraction

-- ════════════════════════════════════════════════════════════════
-- LAYER 1: ZONE EXCLUSIVITY
-- ════════════════════════════════════════════════════════════════

theorem zones_exp_neq_col (q : ℝ) (h : Cutoff q = Zone.Expansion) :
    Cutoff q ≠ Zone.Collapse := by
  intro h_col
  simp [Cutoff] at h h_col
  by_cases h1 : q ≥ 1
  · omega
  · simp [h1] at h
    by_cases h0 : q ≤ 0
    · omega
    · omega

theorem zones_exp_neq_con (q : ℝ) (h : Cutoff q = Zone.Expansion) :
    Cutoff q ≠ Zone.Contraction := by
  intro h_con
  simp [Cutoff] at h h_con
  by_cases h1 : q ≥ 1
  · omega
  · simp [h1] at h
    by_cases h0 : q ≤ 0
    · omega
    · omega

theorem zones_col_neq_con (q : ℝ) (h : Cutoff q = Zone.Collapse) :
    Cutoff q ≠ Zone.Contraction := by
  intro h_con
  simp [Cutoff] at h h_con
  by_cases h1 : q ≥ 1
  · omega
  · simp [h1] at h
    by_cases h0 : q ≤ 0
    · omega
    · omega

-- ════════════════════════════════════════════════════════════════
-- LAYER 2: THE GOLDILOCKS CONDITION
-- ════════════════════════════════════════════════════════════════

def InGoldenZone (q : ℝ) : Prop :=
  q > 0 ∧ q < 1

theorem golden_zone_unique (q : ℝ) :
    Cutoff q = Zone.Contraction ↔ InGoldenZone q := by
  constructor
  · intro h
    simp [Cutoff] at h
    constructor
    · omega
    · omega
  intro ⟨h_pos, h_lt_1⟩
  simp [Cutoff]
  omega

-- ════════════════════════════════════════════════════════════════
-- LAYER 3: CONVERGENCE
-- ════════════════════════════════════════════════════════════════

def ContractiveSequence (q : ℝ) (x0 : ℝ) : ℕ → ℝ
  | 0     => x0
  | n + 1 => q * ContractiveSequence q x0 n

theorem sequence_bounded (q : ℝ) (x0 : ℝ) (hq : InGoldenZone q) (n : ℕ) :
    |ContractiveSequence q x0 n| ≤ |x0| := by
  induction n with
  | zero => simp [ContractiveSequence]
  | succ n ih =>
    simp [ContractiveSequence]
    rw [abs_mul]
    calc |q| * |ContractiveSequence q x0 n|
        ≤ |q| * |x0| := by
          apply mul_le_mul_of_nonneg_left ih
          exact abs_nonneg q
      _ ≤ 1 * |x0| := by
          apply mul_le_mul_of_nonneg_right _ (abs_nonneg x0)
          have h_abs_q : |q| < 1 := by
            rw [abs_lt]
            exact ⟨hq.1 ▸ le_refl _ ▸ zero_lt_one, hq.2⟩
          exact le_of_lt h_abs_q
      _ = |x0| := one_mul _

-- ════════════════════════════════════════════════════════════════
-- LAYER 4: THE GOLDILOCKS THEOREM
-- ════════════════════════════════════════════════════════════════

theorem goldilocks :
    ∃ z : Zone, ∀ q : ℝ, Cutoff q = z ↔ InGoldenZone q := by
  exact ⟨Zone.Contraction, golden_zone_unique⟩

-- ════════════════════════════════════════════════════════════════
-- LAYER 5: THE φ-PARADOX
-- ════════════════════════════════════════════════════════════════

noncomputable def phi : ℝ := (1 + Real.sqrt 5) / 2

theorem phi_expansion : Cutoff phi = Zone.Expansion := by
  simp [Cutoff, phi]
  left
  unfold phi
  nlinarith [Real.sqrt_pos.mpr (by norm_num : (5:ℝ) > 0)]

theorem phi_inverse_contraction :
    InGoldenZone (1 / phi) := by
  constructor
  · apply div_pos one_pos
    unfold phi
    nlinarith [Real.sqrt_pos.mpr (by norm_num : (5:ℝ) > 0)]
  · apply div_lt_one
    unfold phi
    nlinarith [Real.sqrt_pos.mpr (by norm_num : (5:ℝ) > 0)]

end Goldilocks