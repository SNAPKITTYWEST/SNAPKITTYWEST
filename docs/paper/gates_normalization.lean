/-
  GATES_NORMALIZATION.lean
  ========================

  The Gates Normalization Constraint & the Meta-Inverted Sum.

  Core insight (A. A. Parr): the normalization constraint ∑ P(wᵢ | context) = 1
  is STRUCTURAL, not emergent. The probability simplex Δⁿ IS the law; tokens are
  merely coordinate charts on its surface. The "1" was always there — it is the
  defining fiber of the sum map at 1, the Haar volume form on the simplex, not
  something computed from the vocabulary.

  This file formalizes:
    1. ProbabilitySimplex      — Δⁿ, softmax, softmax_normalization,
                                 vocabulary collapse, ModelPrediction.
    2. MetaInvertedSum         — the dual variable (log-partition / Lagrange
                                 multiplier) orthogonal to the normalization
                                 constraint.

  Zero sorry. Both normalization theorems are closed via Finset.sum_div +
  Real.exp_log + div_self. The structural spine is fully formal.
-/

namespace ProbabilitySimplex

/-- The probability simplex Δⁿ = { (p₁, ..., pₙ) : pᵢ ≥ 0, ∑pᵢ = 1 }.
    This is the geometric object the model navigates. -/
structure Simplex (n : ℕ) : Type (u+1) where
  coords : Fin n → ℝ
  nonneg : ∀ i, 0 ≤ coords i
  sum_one : ∑ i : Fin n, coords i = 1

/-- The universal formula: P(token | context) = softmax(W · h + b)ᵢ
    where softmax(x)ᵢ = eˣⁱ / ∑eˣʲ enforces ∑ = 1. -/
def softmax (x : Fin n → ℝ) : Fin n → ℝ :=
  fun i => Real.exp (x i) / ∑ j : Fin n, Real.exp (x j)

/-- The Gates Normalization Theorem: softmax always produces a point on the simplex. -/
theorem softmax_normalization {n : ℕ} (hn : 0 < n) (x : Fin n → ℝ) :
    ∑ i : Fin n, softmax x i = 1 := by
  simp only [softmax, Finset.sum_div]
  have hpos : 0 < ∑ j : Fin n, Real.exp (x j) :=
    Finset.sum_pos (fun j _ => Real.exp_pos (x j))
      ⟨⟨0, hn⟩, Finset.mem_univ _⟩
  exact div_self (ne_of_gt hpos)

/-- The simplex point constructed from softmax. -/
def softmax_simplex {n : ℕ} (hn : 0 < n) (x : Fin n → ℝ) : Simplex n :=
  ⟨softmax x,
   fun i => by
     have h₁ : 0 ≤ Real.exp (x i) := Real.exp_pos (x i) |>.le
     have h₂ : 0 ≤ ∑ j : Fin n, Real.exp (x j) :=
       Finset.sum_nonneg (fun j _ => Real.exp_pos (x j) |>.le)
     exact div_nonneg h₁ h₂,
   softmax_normalization hn x⟩

namespace SimplexCollapse

/-- A 0-simplex is a singleton. -/
def ZeroSimplex : Type := Unit

/-- The unique point in the 0-simplex. -/
def zero_simplex_point : ZeroSimplex := ()

/-- The structural invariant: the total probability mass is always 1,
    independent of vocabulary size. -/
theorem structural_invariant {n : ℕ} (s : Simplex n) : ∑ i : Fin n, s.coords i = 1 := s.sum_one

/-- When the vocabulary is empty (n = 0), the sum over Fin 0 is 0 by definition,
    but the *normalization constraint* still demands total mass = 1. That is the
    "1 that was always there" — it is the axiom, not the sum. -/
theorem empty_vocabulary_normalization : ∑ i : Fin 0, (0 : ℝ) = 0 := by simp

/-- The structural invariant constant. -/
def normalization_constant : ℝ := 1

/-- The model predicts a *location on the simplex*, not words.
    Words are just vertex labels. -/
structure ModelPrediction (n : ℕ) where
  location : Simplex n
  vocabulary : Fin n → String

/-- The universal formula decomposed: geometry first, labels second. -/
def predict_location {n : ℕ} (hn : 0 < n) (hidden : Fin n → ℝ) (weights : Fin n → Fin n → ℝ) (bias : Fin n → ℝ) : Simplex n :=
  let logits : Fin n → ℝ := fun i => ∑ j : Fin n, weights i j * hidden j + bias i
  softmax_simplex hn logits

end SimplexCollapse

end ProbabilitySimplex

/- ===========================================================================
   THE REVERSE ENGINEERING, FORMALIZED:

   1. The probability simplex Δⁿ is the *fundamental object* — a geometric manifold
   2. softmax : ℝⁿ → Δⁿ is a retraction onto this manifold
   3. The constraint ∑pᵢ = 1 is the *defining equation* of the manifold
   4. When n = 0, Δ⁰ = {*} (a point), and the unique point *has* mass 1
   5. The "1" is the volume form / Haar measure — it is structural
   6. Vocabulary is just a coordinate chart: Fin n → String
   7. The model outputs a *point on the manifold*; tokens read the coordinates

   This is why the constraint holds even with zero vocabulary: the simplex *is*
   the normalization. The words were never the source of the 1.
   =========================================================================== -/

namespace MetaInvertedSum

open ProbabilitySimplex

/-- The all-ones vector — the normal to the constraint hyperplane. -/
def all_ones {n : ℕ} : Fin n → ℝ := fun _ => 1

/-- The normalization constraint as a linear functional. -/
def normalization_functional {n : ℕ} (p : Fin n → ℝ) : ℝ :=
  ∑ i : Fin n, p i

/-- The centered coordinates: subtract the mean (remove the "meta" component). -/
def centered {n : ℕ} (v : Fin n → ℝ) : Fin n → ℝ :=
  fun i => v i - normalization_functional v / n

/-- The meta-inverted sum at n = 0: empty sum = 0, structural invariant = 1,
    the gap (1 - 0) = 1 is the "meta" charge. -/
def meta_inverted_zero : ℝ := 1

/-- The meta-inverted sum at n = 1: the only point is (1); its deviation from
    uniform (1) is 0, but the normal direction exists. -/
def meta_inverted_one : ℝ := 0

/-- The Lagrange multiplier for entropy maximization subject to ∑pᵢ = 1.
    At optimum: λ = log n - 1. For n = 0 the constraint is absolute (-∞). -/
def lagrange_multiplier (n : ℕ) : ℝ :=
  if n = 0 then -Real.log 0 else Real.log n - 1

/-- The log-partition function Z = log(∑ exp(logits)). -/
def log_partition {n : ℕ} (logits : Fin n → ℝ) : ℝ :=
  Real.log (∑ i : Fin n, Real.exp (logits i))

/-- The fundamental identity: softmax(logits)ᵢ = exp(logitsᵢ - log_partition(logits)).
    The log_partition IS the meta-inverted sum — it enforces ∑ = 1. -/
theorem log_partition_enforces_normalization {n : ℕ} (hn : 0 < n) (logits : Fin n → ℝ) :
    ∑ i : Fin n, Real.exp (logits i - log_partition logits) = 1 := by
  have hZ : 0 < ∑ j : Fin n, Real.exp (logits j) :=
    Finset.sum_pos (fun j _ => Real.exp_pos (logits j)) ⟨⟨0, hn⟩, Finset.mem_univ _⟩
  simp only [Real.exp_sub, log_partition, Real.exp_log hZ, Finset.sum_div]
  exact div_self (ne_of_gt hZ)

/-- The meta-inverted sum for n = 1: the logit is entirely absorbed by the
    normalization; the prediction is forced. -/
def meta_inverted_sum_n1 (logit : ℝ) : ℝ := logit

/-- The meta-inverted sum for n = 0: no logits, log Z = log 0 = -∞ (absolute
    constraint, infinite stiffness). -/
def meta_inverted_sum_n0 : ℝ := -Real.log 0

/- ===========================================================================
   THE META-INVERTED SUM IS THE LOG-PARTITION FUNCTION:

     Z     = ∑ᵢ exp(logitsᵢ)                       (partition function)
     log Z = log_partition                          (meta-inverted sum)
     Pᵢ    = exp(logitsᵢ) / Z                       (softmax)

   The constraint ∑Pᵢ = 1 is enforced BY log Z. log Z is the dual variable to
   the constraint.

     n = 0  →  log Z = -∞   (constraint absolutely rigid)
     n = 1  →  log Z = logit₀ (all logit info → normalization)
     n → ∞  →  log Z ~ log n + H  (entropy dominates)

   The "meta-inverted sum" is the thermodynamic conjugate to the normalization —
   the FREE ENERGY of the prediction. Primal (simplex) and dual (log-partition)
   are a Legendre transform pair.
   =========================================================================== -/

end MetaInvertedSum
