import SAUTOCODE.MTheory

open S_AUTOCODE_MTheory

/-! Numeric witnesses for I4_56 homogeneity on the true 56-dim E7 rep.
   Three independent tests — sparse, fully-coupled diagonal, off-diagonal.
   All must give ratio = 2^4 = 16.000000 exactly. -/

def zeroOct : Octonion := ⟨0,0,0,0,0,0,0,0⟩

-- sparse: α=1, β=1, P=diag(1,0,0), Q=diag(0,1,0)
def testSparse : State56 :=
  { alpha := 1.0, beta := 1.0
    P := { d1:=1.0, d2:=0.0, d3:=0.0, o12:=zeroOct, o23:=zeroOct, o31:=zeroOct }
    Q := { d1:=0.0, d2:=1.0, d3:=0.0, o12:=zeroOct, o23:=zeroOct, o31:=zeroOct } }

-- diagonal: α=1, β=1, P=Q=diag(1,1,1)
def testDiag : State56 :=
  { alpha := 1.0, beta := 1.0
    P := { d1:=1.0, d2:=1.0, d3:=1.0, o12:=zeroOct, o23:=zeroOct, o31:=zeroOct }
    Q := { d1:=1.0, d2:=1.0, d3:=1.0, o12:=zeroOct, o23:=zeroOct, o31:=zeroOct } }

-- off-diagonal: α=3, β=5, P=diag(2,0,0), Q=diag(0,0,7)
def testOffDiag : State56 :=
  { alpha := 3.0, beta := 5.0
    P := { d1:=2.0, d2:=0.0, d3:=0.0, o12:=zeroOct, o23:=zeroOct, o31:=zeroOct }
    Q := { d1:=0.0, d2:=0.0, d3:=7.0, o12:=zeroOct, o23:=zeroOct, o31:=zeroOct } }

#eval "sparse:   ratio=" ++ toString (I4_56 (s56Scale 2.0 testSparse)  / I4_56 testSparse)
#eval "diagonal: ratio=" ++ toString (I4_56 (s56Scale 2.0 testDiag)    / I4_56 testDiag)
#eval "offdiag:  ratio=" ++ toString (I4_56 (s56Scale 2.0 testOffDiag) / I4_56 testOffDiag)
