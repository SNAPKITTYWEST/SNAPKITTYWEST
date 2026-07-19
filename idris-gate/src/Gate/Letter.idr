module Gate.Letter

% ── 22 Hebrew Letters ─────────────────────────────────────────────────────────
% Each letter is a distinct type-level atom.
% The compiler knows every letter. Unknown atoms are rejected at type-check.

public export
data Letter : Type where
  Aleph   : Letter
  Beth    : Letter
  Gimel   : Letter
  Daleth  : Letter
  Heh     : Letter
  Vau     : Letter
  Zayin   : Letter
  Cheth   : Letter
  Teth    : Letter
  Yod     : Letter
  Kaph    : Letter
  Lamed   : Letter
  Mem     : Letter
  Nun     : Letter
  Samekh  : Letter
  Ayin    : Letter
  Peh     : Letter
  Tzaddi  : Letter
  Qoph    : Letter
  Resh    : Letter
  Shin    : Letter
  Tau     : Letter

% ── Abjad Values ──────────────────────────────────────────────────────────────
% Compile-time function: Letter -> Nat.
% Maps each letter to its abjad numeric value.
% The compiler reduces this at type-check time.

public export
abjad : Letter -> Nat
abjad Aleph   = 1
abjad Beth    = 2
abjad Gimel   = 3
abjad Daleth  = 4
abjad Heh     = 5
abjad Vau     = 6
abjad Zayin   = 7
abjad Cheth   = 8
abjad Teth    = 9
abjad Yod     = 10
abjad Kaph    = 20
abjad Lamed   = 30
abjad Mem     = 40
abjad Nun     = 50
abjad Samekh  = 60
abjad Ayin    = 70
abjad Peh     = 80
abjad Tzaddi  = 90
abjad Qoph    = 100
abjad Resh    = 200
abjad Shin    = 300
abjad Tau     = 400

% ── Enriched Letter ───────────────────────────────────────────────────────────
% Pairs a letter with its abjad value.
% The compiler verifies the value matches the letter.

public export
record LetterVal where
  constructor MkLetterVal
  letter : Letter
  val    : Nat
  prf    : val === abjad letter

% Smart constructor: compile-time checked
public export
mkLetterVal : (l : Letter) -> LetterVal
mkLetterVal l = MkLetterVal l (abjad l) Refl

% ── Decidable Equality ────────────────────────────────────────────────────────

public export
letterEq : (a, b : Letter) -> Dec (a === b)
letterEq Aleph   Aleph   = Yes Refl
letterEq Beth    Beth    = Yes Refl
letterEq Gimel   Gimel   = Yes Refl
letterEq Daleth  Daleth  = Yes Refl
letterEq Heh     Heh     = Yes Refl
letterEq Vau     Vau     = Yes Refl
letterEq Zayin   Zayin   = Yes Refl
letterEq Cheth   Cheth   = Yes Refl
letterEq Teth    Teth    = Yes Refl
letterEq Yod     Yod     = Yes Refl
letterEq Kaph    Kaph    = Yes Refl
letterEq Lamed   Lamed   = Yes Refl
letterEq Mem     Mem     = Yes Refl
letterEq Nun     Nun     = Yes Refl
letterEq Samekh  Samekh  = Yes Refl
letterEq Ayin    Ayin    = Yes Refl
letterEq Peh     Peh     = Yes Refl
letterEq Tzaddi  Tzaddi  = Yes Refl
letterEq Qoph    Qoph    = Yes Refl
letterEq Resh    Resh    = Yes Refl
letterEq Shin    Shin    = Yes Refl
letterEq Tau     Tau     = Yes Refl
letterEq Aleph   Beth    = No \p => absurd p
letterEq Aleph   Gimel   = No \p => absurd p
letterEq Aleph   Daleth  = No \p => absurd p
letterEq Aleph   Heh     = No \p => absurd p
letterEq Aleph   Vau     = No \p => absurd p
letterEq Aleph   Zayin   = No \p => absurd p
letterEq Aleph   Cheth   = No \p => absurd p
letterEq Aleph   Teth    = No \p => absurd p
letterEq Aleph   Yod     = No \p => absurd p
letterEq Aleph   Kaph    = No \p => absurd p
letterEq Aleph   Lamed   = No \p => absurd p
letterEq Aleph   Mem     = No \p => absurd p
letterEq Aleph   Nun     = No \p => absurd p
letterEq Aleph   Samekh  = No \p => absurd p
letterEq Aleph   Ayin    = No \p => absurd p
letterEq Aleph   Peh     = No \p => absurd p
letterEq Aleph   Tzaddi  = No \p => absurd p
letterEq Aleph   Qoph    = No \p => absurd p
letterEq Aleph   Resh    = No \p => absurd p
letterEq Aleph   Shin    = No \p => absurd p
letterEq Aleph   Tau     = No \p => absurd p
letterEq Beth    Aleph   = No \p => absurd p
letterEq Beth    Gimel   = No \p => absurd p
letterEq Beth    Daleth  = No \p => absurd p
letterEq Beth    Heh     = No \p => absurd p
letterEq Beth    Vau     = No \p => absurd p
letterEq Beth    Zayin   = No \p => absurd p
letterEq Beth    Cheth   = No \p => absurd p
letterEq Beth    Teth    = No \p => absurd p
letterEq Beth    Yod     = No \p => absurd p
letterEq Beth    Kaph    = No \p => absurd p
letterEq Beth    Lamed   = No \p => absurd p
letterEq Beth    Mem     = No \p => absurd p
letterEq Beth    Nun     = No \p => absurd p
letterEq Beth    Samekh  = No \p => absurd p
letterEq Beth    Ayin    = No \p => absurd p
letterEq Beth    Peh     = No \p => absurd p
letterEq Beth    Tzaddi  = No \p => absurd p
letterEq Beth    Qoph    = No \p => absurd p
letterEq Beth    Resh    = No \p => absurd p
letterEq Beth    Shin    = No \p => absurd p
letterEq Beth    Tau     = No \p => absurd p
letterEq Gimel   Aleph   = No \p => absurd p
letterEq Gimel   Beth    = No \p => absurd p
letterEq Gimel   Daleth  = No \p => absurd p
letterEq Gimel   Heh     = No \p => absurd p
letterEq Gimel   Vau     = No \p => absurd p
letterEq Gimel   Zayin   = No \p => absurd p
letterEq Gimel   Cheth   = No \p => absurd p
letterEq Gimel   Teth    = No \p => absurd p
letterEq Gimel   Yod     = No \p => absurd p
letterEq Gimel   Kaph    = No \p => absurd p
letterEq Gimel   Lamed   = No \p => absurd p
letterEq Gimel   Mem     = No \p => absurd p
letterEq Gimel   Nun     = No \p => absurd p
letterEq Gimel   Samekh  = No \p => absurd p
letterEq Gimel   Ayin    = No \p => absurd p
letterEq Gimel   Peh     = No \p => absurd p
letterEq Gimel   Tzaddi  = No \p => absurd p
letterEq Gimel   Qoph    = No \p => absurd p
letterEq Gimel   Resh    = No \p => absurd p
letterEq Gimel   Shin    = No \p => absurd p
letterEq Gimel   Tau     = No \p => absurd p
letterEq Daleth  Aleph   = No \p => absurd p
letterEq Daleth  Beth    = No \p => absurd p
letterEq Daleth  Gimel   = No \p => absurd p
letterEq Daleth  Heh     = No \p => absurd p
letterEq Daleth  Vau     = No \p => absurd p
letterEq Daleth  Zayin   = No \p => absurd p
letterEq Daleth  Cheth   = No \p => absurd p
letterEq Daleth  Teth    = No \p => absurd p
letterEq Daleth  Yod     = No \p => absurd p
letterEq Daleth  Kaph    = No \p => absurd p
letterEq Daleth  Lamed   = No \p => absurd p
letterEq Daleth  Mem     = No \p => absurd p
letterEq Daleth  Nun     = No \p => absurd p
letterEq Daleth  Samekh  = No \p => absurd p
letterEq Daleth  Ayin    = No \p => absurd p
letterEq Daleth  Peh     = No \p => absurd p
letterEq Daleth  Tzaddi  = No \p => absurd p
letterEq Daleth  Qoph    = No \p => absurd p
letterEq Daleth  Resh    = No \p => absurd p
letterEq Daleth  Shin    = No \p => absurd p
letterEq Daleth  Tau     = No \p => absurd p
letterEq Heh     Aleph   = No \p => absurd p
letterEq Heh     Beth    = No \p => absurd p
letterEq Heh     Gimel   = No \p => absurd p
letterEq Heh     Daleth  = No \p => absurd p
letterEq Heh     Vau     = No \p => absurd p
letterEq Heh     Zayin   = No \p => absurd p
letterEq Heh     Cheth   = No \p => absurd p
letterEq Heh     Teth    = No \p => absurd p
letterEq Heh     Yod     = No \p => absurd p
letterEq Heh     Kaph    = No \p => absurd p
letterEq Heh     Lamed   = No \p => absurd p
letterEq Heh     Mem     = No \p => absurd p
letterEq Heh     Nun     = No \p => absurd p
letterEq Heh     Samekh  = No \p => absurd p
letterEq Heh     Ayin    = No \p => absurd p
letterEq Heh     Peh     = No \p => absurd p
letterEq Heh     Tzaddi  = No \p => absurd p
letterEq Heh     Qoph    = No \p => absurd p
letterEq Heh     Resh    = No \p => absurd p
letterEq Heh     Shin    = No \p => absurd p
letterEq Heh     Tau     = No \p => absurd p
letterEq Vau     Aleph   = No \p => absurd p
letterEq Vau     Beth    = No \p => absurd p
letterEq Vau     Gimel   = No \p => absurd p
letterEq Vau     Daleth  = No \p => absurd p
letterEq Vau     Heh     = No \p => absurd p
letterEq Vau     Zayin   = No \p => absurd p
letterEq Vau     Cheth   = No \p => absurd p
letterEq Vau     Teth    = No \p => absurd p
letterEq Vau     Yod     = No \p => absurd p
letterEq Vau     Kaph    = No \p => absurd p
letterEq Vau     Lamed   = No \p => absurd p
letterEq Vau     Mem     = No \p => absurd p
letterEq Vau     Nun     = No \p => absurd p
letterEq Vau     Samekh  = No \p => absurd p
letterEq Vau     Ayin    = No \p => absurd p
letterEq Vau     Peh     = No \p => absurd p
letterEq Vau     Tzaddi  = No \p => absurd p
letterEq Vau     Qoph    = No \p => absurd p
letterEq Vau     Resh    = No \p => absurd p
letterEq Vau     Shin    = No \p => absurd p
letterEq Vau     Tau     = No \p => absurd p
letterEq Zayin   Aleph   = No \p => absurd p
letterEq Zayin   Beth    = No \p => absurd p
letterEq Zayin   Gimel   = No \p => absurd p
letterEq Zayin   Daleth  = No \p => absurd p
letterEq Zayin   Heh     = No \p => absurd p
letterEq Zayin   Vau     = No \p => absurd p
letterEq Zayin   Cheth   = No \p => absurd p
letterEq Zayin   Teth    = No \p => absurd p
letterEq Zayin   Yod     = No \p => absurd p
letterEq Zayin   Kaph    = No \p => absurd p
letterEq Zayin   Lamed   = No \p => absurd p
letterEq Zayin   Mem     = No \p => absurd p
letterEq Zayin   Nun     = No \p => absurd p
letterEq Zayin   Samekh  = No \p => absurd p
letterEq Zayin   Ayin    = No \p => absurd p
letterEq Zayin   Peh     = No \p => absurd p
letterEq Zayin   Tzaddi  = No \p => absurd p
letterEq Zayin   Qoph    = No \p => absurd p
letterEq Zayin   Resh    = No \p => absurd p
letterEq Zayin   Shin    = No \p => absurd p
letterEq Zayin   Tau     = No \p => absurd p
letterEq Cheth   Aleph   = No \p => absurd p
letterEq Cheth   Beth    = No \p => absurd p
letterEq Cheth   Gimel   = No \p => absurd p
letterEq Cheth   Daleth  = No \p => absurd p
letterEq Cheth   Heh     = No \p => absurd p
letterEq Cheth   Vau     = No \p => absurd p
letterEq Cheth   Zayin   = No \p => absurd p
letterEq Cheth   Teth    = No \p => absurd p
letterEq Cheth   Yod     = No \p => absurd p
letterEq Cheth   Kaph    = No \p => absurd p
letterEq Cheth   Lamed   = No \p => absurd p
letterEq Cheth   Mem     = No \p => absurd p
letterEq Cheth   Nun     = No \p => absurd p
letterEq Cheth   Samekh  = No \p => absurd p
letterEq Cheth   Ayin    = No \p => absurd p
letterEq Cheth   Peh     = No \p => absurd p
letterEq Cheth   Tzaddi  = No \p => absurd p
letterEq Cheth   Qoph    = No \p => absurd p
letterEq Cheth   Resh    = No \p => absurd p
letterEq Cheth   Shin    = No \p => absurd p
letterEq Cheth   Tau     = No \p => absurd p
letterEq Teth    Aleph   = No \p => absurd p
letterEq Teth    Beth    = No \p => absurd p
letterEq Teth    Gimel   = No \p => absurd p
letterEq Teth    Daleth  = No \p => absurd p
letterEq Teth    Heh     = No \p => absurd p
letterEq Teth    Vau     = No \p => absurd p
letterEq Teth    Zayin   = No \p => absurd p
letterEq Teth    Cheth   = No \p => absurd p
letterEq Teth    Yod     = No \p => absurd p
letterEq Teth    Kaph    = No \p => absurd p
letterEq Teth    Lamed   = No \p => absurd p
letterEq Teth    Mem     = No \p => absurd p
letterEq Teth    Nun     = No \p => absurd p
letterEq Teth    Samekh  = No \p => absurd p
letterEq Teth    Ayin    = No \p => absurd p
letterEq Teth    Peh     = No \p => absurd p
letterEq Teth    Tzaddi  = No \p => absurd p
letterEq Teth    Qoph    = No \p => absurd p
letterEq Teth    Resh    = No \p => absurd p
letterEq Teth    Shin    = No \p => absurd p
letterEq Teth    Tau     = No \p => absurd p
letterEq Yod     Aleph   = No \p => absurd p
letterEq Yod     Beth    = No \p => absurd p
letterEq Yod     Gimel   = No \p => absurd p
letterEq Yod     Daleth  = No \p => absurd p
letterEq Yod     Heh     = No \p => absurd p
letterEq Yod     Vau     = No \p => absurd p
letterEq Yod     Zayin   = No \p => absurd p
letterEq Yod     Cheth   = No \p => absurd p
letterEq Yod     Teth    = No \p => absurd p
letterEq Yod     Kaph    = No \p => absurd p
letterEq Yod     Lamed   = No \p => absurd p
letterEq Yod     Mem     = No \p => absurd p
letterEq Yod     Nun     = No \p => absurd p
letterEq Yod     Samekh  = No \p => absurd p
letterEq Yod     Ayin    = No \p => absurd p
letterEq Yod     Peh     = No \p => absurd p
letterEq Yod     Tzaddi  = No \p => absurd p
letterEq Yod     Qoph    = No \p => absurd p
letterEq Yod     Resh    = No \p => absurd p
letterEq Yod     Shin    = No \p => absurd p
letterEq Yod     Tau     = No \p => absurd p
letterEq Kaph    Aleph   = No \p => absurd p
letterEq Kaph    Beth    = No \p => absurd p
letterEq Kaph    Gimel   = No \p => absurd p
letterEq Kaph    Daleth  = No \p => absurd p
letterEq Kaph    Heh     = No \p => absurd p
letterEq Kaph    Vau     = No \p => absurd p
letterEq Kaph    Zayin   = No \p => absurd p
letterEq Kaph    Cheth   = No \p => absurd p
letterEq Kaph    Teth    = No \p => absurd p
letterEq Kaph    Yod     = No \p => absurd p
letterEq Kaph    Lamed   = No \p => absurd p
letterEq Kaph    Mem     = No \p => absurd p
letterEq Kaph    Nun     = No \p => absurd p
letterEq Kaph    Samekh  = No \p => absurd p
letterEq Kaph    Ayin    = No \p => absurd p
letterEq Kaph    Peh     = No \p => absurd p
letterEq Kaph    Tzaddi  = No \p => absurd p
letterEq Kaph    Qoph    = No \p => absurd p
letterEq Kaph    Resh    = No \p => absurd p
letterEq Kaph    Shin    = No \p => absurd p
letterEq Kaph    Tau     = No \p => absurd p
letterEq Lamed   Aleph   = No \p => absurd p
letterEq Lamed   Beth    = No \p => absurd p
letterEq Lamed   Gimel   = No \p => absurd p
letterEq Lamed   Daleth  = No \p => absurd p
letterEq Lamed   Heh     = No \p => absurd p
letterEq Lamed   Vau     = No \p => absurd p
letterEq Lamed   Zayin   = No \p => absurd p
letterEq Lamed   Cheth   = No \p => absurd p
letterEq Lamed   Teth    = No \p => absurd p
letterEq Lamed   Yod     = No \p => absurd p
letterEq Lamed   Kaph    = No \p => absurd p
letterEq Lamed   Mem     = No \p => absurd p
letterEq Lamed   Nun     = No \p => absurd p
letterEq Lamed   Samekh  = No \p => absurd p
letterEq Lamed   Ayin    = No \p => absurd p
letterEq Lamed   Peh     = No \p => absurd p
letterEq Lamed   Tzaddi  = No \p => absurd p
letterEq Lamed   Qoph    = No \p => absurd p
letterEq Lamed   Resh    = No \p => absurd p
letterEq Lamed   Shin    = No \p => absurd p
letterEq Lamed   Tau     = No \p => absurd p
letterEq Mem     Aleph   = No \p => absurd p
letterEq Mem     Beth    = No \p => absurd p
letterEq Mem     Gimel   = No \p => absurd p
letterEq Mem     Daleth  = No \p => absurd p
letterEq Mem     Heh     = No \p => absurd p
letterEq Mem     Vau     = No \p => absurd p
letterEq Mem     Zayin   = No \p => absurd p
letterEq Mem     Cheth   = No \p => absurd p
letterEq Mem     Teth    = No \p => absurd p
letterEq Mem     Yod     = No \p => absurd p
letterEq Mem     Kaph    = No \p => absurd p
letterEq Mem     Lamed   = No \p => absurd p
letterEq Mem     Nun     = No \p => absurd p
letterEq Mem     Samekh  = No \p => absurd p
letterEq Mem     Ayin    = No \p => absurd p
letterEq Mem     Peh     = No \p => absurd p
letterEq Mem     Tzaddi  = No \p => absurd p
letterEq Mem     Qoph    = No \p => absurd p
letterEq Mem     Resh    = No \p => absurd p
letterEq Mem     Shin    = No \p => absurd p
letterEq Mem     Tau     = No \p => absurd p
letterEq Nun     Aleph   = No \p => absurd p
letterEq Nun     Beth    = No \p => absurd p
letterEq Nun     Gimel   = No \p => absurd p
letterEq Nun     Daleth  = No \p => absurd p
letterEq Nun     Heh     = No \p => absurd p
letterEq Nun     Vau     = No \p => absurd p
letterEq Nun     Zayin   = No \p => absurd p
letterEq Nun     Cheth   = No \p => absurd p
letterEq Nun     Teth    = No \p => absurd p
letterEq Nun     Yod     = No \p => absurd p
letterEq Nun     Kaph    = No \p => absurd p
letterEq Nun     Lamed   = No \p => absurd p
letterEq Nun     Mem     = No \p => absurd p
letterEq Nun     Samekh  = No \p => absurd p
letterEq Nun     Ayin    = No \p => absurd p
letterEq Nun     Peh     = No \p => absurd p
letterEq Nun     Tzaddi  = No \p => absurd p
letterEq Nun     Qoph    = No \p => absurd p
letterEq Nun     Resh    = No \p => absurd p
letterEq Nun     Shin    = No \p => absurd p
letterEq Nun     Tau     = No \p => absurd p
letterEq Samekh  Aleph   = No \p => absurd p
letterEq Samekh  Beth    = No \p => absurd p
letterEq Samekh  Gimel   = No \p => absurd p
letterEq Samekh  Daleth  = No \p => absurd p
letterEq Samekh  Heh     = No \p => absurd p
letterEq Samekh  Vau     = No \p => absurd p
letterEq Samekh  Zayin   = No \p => absurd p
letterEq Samekh  Cheth   = No \p => absurd p
letterEq Samekh  Teth    = No \p => absurd p
letterEq Samekh  Yod     = No \p => absurd p
letterEq Samekh  Kaph    = No \p => absurd p
letterEq Samekh  Lamed   = No \p => absurd p
letterEq Samekh  Mem     = No \p => absurd p
letterEq Samekh  Nun     = No \p => absurd p
letterEq Samekh  Ayin    = No \p => absurd p
letterEq Samekh  Peh     = No \p => absurd p
letterEq Samekh  Tzaddi  = No \p => absurd p
letterEq Samekh  Qoph    = No \p => absurd p
letterEq Samekh  Resh    = No \p => absurd p
letterEq Samekh  Shin    = No \p => absurd p
letterEq Samekh  Tau     = No \p => absurd p
letterEq Ayin    Aleph   = No \p => absurd p
letterEq Ayin    Beth    = No \p => absurd p
letterEq Ayin    Gimel   = No \p => absurd p
letterEq Ayin    Daleth  = No \p => absurd p
letterEq Ayin    Heh     = No \p => absurd p
letterEq Ayin    Vau     = No \p => absurd p
letterEq Ayin    Zayin   = No \p => absurd p
letterEq Ayin    Cheth   = No \p => absurd p
letterEq Ayin    Teth    = No \p => absurd p
letterEq Ayin    Yod     = No \p => absurd p
letterEq Ayin    Kaph    = No \p => absurd p
letterEq Ayin    Lamed   = No \p => absurd p
letterEq Ayin    Mem     = No \p => absurd p
letterEq Ayin    Nun     = No \p => absurd p
letterEq Ayin    Samekh  = No \p => absurd p
letterEq Ayin    Peh     = No \p => absurd p
letterEq Ayin    Tzaddi  = No \p => absurd p
letterEq Ayin    Qoph    = No \p => absurd p
letterEq Ayin    Resh    = No \p => absurd p
letterEq Ayin    Shin    = No \p => absurd p
letterEq Ayin    Tau     = No \p => absurd p
letterEq Peh     Aleph   = No \p => absurd p
letterEq Peh     Beth    = No \p => absurd p
letterEq Peh     Gimel   = No \p => absurd p
letterEq Peh     Daleth  = No \p => absurd p
letterEq Peh     Heh     = No \p => absurd p
letterEq Peh     Vau     = No \p => absurd p
letterEq Peh     Zayin   = No \p => absurd p
letterEq Peh     Cheth   = No \p => absurd p
letterEq Peh     Teth    = No \p => absurd p
letterEq Peh     Yod     = No \p => absurd p
letterEq Peh     Kaph    = No \p => absurd p
letterEq Peh     Lamed   = No \p => absurd p
letterEq Peh     Mem     = No \p => absurd p
letterEq Peh     Nun     = No \p => absurd p
letterEq Peh     Samekh  = No \p => absurd p
letterEq Peh     Ayin    = No \p => absurd p
letterEq Peh     Tzaddi  = No \p => absurd p
letterEq Peh     Qoph    = No \p => absurd p
letterEq Peh     Resh    = No \p => absurd p
letterEq Peh     Shin    = No \p => absurd p
letterEq Peh     Tau     = No \p => absurd p
letterEq Tzaddi  Aleph   = No \p => absurd p
letterEq Tzaddi  Beth    = No \p => absurd p
letterEq Tzaddi  Gimel   = No \p => absurd p
letterEq Tzaddi  Daleth  = No \p => absurd p
letterEq Tzaddi  Heh     = No \p => absurd p
letterEq Tzaddi  Vau     = No \p => absurd p
letterEq Tzaddi  Zayin   = No \p => absurd p
letterEq Tzaddi  Cheth   = No \p => absurd p
letterEq Tzaddi  Teth    = No \p => absurd p
letterEq Tzaddi  Yod     = No \p => absurd p
letterEq Tzaddi  Kaph    = No \p => absurd p
letterEq Tzaddi  Lamed   = No \p => absurd p
letterEq Tzaddi  Mem     = No \p => absurd p
letterEq Tzaddi  Nun     = No \p => absurd p
letterEq Tzaddi  Samekh  = No \p => absurd p
letterEq Tzaddi  Ayin    = No \p => absurd p
letterEq Tzaddi  Peh     = No \p => absurd p
letterEq Tzaddi  Qoph    = No \p => absurd p
letterEq Tzaddi  Resh    = No \p => absurd p
letterEq Tzaddi  Shin    = No \p => absurd p
letterEq Tzaddi  Tau     = No \p => absurd p
letterEq Qoph    Aleph   = No \p => absurd p
letterEq Qoph    Beth    = No \p => absurd p
letterEq Qoph    Gimel   = No \p => absurd p
letterEq Qoph    Daleth  = No \p => absurd p
letterEq Qoph    Heh     = No \p => absurd p
letterEq Qoph    Vau     = No \p => absurd p
letterEq Qoph    Zayin   = No \p => absurd p
letterEq Qoph    Cheth   = No \p => absurd p
letterEq Qoph    Teth    = No \p => absurd p
letterEq Qoph    Yod     = No \p => absurd p
letterEq Qoph    Kaph    = No \p => absurd p
letterEq Qoph    Lamed   = No \p => absurd p
letterEq Qoph    Mem     = No \p => absurd p
letterEq Qoph    Nun     = No \p => absurd p
letterEq Qoph    Samekh  = No \p => absurd p
letterEq Qoph    Ayin    = No \p => absurd p
letterEq Qoph    Peh     = No \p => absurd p
letterEq Qoph    Tzaddi  = No \p => absurd p
letterEq Qoph    Resh    = No \p => absurd p
letterEq Qoph    Shin    = No \p => absurd p
letterEq Qoph    Tau     = No \p => absurd p
letterEq Resh    Aleph   = No \p => absurd p
letterEq Resh    Beth    = No \p => absurd p
letterEq Resh    Gimel   = No \p => absurd p
letterEq Resh    Daleth  = No \p => absurd p
letterEq Resh    Heh     = No \p => absurd p
letterEq Resh    Vau     = No \p => absurd p
letterEq Resh    Zayin   = No \p => absurd p
letterEq Resh    Cheth   = No \p => absurd p
letterEq Resh    Teth    = No \p => absurd p
letterEq Resh    Yod     = No \p => absurd p
letterEq Resh    Kaph    = No \p => absurd p
letterEq Resh    Lamed   = No \p => absurd p
letterEq Resh    Mem     = No \p => absurd p
letterEq Resh    Nun     = No \p => absurd p
letterEq Resh    Samekh  = No \p => absurd p
letterEq Resh    Ayin    = No \p => absurd p
letterEq Resh    Peh     = No \p => absurd p
letterEq Resh    Tzaddi  = No \p => absurd p
letterEq Resh    Qoph    = No \p => absurd p
letterEq Resh    Shin    = No \p => absurd p
letterEq Resh    Tau     = No \p => absurd p
letterEq Shin    Aleph   = No \p => absurd p
letterEq Shin    Beth    = No \p => absurd p
letterEq Shin    Gimel   = No \p => absurd p
letterEq Shin    Daleth  = No \p => absurd p
letterEq Shin    Heh     = No \p => absurd p
letterEq Shin    Vau     = No \p => absurd p
letterEq Shin    Zayin   = No \p => absurd p
letterEq Shin    Cheth   = No \p => absurd p
letterEq Shin    Teth    = No \p => absurd p
letterEq Shin    Yod     = No \p => absurd p
letterEq Shin    Kaph    = No \p => absurd p
letterEq Shin    Lamed   = No \p => absurd p
letterEq Shin    Mem     = No \p => absurd p
letterEq Shin    Nun     = No \p => absurd p
letterEq Shin    Samekh  = No \p => absurd p
letterEq Shin    Ayin    = No \p => absurd p
letterEq Shin    Peh     = No \p => absurd p
letterEq Shin    Tzaddi  = No \p => absurd p
letterEq Shin    Qoph    = No \p => absurd p
letterEq Shin    Resh    = No \p => absurd p
letterEq Shin    Tau     = No \p => absurd p
letterEq Tau     Aleph   = No \p => absurd p
letterEq Tau     Beth    = No \p => absurd p
letterEq Tau     Gimel   = No \p => absurd p
letterEq Tau     Daleth  = No \p => absurd p
letterEq Tau     Heh     = No \p => absurd p
letterEq Tau     Vau     = No \p => absurd p
letterEq Tau     Zayin   = No \p => absurd p
letterEq Tau     Cheth   = No \p => absurd p
letterEq Tau     Teth    = No \p => absurd p
letterEq Tau     Yod     = No \p => absurd p
letterEq Tau     Kaph    = No \p => absurd p
letterEq Tau     Lamed   = No \p => absurd p
letterEq Tau     Mem     = No \p => absurd p
letterEq Tau     Nun     = No \p => absurd p
letterEq Tau     Samekh  = No \p => absurd p
letterEq Tau     Ayin    = No \p => absurd p
letterEq Tau     Peh     = No \p => absurd p
letterEq Tau     Tzaddi  = No \p => absurd p
letterEq Tau     Qoph    = No \p => absurd p
letterEq Tau     Resh    = No \p => absurd p
letterEq Tau     Shin    = No \p => absurd p
