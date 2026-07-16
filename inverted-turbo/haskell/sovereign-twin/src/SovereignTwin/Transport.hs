{-# LANGUAGE DataKinds, GADTs, TypeFamilies, PolyKinds, RankNTypes #-}

module SovereignTwin.Transport
  ( transport
  , TransportProof(..)
  ) where

import Data.Kind (Type)
import Data.Type.Equality ((:~:)(Refl))

-- | Transport: given h : a ≡ b, transport x : P a to P b
transport :: forall (α :: Type) (P :: α → Type) (a b :: α).
             (a :~: b) -> P a -> P b
transport Refl x = x

-- | Witness that transport preserves the property
data TransportProof (α :: Type) (P :: α → Type) (a b :: α) where
  MkTP :: { tpH  :: (a :~: b)
           } -> TransportProof α P a b
