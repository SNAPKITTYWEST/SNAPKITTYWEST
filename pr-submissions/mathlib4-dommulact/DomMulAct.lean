/-
Copyright (c) 2024 Mathlib Contributors. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Ahmad Ali Parr
-/
import Mathlib.GroupTheory.GroupAction.Defs
import Mathlib.GroupTheory.GroupAction.Basic
import Mathlib.Algebra.Module.Defs

/-!
# Domain Multiplication Action

Defines `DomMulAct`, a typeclass for domain multiplication actions, along with
orbit, stabilizer, and fixed-point infrastructure.
-/

namespace Mathlib.GroupTheory.GroupAction

variable {M : Type*} {α : Type*}

/-- A domain multiplication action: `M` acts on `α` preserving domain structure. -/
class DomMulAct (M α : Type*) [Monoid M] where
  act : M → α → α
  one_act : ∀ a : α, act 1 a = a
  mul_act : ∀ (m n : M) (a : α), act (m * n) a = act m (act n a)

/-- Extensionality for `DomMulAct`. -/
lemma DomMulAct.ext {inst1 inst2 : DomMulAct M α} [Monoid M]
    (h : ∀ m a, inst1.act m a = inst2.act m a) : inst1 = inst2 := by
  cases inst1; cases inst2
  congr 1
  funext m a
  exact h m a

namespace DomMulAct

variable [Monoid M] [DomMulAct M α]

/-- Notation `m ·ᵈ a` for the domain action of `m` on `a`. -/
def domAct (m : M) (a : α) : α := DomMulAct.act m a

scoped notation:73 m " ·ᵈ " a => domAct m a

@[simp]
lemma one_domAct (a : α) : (1 : M) ·ᵈ a = a :=
  DomMulAct.one_act a

@[simp]
lemma mul_domAct (m n : M) (a : α) : (m * n) ·ᵈ a = m ·ᵈ (n ·ᵈ a) :=
  DomMulAct.mul_act m n a

lemma domAct_congr_left {m m' : M} (h : m = m') (a : α) : m ·ᵈ a = m' ·ᵈ a := by
  rw [h]

lemma domAct_congr_right (m : M) {a a' : α} (h : a = a') : m ·ᵈ a = m ·ᵈ a' := by
  rw [h]

variable [Group M]

lemma inv_domAct_domAct (m : M) (a : α) : m⁻¹ ·ᵈ (m ·ᵈ a) = a := by
  rw [← mul_domAct, inv_mul_cancel, one_domAct]

lemma domAct_inv_domAct (m : M) (a : α) : m ·ᵈ (m⁻¹ ·ᵈ a) = a := by
  rw [← mul_domAct, mul_inv_cancel, one_domAct]

/-- The action of a group element as a carrier equivalence. -/
def domActEquiv (m : M) : α ≃ α where
  toFun a     := m ·ᵈ a
  invFun a    := m⁻¹ ·ᵈ a
  left_inv a  := inv_domAct_domAct m a
  right_inv a := domAct_inv_domAct m a

/-- `domActEquiv` is functorial: `(m * n) ↦ domActEquiv m ∘ domActEquiv n`. -/
lemma domActEquiv_mul (m n : M) :
    domActEquiv (α := α) (m * n) = domActEquiv m ∘ domActEquiv n := by
  ext a
  simp [domActEquiv, mul_domAct]

/-- The set of fixed points: elements fixed by every group element. -/
def fixedPoints : Set α := {a : α | ∀ m : M, m ·ᵈ a = a}

@[simp]
lemma mem_fixedPoints {a : α} : a ∈ fixedPoints ↔ ∀ m : M, m ·ᵈ a = a :=
  Iff.rfl

/-- The orbit of an element under the group action. -/
def orbit (a : α) : Set α := {b : α | ∃ m : M, m ·ᵈ a = b}

@[simp]
lemma mem_orbit {a b : α} : b ∈ orbit a ↔ ∃ m : M, m ·ᵈ a = b :=
  Iff.rfl

lemma mem_orbit_self (a : α) : a ∈ orbit a :=
  ⟨1, one_domAct a⟩

/-- The stabilizer of a point as a subgroup. -/
def stabilizer (a : α) : Subgroup M where
  carrier    := {m : M | m ·ᵈ a = a}
  one_mem'   := one_domAct a
  mul_mem'   := fun {m n} hm hn => by simp [mul_domAct, hm, hn]
  inv_mem'   := fun {m} hm => by
    have := inv_domAct_domAct m a
    rw [hm] at this ⊢
    simpa using this

@[simp]
lemma mem_stabilizer {a : α} {m : M} : m ∈ stabilizer a ↔ m ·ᵈ a = a :=
  Iff.rfl

end DomMulAct

end Mathlib.GroupTheory.GroupAction
