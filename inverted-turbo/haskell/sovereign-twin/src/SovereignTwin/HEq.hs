{-# LANGUAGE DataKinds, GADTs, PolyKinds, TypeOperators #-}

module SovereignTwin.HEq
  ( HEq(..)
  ) where

import Data.Kind (Type)

-- | Heterogeneous Equality: a and b may have different types
data HEq (a :: k) (b :: k') where
  HRefl :: HEq a a
