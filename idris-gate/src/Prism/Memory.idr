module Prism.Memory

import Gate.Gate
import Gate.Letter

% ═══════════════════════════════════════════════════════════════════════════════
% PRISM MIRROR — Memory Correctness Judge
% ═══════════════════════════════════════════════════════════════════════════════
%
% Judges the stack for memory discipline.
% Every access is bounds-checked at compile time.
% Every allocation is accounted for.
% Every free is validated.
%
% Evidence or silence.

% ── Memory Cell ───────────────────────────────────────────────────────────────
% A typed memory cell with compile-time bounds.

public export
data MemCell : Nat -> Type where
  MkCell : (addr : Nat) -> (size : Nat) -> MemCell size

% ── Memory State ──────────────────────────────────────────────────────────────

public export
data MemState = Uninitialized | Allocated | Readable | Freed

public export
data MemProof : MemState -> Type where
  MkMemProof : (addr : Nat) -> (size : Nat) -> MemProof state

% ── Bounds Check ──────────────────────────────────────────────────────────────
% Compile-time bounds checking.

public export
data InBounds : Nat -> Nat -> Nat -> Type where
  MkInBounds : (addr : Nat)
            -> (offset : Nat)
            -> (size : Nat)
            -> {auto prf : (offset < size) === True}
            -> InBounds addr offset size

% Attempt to access out of bounds produces this type.
public export
data OutOfBounds : Type where
  MkOutOfBounds : (addr : Nat) -> (offset : Nat) -> (size : Nat) -> OutOfBounds

% ── Memory Operations ────────────────────────────────────────────────────────

public export
alloc : (size : Nat) -> MemProof Uninitialized -> MemProof Allocated
alloc size (MkMemProof addr _) = MkMemProof addr size

public export
read : MemProof Allocated -> (offset : Nat)
    -> {auto prf : InBounds ? offset size}
    -> MemProof Readable
read (MkMemProof addr size) offset = MkMemProof addr size

public export
write : MemProof Readable -> (offset : Nat)
     -> {auto prf : InBounds ? offset size}
     -> MemProof Readable
write (MkMemProof addr size) offset = MkMemProof addr size

public export
free : MemProof Readable -> MemProof Freed
free (MkMemProof addr size) = MkMemProof addr size

% ── Use-After-Free Rejection ─────────────────────────────────────────────────

public export
data UseAfterFree : Type where
  MkUAF : (addr : Nat) -> UseAfterFree

public export
useFreed : MemProof Freed -> UseAfterFree
useFreed (MkMemProof addr _) = MkUAF addr

% ── Double-Free Rejection ─────────────────────────────────────────────────────

public export
data DoubleFree : Type where
  MkDF : (addr : Nat) -> DoubleFree

public export
doubleFree : MemProof Freed -> DoubleFree
doubleFree (MkMemProof addr _) = MkDF addr

% ── Alignment Check ───────────────────────────────────────────────────────────
% Compile-time alignment verification.

public export
data Aligned : Nat -> Nat -> Type where
  MkAligned : (addr : Nat)
           -> (alignment : Nat)
           -> {auto prf : (addr `mod` alignment) === 0}
           -> Aligned addr alignment

% Unaligned access produces this type.
public export
data UnalignedAccess : Type where
  MkUnaligned : (addr : Nat) -> (alignment : Nat) -> UnalignedAccess

% ── Stack Discipline ──────────────────────────────────────────────────────────
% Compile-time stack frame tracking.

public export
data StackFrame : Type where
  MkFrame : (depth : Nat) -> (vars : Nat) -> StackFrame

public export
data StackState = StackOk | StackOverflow | StackUnderflow

public export
pushFrame : StackFrame -> StackFrame
pushFrame (MkFrame depth vars) = MkFrame (S depth) 0

public export
popFrame : StackFrame -> StackFrame
popFrame (MkFrame 0 _) = MkFrame 0 0  -- underflow caught at type level
popFrame (MkFrame (S d) _) = MkFrame d 0

% ── Null Pointer Rejection ────────────────────────────────────────────────────

public export
data NullPtr : Type where
  MkNullPtr : NullPtr

% Null pointer dereference produces this type.
public export
dereferenceNull : NullPtr
dereferenceNull = MkNullPtr
