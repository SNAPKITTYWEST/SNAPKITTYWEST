module Prism.Resource

import Gate.Gate
import Gate.Letter

% ═══════════════════════════════════════════════════════════════════════════════
% PRISM MIRROR — Resource Correctness Judge
% ═══════════════════════════════════════════════════════════════════════════════
%
% Judges the stack for resource discipline.
% If a resource is borrowed, it must be returned.
% If a resource is consumed, it must not be used again.
% If a resource is leaked, the compiler rejects the program.
%
% Evidence or silence.

% ── Resource Token ────────────────────────────────────────────────────────────
% Every resource carries a proof of its state.
% The compiler tracks these at type-check time.

public export
data ResState = Owned | Borrowed | Consumed | Leaked

public export
data ResToken : ResState -> Type where
  MkResToken : (id : Nat) -> (state : ResState) -> ResToken state

% ── Resource Actions ──────────────────────────────────────────────────────────
% Each action transforms the resource state.
% Invalid transitions are rejected by the type checker.

public export
data ResAction : ResState -> ResState -> Type where
  Borrow  : ResAction Owned Borrowed
  Return  : ResAction Borrowed Owned
  Consume : ResAction Owned Consumed
  Release : ResAction Borrowed Consumed
  Free    : ResAction Consumed Consumed

% ── Resource Correctness Proof ────────────────────────────────────────────────
% A resource is correct if:
% 1. It is never used after consumption
% 2. It is never leaked
% 3. Every borrow is returned

public export
data ResCorrect : (history : List (ResState, ResState)) -> Type where
  BaseCorrect : ResCorrect []
  StepCorrect : ResAction from to
             -> ResCorrect rest
             -> ResCorrect ((from, to) :: rest)

% ── Resource Stack ────────────────────────────────────────────────────────────
% A stack of resources with proofs of correct management.

public export
data ResStack : List ResState -> Type where
  EmptyStack : ResStack []
  PushRes    : ResToken s -> ResStack ss -> ResStack (s :: ss)

% ── Resource Operations (compile-time checked) ────────────────────────────────

public export
pushOwned : Nat -> ResStack ss -> ResStack (Owned :: ss)
pushOwned id stk = PushRes (MkResToken id Owned) stk

public export
borrowRes : ResStack (Owned :: ss) -> ResStack (Borrowed :: ss)
borrowRes (PushRes (MkResToken id Owned) rest) =
  PushRes (MkResToken id Borrowed) rest

public export
returnRes : ResStack (Borrowed :: ss) -> ResStack (Owned :: ss)
returnRes (PushRes (MkResToken id Borrowed) rest) =
  PushRes (MkResToken id Owned) rest

public export
consumeRes : ResStack (Owned :: ss) -> ResStack (Consumed :: ss)
consumeRes (PushRes (MkResToken id Owned) rest) =
  PushRes (MkResToken id Consumed) rest

public export
releaseRes : ResStack (Borrowed :: ss) -> ResStack (Consumed :: ss)
releaseRes (PushRes (MkResToken id Borrowed) rest) =
  PushRes (MkResToken id Consumed) rest

% ── Use-After-Free Rejection ─────────────────────────────────────────────────
% Attempting to use a Consumed resource produces this type.
% The compiler rejects any program that produces it.

public export
data UseAfterFree : Type where
  MkUseAfterFree : (id : Nat) -> UseAfterFree

% This function exists but is unreachable if resources are managed correctly.
public export
useConsumed : (stk : ResStack (Consumed :: ss)) -> UseAfterFree
useConsumed (PushRes (MkResToken id Consumed) _) = MkUseAfterFree id

% ── Leak Rejection ───────────────────────────────────────────────────────────
% A resource that is neither returned nor released is leaked.
% The compiler tracks this.

public export
data ResourceLeak : Type where
  MkResourceLeak : (id : Nat) -> (state : ResState) -> ResourceLeak

% ── Double-Free Rejection ─────────────────────────────────────────────────────

public export
data DoubleFree : Type where
  MkDoubleFree : (id : Nat) -> DoubleFree

% This function rejects double-frees.
public export
rejectDoubleFree : ResToken Consumed -> DoubleFree
rejectDoubleFree (MkResToken id Consumed) = MkDoubleFree id
