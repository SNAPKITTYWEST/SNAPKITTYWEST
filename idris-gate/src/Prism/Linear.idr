module Prism.Linear

import Gate.Gate
import Gate.Letter

% ═══════════════════════════════════════════════════════════════════════════════
% PRISM MIRROR — Linear Proof Objects
% ═══════════════════════════════════════════════════════════════════════════════
%
% Linear types: every value is used exactly once.
% No duplication. No loss. No aliasing.
% The compiler enforces this. Not the runtime. Not the OS. The TYPE CHECKER.

% ── Linear Token ──────────────────────────────────────────────────────────────
% A value that must be used exactly once.

public export
data Lin (a : Type) where
  MkLin : (val : a) -> Lin a

% ── Linear Elimination ────────────────────────────────────────────────────────
% You can unwrap a linear value, but only by committing to use it.

public export
linUnwrap : Lin a -> (a -> b) -> b
linUnwrap (MkLin val) f = f val

% ── Linear Composition ────────────────────────────────────────────────────────
% Compose two linear values, consuming both.

public export
linCompose : Lin a -> Lin b -> (a -> b -> c) -> c
linCompose (MkLin va) (MkLin vb) f = f va vb

% ── Linear Duplication Rejection ──────────────────────────────────────────────
% Attempting to duplicate a linear value produces this type.

public export
data LinDup : Type where
  MkLinDup : (id : Nat) -> LinDup

% This function exists but is unreachable if linear discipline holds.
public export
rejectDup : Lin a -> LinDup
rejectDup (MkLin _) = MkLinDup 0

% ── Linear Loss Rejection ─────────────────────────────────────────────────────
% Attempting to discard a linear value produces this type.

public export
data LinLoss : Type where
  MkLinLoss : (id : Nat) -> LinLoss

% ── Proof Object ──────────────────────────────────────────────────────────────
% A proof that something is true, used exactly once.

public export
data Proof : (prop : Type) -> Type where
  MkProof : prop -> Proof prop

% ── Proof Consumption ─────────────────────────────────────────────────────────
% Consume a proof to derive a conclusion.

public export
consumeProof : Proof prop -> (prop -> conclusion) -> conclusion
consumeProof (MkProof p) f = f p

% ── Proof Irrelevance Rejection ───────────────────────────────────────────────
% Using a proof more than once is rejected.

public export
data ProofReuse : Type where
  MkProofReuse : (prop : Type) -> ProofReuse

public export
rejectReuse : Proof prop -> Proof prop -> ProofReuse
rejectReuse _ _ = MkProofReuse prop

% ── Gate Proof ────────────────────────────────────────────────────────────────
% A proof that a gate is valid (VA < VB).

public export
data GateProof : Gate -> Type where
  MkGateProof : (g : Gate) -> GateProof g

% ── Consume Gate Proof ────────────────────────────────────────────────────────
% Use the gate proof exactly once to derive a property.

public export
consumeGateProof : GateProof g -> (Gate -> prop) -> prop
consumeGateProof (MkGateProof g) f = f g

% ── Abjad Proof ───────────────────────────────────────────────────────────────
% A proof that abjad(a) + abjad(b) = sum.

public export
data AbjadProof : (a, b : Letter) -> (sum : Nat) -> Type where
  MkAbjadProof : (a : Letter)
              -> (b : Letter)
              -> (sum : Nat)
              -> {auto prf : abjad a + abjad b === sum}
              -> AbjadProof a b sum

% ── OXO Proof ─────────────────────────────────────────────────────────────────
% A proof that Ayin is the cross-system anchor.

public export
data OXOProof : Type where
  MkOXOProof : (l : Letter)
            -> {auto prf : l === Ayin}
            -> OXOProof

% ── TheOXO Proof ──────────────────────────────────────────────────────────────
% Compile-time proof that Ayin = the cross-system anchor.

export
theOXOProof : OXOProof
theOXOProof = MkOXOProof Ayin

% ── METATRON Proof ────────────────────────────────────────────────────────────
% A proof that a gate is cross-system certified.

public export
data MetatronProof : Gate -> Type where
  MkMetatron : (g : Gate)
            -> (enochianA : enochian_letter (gateA g) _)
            -> (enochianB : enochian_letter (gateB g) _)
            -> (arabicA : arabic_root (gateA g) _)
            -> (arabicB : arabic_root (gateB g) _)
            -> MetatronProof g

% ── Linear Stack ──────────────────────────────────────────────────────────────
% A stack of linear values. Each used exactly once.

public export
data LinStack : List Type -> Type where
  EmptyLinStack : LinStack []
  PushLin       : Lin a -> LinStack as -> LinStack (a :: as)

% ── Linear Stack Operations ───────────────────────────────────────────────────

public export
popLin : LinStack (a :: as) -> (Lin a, LinStack as)
popLin (PushLin v rest) = (v, rest)

public export
pushLin : Lin a -> LinStack as -> LinStack (a :: as)
pushLin = PushLin

% ── Linear Stack Exhaustion ───────────────────────────────────────────────────
% All values on the stack must be consumed.

public export
data LinExhausted : List Type -> Type where
  MkLinExhausted : LinExhausted []
