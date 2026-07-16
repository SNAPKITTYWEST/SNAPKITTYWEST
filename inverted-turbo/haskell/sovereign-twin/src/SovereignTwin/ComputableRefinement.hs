{-# LANGUAGE DataKinds, GADTs, TypeFamilies, PolyKinds #-}
{-# LANGUAGE RankNTypes, ScopedTypeVariables, ConstraintKinds, TypeOperators #-}
{-# LANGUAGE QuantifiedConstraints, UndecidableInstances, AllowAmbiguousTypes #-}

module SovereignTwin.ComputableRefinement
  ( -- * Core Σ-type
    ComputableRefinement(..)
  , crVal
  , crProperty
    -- * Extensionality
  , crExtHEq
  , crExtCast
    -- * Transport
  , transport
  ) where

import Data.Kind (Type)
import Data.Type.Equality ((:~:)(Refl))
import SovereignTwin.HEq (HEq(..))

-- | ComputableRefinement: Σ (val : α) . P val
-- The property is a runtime computational block, not an erased proof.
data ComputableRefinement (α :: Type) (P :: α → Type) where
  MkCR :: { crVal      :: α
           , crProperty :: P (crVal)
           } -> ComputableRefinement α P

-- | Dependent Transport: given h : a ≡ b, transport x : P a to P b
transport :: forall (α :: Type) (P :: α → Type) (a b :: α).
             (a :~: b) -> P a -> P b
transport Refl x = x

-- | Extensionality A: heterogeneous equality on both components
crExtHEq :: forall α P.
            (a b :: ComputableRefinement α P)
         -> (crVal a :~: crVal b)
         -> HEq (crProperty a) (crProperty b)
         -> a :~: b
crExtHEq a b Refl HRefl = Refl

-- | Extensionality B: transport then compare
crExtCast :: forall α P.
             (a b :: ComputableRefinement α P)
          -> (h :: crVal a :~: crVal b)
          -> (transport h (crProperty a) :~: crProperty b)
          -> a :~: b
crExtCast a b Refl Refl = Refl
