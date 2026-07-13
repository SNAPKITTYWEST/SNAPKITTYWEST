/- Self-contained core-Lean demo for sledgehammer.py.
   No imports: only rfl / decide / simp (core) are available here.
   The heavy ladder (ring, norm_num, omega, linarith, aesop) is skipped
   automatically because Mathlib is not in scope. -/

theorem e1 : 2 + 2 = 4 := by rfl

theorem e2 : (1 : Nat) + 1 = 2 := by rfl

theorem e3 : 0 + 0 = 0 := by rfl

theorem e4 (a : Nat) : a + 0 = a := by rfl

theorem e5 (a : Nat) : a * 1 = a := by simp

theorem e6 (a b : Nat) : a + b = b + a := by omega

theorem h1 (a b : Nat) : a * b = b * a := by sorry
