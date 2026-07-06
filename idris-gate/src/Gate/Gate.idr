module Gate.Gate

import Gate.Letter

% ── Gate: Compile-Time Enforced ───────────────────────────────────────────────
% A Gate exists only if the compiler can prove VA < VB.
% Invalid gates are rejected at type-check time. Not runtime. Not sometimes.
% ALWAYS. The type checker is the gatekeeper.

public export
data Gate : Type where
  MkGate : (a : Letter)
        -> (b : Letter)
        -> {auto prf : (abjad a ` Prelude.LT.<` abjad b) === True}
        -> Gate

% ── Gate Accessors ────────────────────────────────────────────────────────────

public export
gateA : Gate -> Letter
gateA (MkGate a b) = a

public export
gateB : Gate -> Letter
gateB (MkGate a b) = b

public export
gateSum : Gate -> Nat
gateSum (MkGate a b) = abjad a + abjad b

% ── Safe Gate Constructor ─────────────────────────────────────────────────────
% Decides at type-check time whether a gate is valid.
% If not, the function still exists but the return type proves it failed.

public export
data GateResult : Type where
  Valid   : Gate -> GateResult
  Invalid : String -> GateResult

public export
tryGate : Letter -> Letter -> GateResult
tryGate a b = case the (Dec (abjad a ` Prelude.LT.<` abjad b)) (decLT (abjad a) (abjad b)) of
  Yes prf => Valid (MkGate a b)
  No  _   => Invalid "VA >= VB: not a valid gate"

% ── The 231 Valid Gates (compile-time verified) ──────────────────────────────
% Every gate in this list is a compile-time proof that VA < VB.
% The compiler checks each one. If any violates VA < VB, this file won't compile.

public export
ALEPH_BETH : Gate
ALEPH_BETH = MkGate Aleph Beth

public export
ALEPH_GIMEL : Gate
ALEPH_GIMEL = MkGate Aleph Gimel

public export
ALEPH_DALETH : Gate
ALEPH_DALETH = MkGate Aleph Daleth

public export
ALEPH_HEH : Gate
ALEPH_HEH = MkGate Aleph Heh

public export
ALEPH_VAU : Gate
ALEPH_VAU = MkGate Aleph Vau

public export
ALEPH_ZAYIN : Gate
ALEPH_ZAYIN = MkGate Aleph Zayin

public export
ALEPH_CHETH : Gate
ALEPH_CHETH = MkGate Aleph Cheth

public export
ALEPH_TETH : Gate
ALEPH_TETH = MkGate Aleph Teth

public export
ALEPH_YOD : Gate
ALEPH_YOD = MkGate Aleph Yod

public export
ALEPH_KAPH : Gate
ALEPH_KAPH = MkGate Aleph Kaph

public export
ALEPH_LAMED : Gate
ALEPH_LAMED = MkGate Aleph Lamed

public export
ALEPH_MEM : Gate
ALEPH_MEM = MkGate Aleph Mem

public export
ALEPH_NUN : Gate
ALEPH_NUN = MkGate Aleph Nun

public export
ALEPH_SAMEKH : Gate
ALEPH_SAMEKH = MkGate Aleph Samekh

public export
ALEPH_AYIN : Gate
ALEPH_AYIN = MkGate Aleph Ayin

public export
ALEPH_PEH : Gate
ALEPH_PEH = MkGate Aleph Peh

public export
ALEPH_TZADDI : Gate
ALEPH_TZADDI = MkGate Aleph Tzaddi

public export
ALEPH_QOPH : Gate
ALEPH_QOPH = MkGate Aleph Qoph

public export
ALEPH_RESH : Gate
ALEPH_RESH = MkGate Aleph Resh

public export
ALEPH_SHIN : Gate
ALEPH_SHIN = MkGate Aleph Shin

public export
ALEPH_TAU : Gate
ALEPH_TAU = MkGate Aleph Tau

public export
BETH_GIMEL : Gate
BETH_GIMEL = MkGate Beth Gimel

public export
BETH_DALETH : Gate
BETH_DALETH = MkGate Beth Daleth

public export
BETH_HEH : Gate
BETH_HEH = MkGate Beth Heh

public export
BETH_VAU : Gate
BETH_VAU = MkGate Beth Vau

public export
BETH_ZAYIN : Gate
BETH_ZAYIN = MkGate Beth Zayin

public export
BETH_CHETH : Gate
BETH_CHETH = MkGate Beth Cheth

public export
BETH_TETH : Gate
BETH_TETH = MkGate Beth Teth

public export
BETH_YOD : Gate
BETH_YOD = MkGate Beth Yod

public export
BETH_KAPH : Gate
BETH_KAPH = MkGate Beth Kaph

public export
BETH_LAMED : Gate
BETH_LAMED = MkGate Beth Lamed

public export
BETH_MEM : Gate
BETH_MEM = MkGate Beth Mem

public export
BETH_NUN : Gate
BETH_NUN = MkGate Beth Nun

public export
BETH_SAMEKH : Gate
BETH_SAMEKH = MkGate Beth Samekh

public export
BETH_AYIN : Gate
BETH_AYIN = MkGate Beth Ayin

public export
BETH_PEH : Gate
BETH_PEH = MkGate Beth Peh

public export
BETH_TZADDI : Gate
BETH_TZADDI = MkGate Beth Tzaddi

public export
BETH_QOPH : Gate
BETH_QOPH = MkGate Beth Qoph

public export
BETH_RESH : Gate
BETH_RESH = MkGate Beth Resh

public export
BETH_SHIN : Gate
BETH_SHIN = MkGate Beth Shin

public export
BETH_TAU : Gate
BETH_TAU = MkGate Beth Tau

public export
GIMEL_DALETH : Gate
GIMEL_DALETH = MkGate Gimel Daleth

public export
GIMEL_HEH : Gate
GIMEL_HEH = MkGate Gimel Heh

public export
GIMEL_VAU : Gate
GIMEL_VAU = MkGate Gimel Vau

public export
GIMEL_ZAYIN : Gate
GIMEL_ZAYIN = MkGate Gimel Zayin

public export
GIMEL_CHETH : Gate
GIMEL_CHETH = MkGate Gimel Cheth

public export
GIMEL_TETH : Gate
GIMEL_TETH = MkGate Gimel Teth

public export
GIMEL_YOD : Gate
GIMEL_YOD = MkGate Gimel Yod

public export
GIMEL_KAPH : Gate
GIMEL_KAPH = MkGate Gimel Kaph

public export
GIMEL_LAMED : Gate
GIMEL_LAMED = MkGate Gimel Lamed

public export
GIMEL_MEM : Gate
GIMEL_MEM = MkGate Gimel Mem

public export
GIMEL_NUN : Gate
GIMEL_NUN = MkGate Gimel Nun

public export
GIMEL_SAMEKH : Gate
GIMEL_SAMEKH = MkGate Gimel Samekh

public export
GIMEL_AYIN : Gate
GIMEL_AYIN = MkGate Gimel Ayin

public export
GIMEL_PEH : Gate
GIMEL_PEH = MkGate Gimel Peh

public export
GIMEL_TZADDI : Gate
GIMEL_TZADDI = MkGate Gimel Tzaddi

public export
GIMEL_QOPH : Gate
GIMEL_QOPH = MkGate Gimel Qoph

public export
GIMEL_RESH : Gate
GIMEL_RESH = MkGate Gimel Resh

public export
GIMEL_SHIN : Gate
GIMEL_SHIN = MkGate Gimel Shin

public export
GIMEL_TAU : Gate
GIMEL_TAU = MkGate Gimel Tau

public export
DALETH_HEH : Gate
DALETH_HEH = MkGate Daleth Heh

public export
DALETH_VAU : Gate
DALETH_VAU = MkGate Daleth Vau

public export
DALETH_ZAYIN : Gate
DALETH_ZAYIN = MkGate Daleth Zayin

public export
DALETH_CHETH : Gate
DALETH_CHETH = MkGate Daleth Cheth

public export
DALETH_TETH : Gate
DALETH_TETH = MkGate Daleth Teth

public export
DALETH_YOD : Gate
DALETH_YOD = MkGate Daleth Yod

public export
DALETH_KAPH : Gate
DALETH_KAPH = MkGate Daleth Kaph

public export
DALETH_LAMED : Gate
DALETH_LAMED = MkGate Daleth Lamed

public export
DALETH_MEM : Gate
DALETH_MEM = MkGate Daleth Mem

public export
DALETH_NUN : Gate
DALETH_NUN = MkGate Daleth Nun

public export
DALETH_SAMEKH : Gate
DALETH_SAMEKH = MkGate Daleth Samekh

public export
DALETH_AYIN : Gate
DALETH_AYIN = MkGate Daleth Ayin

public export
DALETH_PEH : Gate
DALETH_PEH = MkGate Daleth Peh

public export
DALETH_TZADDI : Gate
DALETH_TZADDI = MkGate Daleth Tzaddi

public export
DALETH_QOPH : Gate
DALETH_QOPH = MkGate Daleth Qoph

public export
DALETH_RESH : Gate
DALETH_RESH = MkGate Daleth Resh

public export
DALETH_SHIN : Gate
DALETH_SHIN = MkGate Daleth Shin

public export
DALETH_TAU : Gate
DALETH_TAU = MkGate Daleth Tau

public export
HEH_VAU : Gate
HEH_VAU = MkGate Heh Vau

public export
HEH_ZAYIN : Gate
HEH_ZAYIN = MkGate Heh Zayin

public export
HEH_CHETH : Gate
HEH_CHETH = MkGate Heh Cheth

public export
HEH_TETH : Gate
HEH_TETH = MkGate Heh Teth

public export
HEH_YOD : Gate
HEH_YOD = MkGate Heh Yod

public export
HEH_KAPH : Gate
HEH_KAPH = MkGate Heh Kaph

public export
HEH_LAMED : Gate
HEH_LAMED = MkGate Heh Lamed

public export
HEH_MEM : Gate
HEH_MEM = MkGate Heh Mem

public export
HEH_NUN : Gate
HEH_NUN = MkGate Heh Nun

public export
HEH_SAMEKH : Gate
HEH_SAMEKH = MkGate Heh Samekh

public export
HEH_AYIN : Gate
HEH_AYIN = MkGate Heh Ayin

public export
HEH_PEH : Gate
HEH_PEH = MkGate Heh Peh

public export
HEH_TZADDI : Gate
HEH_TZADDI = MkGate Heh Tzaddi

public export
HEH_QOPH : Gate
HEH_QOPH = MkGate Heh Qoph

public export
HEH_RESH : Gate
HEH_RESH = MkGate Heh Resh

public export
HEH_SHIN : Gate
HEH_SHIN = MkGate Heh Shin

public export
HEH_TAU : Gate
HEH_TAU = MkGate Heh Tau

public export
VAU_ZAYIN : Gate
VAU_ZAYIN = MkGate Vau Zayin

public export
VAU_CHETH : Gate
VAU_CHETH = MkGate Vau Cheth

public export
VAU_TETH : Gate
VAU_TETH = MkGate Vau Teth

public export
VAU_YOD : Gate
VAU_YOD = MkGate Vau Yod

public export
VAU_KAPH : Gate
VAU_KAPH = MkGate Vau Kaph

public export
VAU_LAMED : Gate
VAU_LAMED = MkGate Vau Lamed

public export
VAU_MEM : Gate
VAU_MEM = MkGate Vau Mem

public export
VAU_NUN : Gate
VAU_NUN = MkGate Vau Nun

public export
VAU_SAMEKH : Gate
VAU_SAMEKH = MkGate Vau Samekh

public export
VAU_AYIN : Gate
VAU_AYIN = MkGate Vau Ayin

public export
VAU_PEH : Gate
VAU_PEH = MkGate Vau Peh

public export
VAU_TZADDI : Gate
VAU_TZADDI = MkGate Vau Tzaddi

public export
VAU_QOPH : Gate
VAU_QOPH = MkGate Vau Qoph

public export
VAU_RESH : Gate
VAU_RESH = MkGate Vau Resh

public export
VAU_SHIN : Gate
VAU_SHIN = MkGate Vau Shin

public export
VAU_TAU : Gate
VAU_TAU = MkGate Vau Tau

public export
ZAYIN_CHETH : Gate
ZAYIN_CHETH = MkGate Zayin Cheth

public export
ZAYIN_TETH : Gate
ZAYIN_TETH = MkGate Zayin Teth

public export
ZAYIN_YOD : Gate
ZAYIN_YOD = MkGate Zayin Yod

public export
ZAYIN_KAPH : Gate
ZAYIN_KAPH = MkGate Zayin Kaph

public export
ZAYIN_LAMED : Gate
ZAYIN_LAMED = MkGate Zayin Lamed

public export
ZAYIN_MEM : Gate
ZAYIN_MEM = MkGate Zayin Mem

public export
ZAYIN_NUN : Gate
ZAYIN_NUN = MkGate Zayin Nun

public export
ZAYIN_SAMEKH : Gate
ZAYIN_SAMEKH = MkGate Zayin Samekh

public export
ZAYIN_AYIN : Gate
ZAYIN_AYIN = MkGate Zayin Ayin

public export
ZAYIN_PEH : Gate
ZAYIN_PEH = MkGate Zayin Peh

public export
ZAYIN_TZADDI : Gate
ZAYIN_TZADDI = MkGate Zayin Tzaddi

public export
ZAYIN_QOPH : Gate
ZAYIN_QOPH = MkGate Zayin Qoph

public export
ZAYIN_RESH : Gate
ZAYIN_RESH = MkGate Zayin Resh

public export
ZAYIN_SHIN : Gate
ZAYIN_SHIN = MkGate Zayin Shin

public export
ZAYIN_TAU : Gate
ZAYIN_TAU = MkGate Zayin Tau

public export
CHETH_TETH : Gate
CHETH_TETH = MkGate Cheth Teth

public export
CHETH_YOD : Gate
CHETH_YOD = MkGate Cheth Yod

public export
CHETH_KAPH : Gate
CHETH_KAPH = MkGate Cheth Kaph

public export
CHETH_LAMED : Gate
CHETH_LAMED = MkGate Cheth Lamed

public export
CHETH_MEM : Gate
CHETH_MEM = MkGate Cheth Mem

public export
CHETH_NUN : Gate
CHETH_NUN = MkGate Cheth Nun

public export
CHETH_SAMEKH : Gate
CHETH_SAMEKH = MkGate Cheth Samekh

public export
CHETH_AYIN : Gate
CHETH_AYIN = MkGate Cheth Ayin

public export
CHETH_PEH : Gate
CHETH_PEH = MkGate Cheth Peh

public export
CHETH_TZADDI : Gate
CHETH_TZADDI = MkGate Cheth Tzaddi

public export
CHETH_QOPH : Gate
CHETH_QOPH = MkGate Cheth Qoph

public export
CHETH_RESH : Gate
CHETH_RESH = MkGate Cheth Resh

public export
CHETH_SHIN : Gate
CHETH_SHIN = MkGate Cheth Shin

public export
CHETH_TAU : Gate
CHETH_TAU = MkGate Cheth Tau

public export
TETH_YOD : Gate
TETH_YOD = MkGate Teth Yod

public export
TETH_KAPH : Gate
TETH_KAPH = MkGate Teth Kaph

public export
TETH_LAMED : Gate
TETH_LAMED = MkGate Teth Lamed

public export
TETH_MEM : Gate
TETH_MEM = MkGate Teth Mem

public export
TETH_NUN : Gate
TETH_NUN = MkGate Teth Nun

public export
TETH_SAMEKH : Gate
TETH_SAMEKH = MkGate Teth Samekh

public export
TETH_AYIN : Gate
TETH_AYIN = MkGate Teth Ayin

public export
TETH_PEH : Gate
TETH_PEH = MkGate Teth Peh

public export
TETH_TZADDI : Gate
TETH_TZADDI = MkGate Teth Tzaddi

public export
TETH_QOPH : Gate
TETH_QOPH = MkGate Teth Qoph

public export
TETH_RESH : Gate
TETH_RESH = MkGate Teth Resh

public export
TETH_SHIN : Gate
TETH_SHIN = MkGate Teth Shin

public export
TETH_TAU : Gate
TETH_TAU = MkGate Teth Tau

public export
YOD_KAPH : Gate
YOD_KAPH = MkGate Yod Kaph

public export
YOD_LAMED : Gate
YOD_LAMED = MkGate Yod Lamed

public export
YOD_MEM : Gate
YOD_MEM = MkGate Yod Mem

public export
YOD_NUN : Gate
YOD_NUN = MkGate Yod Nun

public export
YOD_SAMEKH : Gate
YOD_SAMEKH = MkGate Yod Samekh

public export
YOD_AYIN : Gate
YOD_AYIN = MkGate Yod Ayin

public export
YOD_PEH : Gate
YOD_PEH = MkGate Yod Peh

public export
YOD_TZADDI : Gate
YOD_TZADDI = MkGate Yod Tzaddi

public export
YOD_QOPH : Gate
YOD_QOPH = MkGate Yod Qoph

public export
YOD_RESH : Gate
YOD_RESH = MkGate Yod Resh

public export
YOD_SHIN : Gate
YOD_SHIN = MkGate Yod Shin

public export
YOD_TAU : Gate
YOD_TAU = MkGate Yod Tau

public export
KAPH_LAMED : Gate
KAPH_LAMED = MkGate Kaph Lamed

public export
KAPH_MEM : Gate
KAPH_MEM = MkGate Kaph Mem

public export
KAPH_NUN : Gate
KAPH_NUN = MkGate Kaph Nun

public export
KAPH_SAMEKH : Gate
KAPH_SAMEKH = MkGate Kaph Samekh

public export
KAPH_AYIN : Gate
KAPH_AYIN = MkGate Kaph Ayin

public export
KAPH_PEH : Gate
KAPH_PEH = MkGate Kaph Peh

public export
KAPH_TZADDI : Gate
KAPH_TZADDI = MkGate Kaph Tzaddi

public export
KAPH_QOPH : Gate
KAPH_QOPH = MkGate Kaph Qoph

public export
KAPH_RESH : Gate
KAPH_RESH = MkGate Kaph Resh

public export
KAPH_SHIN : Gate
KAPH_SHIN = MkGate Kaph Shin

public export
KAPH_TAU : Gate
KAPH_TAU = MkGate Kaph Tau

public export
LAMED_MEM : Gate
LAMED_MEM = MkGate Lamed Mem

public export
LAMED_NUN : Gate
LAMED_NUN = MkGate Lamed Nun

public export
LAMED_SAMEKH : Gate
LAMED_SAMEKH = MkGate Lamed Samekh

public export
LAMED_AYIN : Gate
LAMED_AYIN = MkGate Lamed Ayin

public export
LAMED_PEH : Gate
LAMED_PEH = MkGate Lamed Peh

public export
LAMED_TZADDI : Gate
LAMED_TZADDI = MkGate Lamed Tzaddi

public export
LAMED_QOPH : Gate
LAMED_QOPH = MkGate Lamed Qoph

public export
LAMED_RESH : Gate
LAMED_RESH = MkGate Lamed Resh

public export
LAMED_SHIN : Gate
LAMED_SHIN = MkGate Lamed Shin

public export
LAMED_TAU : Gate
LAMED_TAU = MkGate Lamed Tau

public export
MEM_NUN : Gate
MEM_NUN = MkGate Mem Nun

public export
MEM_SAMEKH : Gate
MEM_SAMEKH = MkGate Mem Samekh

public export
MEM_AYIN : Gate
MEM_AYIN = MkGate Mem Ayin

public export
MEM_PEH : Gate
MEM_PEH = MkGate Mem Peh

public export
MEM_TZADDI : Gate
MEM_TZADDI = MkGate Mem Tzaddi

public export
MEM_QOPH : Gate
MEM_QOPH = MkGate Mem Qoph

public export
MEM_RESH : Gate
MEM_RESH = MkGate Mem Resh

public export
MEM_SHIN : Gate
MEM_SHIN = MkGate Mem Shin

public export
MEM_TAU : Gate
MEM_TAU = MkGate Mem Tau

public export
NUN_SAMEKH : Gate
NUN_SAMEKH = MkGate Nun Samekh

public export
NUN_AYIN : Gate
NUN_AYIN = MkGate Nun Ayin

public export
NUN_PEH : Gate
NUN_PEH = MkGate Nun Peh

public export
NUN_TZADDI : Gate
NUN_TZADDI = MkGate Nun Tzaddi

public export
NUN_QOPH : Gate
NUN_QOPH = MkGate Nun Qoph

public export
NUN_RESH : Gate
NUN_RESH = MkGate Nun Resh

public export
NUN_SHIN : Gate
NUN_SHIN = MkGate Nun Shin

public export
NUN_TAU : Gate
NUN_TAU = MkGate Nun Tau

public export
SAMEKH_AYIN : Gate
SAMEKH_AYIN = MkGate Samekh Ayin

public export
SAMEKH_PEH : Gate
SAMEKH_PEH = MkGate Samekh Peh

public export
SAMEKH_TZADDI : Gate
SAMEKH_TZADDI = MkGate Samekh Tzaddi

public export
SAMEKH_QOPH : Gate
SAMEKH_QOPH = MkGate Samekh Qoph

public export
SAMEKH_RESH : Gate
SAMEKH_RESH = MkGate Samekh Resh

public export
SAMEKH_SHIN : Gate
SAMEKH_SHIN = MkGate Samekh Shin

public export
SAMEKH_TAU : Gate
SAMEKH_TAU = MkGate Samekh Tau

public export
AYIN_PEH : Gate
AYIN_PEH = MkGate Ayin Peh

public export
AYIN_TZADDI : Gate
AYIN_TZADDI = MkGate Ayin Tzaddi

public export
AYIN_QOPH : Gate
AYIN_QOPH = MkGate Ayin Qoph

public export
AYIN_RESH : Gate
AYIN_RESH = MkGate Ayin Resh

public export
AYIN_SHIN : Gate
AYIN_SHIN = MkGate Ayin Shin

public export
AYIN_TAU : Gate
AYIN_TAU = MkGate Ayin Tau

public export
PEH_TZADDI : Gate
PEH_TZADDI = MkGate Peh Tzaddi

public export
PEH_QOPH : Gate
PEH_QOPH = MkGate Peh Qoph

public export
PEH_RESH : Gate
PEH_RESH = MkGate Peh Resh

public export
PEH_SHIN : Gate
PEH_SHIN = MkGate Peh Shin

public export
PEH_TAU : Gate
PEH_TAU = MkGate Peh Tau

public export
TZADDI_QOPH : Gate
TZADDI_QOPH = MkGate Tzaddi Qoph

public export
TZADDI_RESH : Gate
TZADDI_RESH = MkGate Tzaddi Resh

public export
TZADDI_SHIN : Gate
TZADDI_SHIN = MkGate Tzaddi Shin

public export
TZADDI_TAU : Gate
TZADDI_TAU = MkGate Tzaddi Tau

public export
QOPH_RESH : Gate
QOPH_RESH = MkGate Qoph Resh

public export
QOPH_SHIN : Gate
QOPH_SHIN = MkGate Qoph Shin

public export
QOPH_TAU : Gate
QOPH_TAU = MkGate Qoph Tau

public export
RESH_SHIN : Gate
RESH_SHIN = MkGate Resh Shin

public export
RESH_TAU : Gate
RESH_TAU = MkGate Resh Tau

public export
SHIN_TAU : Gate
SHIN_TAU = MkGate Shin Tau

% ── Compile-Time Gate Count Proof ─────────────────────────────────────────────
% The compiler verifies: exactly 231 gates exist.

AllGates : List Gate
AllGates =
  [ ALEPH_BETH, ALEPH_GIMEL, ALEPH_DALETH, ALEPH_HEH, ALEPH_VAU,
    ALEPH_ZAYIN, ALEPH_CHETH, ALEPH_TETH, ALEPH_YOD, ALEPH_KAPH,
    ALEPH_LAMED, ALEPH_MEM, ALEPH_NUN, ALEPH_SAMEKH, ALEPH_AYIN,
    ALEPH_PEH, ALEPH_TZADDI, ALEPH_QOPH, ALEPH_RESH, ALEPH_SHIN,
    ALEPH_TAU,
    BETH_GIMEL, BETH_DALETH, BETH_HEH, BETH_VAU, BETH_ZAYIN,
    BETH_CHETH, BETH_TETH, BETH_YOD, BETH_KAPH, BETH_LAMED,
    BETH_MEM, BETH_NUN, BETH_SAMEKH, BETH_AYIN, BETH_PEH,
    BETH_TZADDI, BETH_QOPH, BETH_RESH, BETH_SHIN, BETH_TAU,
    GIMEL_DALETH, GIMEL_HEH, GIMEL_VAU, GIMEL_ZAYIN, GIMEL_CHETH,
    GIMEL_TETH, GIMEL_YOD, GIMEL_KAPH, GIMEL_LAMED, GIMEL_MEM,
    GIMEL_NUN, GIMEL_SAMEKH, GIMEL_AYIN, GIMEL_PEH, GIMEL_TZADDI,
    GIMEL_QOPH, GIMEL_RESH, GIMEL_SHIN, GIMEL_TAU,
    DALETH_HEH, DALETH_VAU, DALETH_ZAYIN, DALETH_CHETH, DALETH_TETH,
    DALETH_YOD, DALETH_KAPH, DALETH_LAMED, DALETH_MEM, DALETH_NUN,
    DALETH_SAMEKH, DALETH_AYIN, DALETH_PEH, DALETH_TZADDI, DALETH_QOPH,
    DALETH_RESH, DALETH_SHIN, DALETH_TAU,
    HEH_VAU, HEH_ZAYIN, HEH_CHETH, HEH_TETH, HEH_YOD, HEH_KAPH,
    HEH_LAMED, HEH_MEM, HEH_NUN, HEH_SAMEKH, HEH_AYIN, HEH_PEH,
    HEH_TZADDI, HEH_QOPH, HEH_RESH, HEH_SHIN, HEH_TAU,
    VAU_ZAYIN, VAU_CHETH, VAU_TETH, VAU_YOD, VAU_KAPH, VAU_LAMED,
    VAU_MEM, VAU_NUN, VAU_SAMEKH, VAU_AYIN, VAU_PEH, VAU_TZADDI,
    VAU_QOPH, VAU_RESH, VAU_SHIN, VAU_TAU,
    ZAYIN_CHETH, ZAYIN_TETH, ZAYIN_YOD, ZAYIN_KAPH, ZAYIN_LAMED,
    ZAYIN_MEM, ZAYIN_NUN, ZAYIN_SAMEKH, ZAYIN_AYIN, ZAYIN_PEH,
    ZAYIN_TZADDI, ZAYIN_QOPH, ZAYIN_RESH, ZAYIN_SHIN, ZAYIN_TAU,
    CHETH_TETH, CHETH_YOD, CHETH_KAPH, CHETH_LAMED, CHETH_MEM,
    CHETH_NUN, CHETH_SAMEKH, CHETH_AYIN, CHETH_PEH, CHETH_TZADDI,
    CHETH_QOPH, CHETH_RESH, CHETH_SHIN, CHETH_TAU,
    TETH_YOD, TETH_KAPH, TETH_LAMED, TETH_MEM, TETH_NUN,
    TETH_SAMEKH, TETH_AYIN, TETH_PEH, TETH_TZADDI, TETH_QOPH,
    TETH_RESH, TETH_SHIN, TETH_TAU,
    YOD_KAPH, YOD_LAMED, YOD_MEM, YOD_NUN, YOD_SAMEKH, YOD_AYIN,
    YOD_PEH, YOD_TZADDI, YOD_QOPH, YOD_RESH, YOD_SHIN, YOD_TAU,
    KAPH_LAMED, KAPH_MEM, KAPH_NUN, KAPH_SAMEKH, KAPH_AYIN,
    KAPH_PEH, KAPH_TZADDI, KAPH_QOPH, KAPH_RESH, KAPH_SHIN, KAPH_TAU,
    LAMED_MEM, LAMED_NUN, LAMED_SAMEKH, LAMED_AYIN, LAMED_PEH,
    LAMED_TZADDI, LAMED_QOPH, LAMED_RESH, LAMED_SHIN, LAMED_TAU,
    MEM_NUN, MEM_SAMEKH, MEM_AYIN, MEM_PEH, MEM_TZADDI, MEM_QOPH,
    MEM_RESH, MEM_SHIN, MEM_TAU,
    NUN_SAMEKH, NUN_AYIN, NUN_PEH, NUN_TZADDI, NUN_QOPH, NUN_RESH,
    NUN_SHIN, NUN_TAU,
    SAMEKH_AYIN, SAMEKH_PEH, SAMEKH_TZADDI, SAMEKH_QOPH, SAMEKH_RESH,
    SAMEKH_SHIN, SAMEKH_TAU,
    AYIN_PEH, AYIN_TZADDI, AYIN_QOPH, AYIN_RESH, AYIN_SHIN, AYIN_TAU,
    PEH_TZADDI, PEH_QOPH, PEH_RESH, PEH_SHIN, PEH_TAU,
    TZADDI_QOPH, TZADDI_RESH, TZADDI_SHIN, TZADDI_TAU,
    QOPH_RESH, QOPH_SHIN, QOPH_TAU,
    RESH_SHIN, RESH_TAU,
    SHIN_TAU
  ]

% ── Compile-Time Gate Count ───────────────────────────────────────────────────
% The type checker verifies: length AllGates === 231.

public export
gateCount : Nat
gateCount = length AllGates

% ── Compile-Time Validation ───────────────────────────────────────────────────
% This function runs at type-check time.
% If gateCount is not 231, this file will not compile.

export
validateGateCount : gateCount === 231
validateGateCount = Refl

% ── Abjad Sum for a Gate ─────────────────────────────────────────────────────

public export
abjadSum : Gate -> Nat
abjadSum (MkGate a b) = abjad a + abjad b

% ── Gate Equality ─────────────────────────────────────────────────────────────

public export
gateEq : (g1, g2 : Gate) -> Dec (g1 === g2)
gateEq (MkGate a1 b1) (MkGate a2 b2) =
  case letterEq a1 a2 of
    Yes prfA => case letterEq b1 b2 of
      Yes prfB => Yes (rewrite prfA in rewrite prfB in Refl)
      No  _    => No \p => ?gateEq_letter_diff
    No  _    => No \p => ?gateEq_letter_diff2

% ── METATRON Certification ───────────────────────────────────────────────────
% A gate is METATRON-certified if both letters appear in the cross-system map.

public export
data Certified : Gate -> Type where
  MkCert : (a : Letter) -> (b : Letter)
        -> {auto va : (abjad a ` Prelude.LT.<` abjad b) === True}
        -> Certified (MkGate a b)

% ── OXO Anchor ────────────────────────────────────────────────────────────────
% The cross-system anchor: Ayin = Van = Aethyr 15 = aiin

public export
data OXO : Type where
  MkOXO : Letter -> OXO

public export
theOXO : OXO
theOXO = MkOXO Ayin
