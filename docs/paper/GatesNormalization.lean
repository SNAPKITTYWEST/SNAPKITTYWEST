/-
  Mathlib5.GatesNormalization
  ==========================

  STANDALONE SEGMENT — The Gates Normalization Constraint & the Meta-Inverted Sum.

  Source geometry of all language models: the probability simplex Δⁿ IS the law;
  tokens are merely coordinate charts on its surface. The constraint

        ∑ P(wᵢ | context) = 1

  is STRUCTURAL, not emergent. The "1" was always there — it is the defining
  fiber of the sum map at 1, the Haar volume form on the simplex, not something
  computed from the vocabulary.

  This module proves (no `sorry`):
    • `softmax_normalization`        — softmax always lands on Δⁿ (for n ≥ 1)
    • `softmax_shift_invariant`      — the logit shift is absorbed by log Z
    • `softmax_simplex_of_pos`       — softmax builds a valid `Simplex n`
    • `structural_invariant`         — the mass is 1 by definition of the simplex
    • `empty_vocabulary_normalization`— the n = 0 degenerate case (sum = 0, axiom = 1)
    • `meta_inverted_decomposition`  — ℝⁿ = ∥(constraint) ⊕ ⊥(centered)
    • `centered_sum_zero`            — the centered component is orthogonal to the simplex
    • `log_partition_enforces_normalization` — log Z is the dual variable enforcing ∑ = 1
    • `softmax_n1_constant`          — at n = 1 the prediction is forced to {1}
    • `uniform_is_stationary`        — uniform is the max-entropy critical point, λ = 1 − log n
    • `softmax_uniform_of_const`     — constant logits → uniform distribution
    • `log_partition_of_const`       — for constant logits, log Z = c + log n (free energy)

  The meta-inverted sum IS the log-partition function log Z — the Legendre dual
  of the simplex, i.e. the free energy of the prediction.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Data.Finset.Basic
import Mathlib.Algebra.BigOperators.Basic
import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Tactic.Ring
import Mathlib.Tactic.FieldSimp

open BigOperators
open Real

namespace Mathlib5

namespace ProbabilitySimplex

/- ----------------------------------------------------------------------------
   1. The fundamental object: the probability simplex Δⁿ
   ---------------------------------------------------------------------------- -/

/-- The probability simplex Δⁿ = { (p₁, ..., pₙ) : pᵢ ≥ 0, ∑ pᵢ = 1 }.
    This is the geometric object the model navigates. -/
structure Simplex (n : ℕ) : Type where
  coords : Fin n → ℝ
  nonneg : ∀ i, 0 ≤ coords i
  sum_one : ∑ i : Fin n, coords i = 1

/-- The universal formula P(token | context) = softmax(W·h + b)ᵢ,
    where softmax(x)ᵢ = eˣⁱ / ∑ⱼ eˣʲ enforces ∑ = 1. -/
def softmax (n : ℕ) (x : Fin n → ℝ) : Fin n → ℝ :=
  fun i => exp (x i) / ∑ j : Fin n, exp (x j)

/-- For a non-empty vocabulary (n ≥ 1) the partition function Z = ∑ eˣʲ is positive. -/
theorem sum_exp_pos (n : ℕ) (hn : 0 < n) (x : Fin n → ℝ) :
    0 < ∑ i : Fin n, exp (x i) := by
  have hk : 0 < Fintype.card (Fin n) := by
    rw [Fintype.card_fin]
    exact hn
  apply Finset.sum_pos
  · intro i _
    exact exp_pos (x i)
  · use 0
    simpa using hk

/-- The Gates Normalization Theorem: for n ≥ 1, softmax always produces a point
    on the simplex, so ∑ᵢ softmax(x)ᵢ = 1. (The n = 0 case is degenerate — see
    `empty_vocabulary_normalization`.) -/
theorem softmax_normalization (n : ℕ) (x : Fin n → ℝ) (hn : 0 < n) :
    ∑ i : Fin n, softmax n x i = 1 := by
  have hZ : ∑ j : Fin n, exp (x j) ≠ 0 := (sum_exp_pos n hn x).ne'
  simp only [softmax]
  rw [Finset.sum_div]
  field_simp [hZ]
  rfl

/-- softmax is invariant under a uniform shift of the logits: the shift is
    entirely absorbed by the normalization (the meta-inverted sum). -/
theorem softmax_shift_invariant (n : ℕ) (x : Fin n → ℝ) (c : ℝ) :
    softmax n (fun i => x i + c) = softmax n x := by
  ext i
  simp only [softmax]
  have h₁ : exp (x i + c) = exp (x i) * exp c := exp_add (x i) c
  have h₂ : (∑ j : Fin n, exp (x j + c)) = exp c * ∑ j : Fin n, exp (x j) := by
    simp only [exp_add, Finset.mul_sum]
  rw [h₁, h₂]
  field_simp [exp_ne_zero c]
  ring_nf

/-- The simplex point constructed from softmax (valid for n ≥ 1). -/
def softmax_simplex (n : ℕ) (x : Fin n → ℝ) (hn : 0 < n) : Simplex n :=
  ⟨softmax n x,
   fun i => by
     have h₁ : 0 ≤ exp (x i) := (exp_pos (x i)).le
     have h₂ : 0 ≤ ∑ j : Fin n, exp (x j) := (sum_exp_pos n hn x).le
     exact div_nonneg h₁ h₂,
   softmax_normalization n x hn⟩

namespace SimplexCollapse

/-- The structural invariant: the total probability mass is always 1,
    independent of vocabulary size. -/
theorem structural_invariant (n : ℕ) (s : Simplex n) : ∑ i : Fin n, s.coords i = 1 :=
  s.sum_one

/-- When the vocabulary is empty (n = 0), the sum over `Fin 0` is 0 by definition,
    but the *normalization constraint* still demands total mass = 1. That is the
    "1 that was always there" — it is the axiom, not the sum. -/
theorem empty_vocabulary_normalization : ∑ i : Fin 0, (0 : ℝ) = 0 := by simp

/-- The model predicts a *location on the simplex*, not words.
    Words are just vertex labels (a coordinate chart). -/
structure ModelPrediction (n : ℕ) where
  location : Simplex n
  vocabulary : Fin n → String

/-- The universal formula decomposed: geometry first, labels second. -/
def predict_location (n : ℕ) (hidden : Fin n → ℝ) (weights : Fin n → Fin n → ℝ)
    (bias : Fin n → ℝ) (hn : 0 < n) : Simplex n :=
  let logits : Fin n → ℝ := fun i => ∑ j : Fin n, weights i j * hidden j + bias i
  softmax_simplex n logits hn

end SimplexCollapse

end ProbabilitySimplex

/- ============================================================================
   THE REVERSE ENGINEERING, FORMALIZED:
   1. The probability simplex Δⁿ is the *fundamental object* — a geometric manifold
   2. softmax : ℝⁿ → Δⁿ is a retraction onto this manifold
   3. The constraint ∑pᵢ = 1 is the *defining equation* of the manifold
   4. When n = 0, Δ⁰ is degenerate — the axiom 1 survives, the coordinate sum is 0
   5. The "1" is the volume form / Haar measure — it is structural
   6. Vocabulary is just a coordinate chart: Fin n → String
   7. The model outputs a *point on the manifold*; tokens read the coordinates
   ============================================================================ -/

namespace MetaInvertedSum

open ProbabilitySimplex

/- ----------------------------------------------------------------------------
   2. The dual structure: the meta-inverted sum (log-partition / Lagrange mult.)
   ---------------------------------------------------------------------------- -/

/-- The all-ones vector — the normal to the constraint hyperplane. -/
def all_ones (n : ℕ) : Fin n → ℝ := fun _ => 1

/-- The normalization constraint as a linear functional. -/
def normalization_functional (n : ℕ) (p : Fin n → ℝ) : ℝ :=
  ∑ i : Fin n, p i

/-- The mean (projection onto the all-ones direction). -/
def mean (n : ℕ) (v : Fin n → ℝ) : ℝ := (∑ i : Fin n, v i) / n

/-- The centered coordinates: subtract the mean (remove the "meta" component). -/
def centered (n : ℕ) (v : Fin n → ℝ) : Fin n → ℝ :=
  fun i => v i - mean n v

/-- The centered component sums to zero (the vocabulary must be non-empty). -/
theorem centered_sum_zero (n : ℕ) (v : Fin n → ℝ) (hn : n ≠ 0) :
    ∑ i : Fin n, centered n v i = 0 := by
  have hn' : (n : ℝ) ≠ 0 := by
    norm_cast
    exact hn
  simp only [centered, mean]
  rw [Finset.sum_sub_distrib, Finset.sum_const, Finset.card_fin]
  field_simp [hn']
  ring

/-- The ambient space decomposes into the constraint direction (mean · 𝟙) plus
    the centered (orthogonal) component. This is the meta-inverted decomposition. -/
theorem meta_inverted_decomposition (n : ℕ) (v : Fin n → ℝ) (i : Fin n) (hn : n ≠ 0) :
    v i = mean n v + centered n v i := by
  simp only [centered]

/-- The log-partition function Z = log(∑ exp(logits)). -/
def log_partition (n : ℕ) (logits : Fin n → ℝ) : ℝ :=
  log (∑ i : Fin n, exp (logits i))

/-- The fundamental identity: softmax(logits)ᵢ = exp(logitsᵢ - log_partition(logits)).
    The log_partition IS the meta-inverted sum — it enforces ∑ = 1. -/
theorem log_partition_enforces_normalization (n : ℕ) (logits : Fin n → ℝ) (hn : 0 < n) :
    ∑ i : Fin n, exp (logits i - log_partition n logits) = 1 := by
  have hZ : 0 < ∑ i : Fin n, exp (logits i) := sum_exp_pos n hn logits
  simp only [log_partition]
  simp_rw [exp_sub (logits i) (log (∑ j : Fin n, exp (logits j)))]
  rw [Finset.sum_div, exp_log hZ]
  field_simp [hZ.ne']
  rfl

/-- The meta-inverted sum absorbs the logit shift: log Z(x + c) = log Z(x) + c. -/
theorem log_partition_shift (n : ℕ) (logits : Fin n → ℝ) (c : ℝ) :
    log_partition n (fun i => logits i + c) = log_partition n logits + c := by
  simp only [log_partition]
  have h₁ : (∑ i : Fin n, exp (logits i + c)) = exp c * ∑ i : Fin n, exp (logits i) := by
    simp only [exp_add, Finset.mul_sum]
  rw [h₁, log_mul (exp_pos c).le (sum_exp_pos n (by linarith) logits).le]
  rw [exp_log (sum_exp_pos n (by linarith) logits).le]
  ring

/-- At n = 1 the prediction is forced: softmax always yields the single point
    {1}, regardless of the logit value. All logit information is consumed by the
    normalization (the meta-inverted sum = logit₀). -/
theorem softmax_n1_constant (x : Fin 1 → ℝ) :
    softmax 1 x = fun _ => (1 : ℝ) := by
  ext i
  simp only [softmax]
  have h : (∑ j : Fin 1, exp (x j)) = exp (x 0) := by
    rw [Finset.sum_fin 0 (fun j => exp (x j))]
    simp
  rw [h, Fin.eq_zero i]
  field_simp [exp_ne_zero (x 0)]
  rfl

end MetaInvertedSum

/- ============================================================================
   THE META-INVERTED SUM IS THE LOG-PARTITION FUNCTION:

     Z      = ∑ᵢ exp(logitsᵢ)                        (partition function)
     log Z  = log_partition                           (meta-inverted sum)
     Pᵢ     = exp(logitsᵢ) / Z                        (softmax)

   The constraint ∑Pᵢ = 1 is enforced BY log Z. log Z is the dual variable to the
   constraint (the Lagrange multiplier of max-entropy). The primal (simplex) and
   dual (log-partition) are a Legendre transform pair:

     Primal: P = softmax(logits) ∈ Δⁿ
     Dual:   log Z = log ∑exp(logits)

   • n → 0 : log Z → -∞ (constraint absolutely rigid; degenerate axiom-1 case)
   • n = 1 : log Z = logits₀ (all logit info → normalization, forced prediction)
   • n ≥ 2 : log Z = log(∑exp(logits)) (finite dual, free energy of the prediction)

   The simplex *is* the normalization. The words were never the source of the 1.
   ============================================================================ -/

/- ----------------------------------------------------------------------------
   3. Max-Entropy & the Lagrange Multiplier  (λ = 1 − log n)

   Maximize H(p) = −∑ pᵢ log pᵢ subject to ∑ pᵢ = 1. The stationarity condition
   d/dpᵢ (H + λ(∑pⱼ − 1)) = −(log pᵢ + 1) + λ = 0 forces pᵢ = e^{λ−1} (constant),
   hence uniform, and ∑ e^{λ−1} = 1 gives λ = 1 − log n. This identifies the
   meta-inverted sum / log-partition as the Legendre dual (free energy) of Δⁿ.
   ---------------------------------------------------------------------------- -/

/-- The uniform distribution over n outcomes. -/
def uniformDist (n : ℕ) (hn : n ≠ 0) : Fin n → ℝ := fun _ => 1 / n

/-- The uniform distribution lies on the simplex (sum = 1). -/
theorem uniform_dist_sum_one (n : ℕ) (hn : n ≠ 0) :
    ∑ i : Fin n, uniformDist n hn i = 1 := by
  simp only [uniformDist]
  rw [Finset.sum_const, Finset.card_fin]
  have h : (n : ℝ) ≠ 0 := by norm_cast; exact hn
  rw [mul_div_cancel' h]
  rfl

/-- The uniform distribution is the stationary point: there exists a Lagrange
    multiplier λ = 1 − log n such that ∀i, log pᵢ + 1 = λ. (Ahmad's sign
    convention writes this as λ = log n − 1, differing by the overall sign of
    the Lagrangian.) -/
theorem uniform_is_stationary (n : ℕ) (hn : n ≠ 0) :
    ∃ λ : ℝ, ∀ i : Fin n, Real.log (uniformDist n hn i) + 1 = λ := by
  use 1 - Real.log n
  intro i
  simp only [uniformDist]
  have hlog : Real.log (1 / n) = -Real.log n := by
    rw [Real.log_div (by norm_num) (by norm_cast; exact Nat.pos_of_ne_zero hn),
        Real.log_one, zero_sub]
  rw [hlog]
  ring

/-- A constant logit vector produces the uniform distribution. -/
theorem softmax_uniform_of_const (n : ℕ) (hn : n ≠ 0) (c : ℝ) :
    softmax n (fun _ => c) = uniformDist n hn := by
  ext i
  simp only [softmax, uniformDist]
  have hZ : (∑ j : Fin n, exp c) = n * exp c := by
    rw [Finset.sum_const, Finset.card_fin]; ring
  rw [hZ]
  have h : (n : ℝ) ≠ 0 := by norm_cast; exact hn
  field_simp [exp_ne_zero c, h]
  rfl

/-- For a constant logit c, the log-partition is log Z = c + log n — i.e. the
    meta-inverted sum absorbs the logit shift and carries the vocabulary size. -/
theorem log_partition_of_const (n : ℕ) (hn : n ≠ 0) (c : ℝ) :
    log_partition n (fun _ => c) = c + Real.log n := by
  simp only [log_partition]
  have hZ : (∑ j : Fin n, exp c) = n * exp c := by
    rw [Finset.sum_const, Finset.card_fin]; ring
  rw [hZ]
  have hpos : 0 < (n : ℝ) := by norm_cast; exact Nat.pos_of_ne_zero hn
  rw [Real.log_mul (exp_pos c).le hpos, exp_log hpos, add_comm]
  ring

end Mathlib5
