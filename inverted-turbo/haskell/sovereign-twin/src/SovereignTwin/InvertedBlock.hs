{-# LANGUAGE DataKinds, GADTs, TypeFamilies #-}
{-# LANGUAGE RankNTypes, ScopedTypeVariables #-}

module SovereignTwin.InvertedBlock
  ( -- * Execution addresses
    ExecAddr(..)
  , Addr
    -- * Inverted blocks
  , InvertedBlock(..)
  , Weight
  , InvertedWeight
    -- * ComeFrom registry
  , ComeFromRegistry(..)
  , dispatchComeFrom
  ) where

import Data.Kind (Type)
import Data.Text (Text)
import Data.Word (Word64)

-- | Execution coordinate (address in threaded Lisp image)
newtype ExecAddr = ExecAddr Word64
  deriving (Eq, Ord, Show)

type Addr = ExecAddr

-- | Weight type: must be ≤ -0.8 for inverted blocks
type Weight = Double
type InvertedWeight = (weight :: Double)

-- | Inverted Block: high-entropy structural boundary (weight ≤ -0.8)
data InvertedBlock (weight :: Weight) where
  InvertedBlock :: { blockId           :: Text
                   , weight            :: Double
                   , entryPoints       :: [ExecAddr]
                   , exitPoints        :: [ExecAddr]
                   , comeFromHandlers  :: [(ExecAddr, ExecAddr)]
                   } -> InvertedBlock weight

-- | ComeFrom Registry: maps trigger → handler (consumed on dispatch)
data ComeFromRegistry where
  CFRegistry :: { handlers :: [(ExecAddr, ExecAddr)]
                } -> ComeFromRegistry

-- | Dispatch a COME FROM event (intercepts instruction pointer)
dispatchComeFrom :: ComeFromRegistry -> ExecAddr -> Maybe ExecAddr
dispatchComeFrom (CFRegistry hs) addr = lookup addr hs
