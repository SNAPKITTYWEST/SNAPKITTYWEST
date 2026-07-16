{-# LANGUAGE DataKinds, GADTs, TypeFamilies #-}
{-# LANGUAGE RankNTypes, ScopedTypeVariables #-}

module SovereignTwin.ComeFrom
  ( -- * FORTH-style threaded instructions
    ThreadedInstr(..)
    -- * ComeFrom dispatch
  , ComeFromRegistry(..)
  , dispatchComeFrom
    -- * InvertedBlock (from InvertedBlock module)
  , module SovereignTwin.InvertedBlock
  ) where

import Data.Text (Text)
import SovereignTwin.InvertedBlock

-- | FORTH-style threaded instruction
data ThreadedInstr where
  PushAddr  :: ExecAddr -> ThreadedInstr
  Call      :: ExecAddr -> ThreadedInstr
  Jump      :: ExecAddr -> ThreadedInstr
  ComeFrom  :: ExecAddr -> ThreadedInstr   -- Non-local control transfer
  Ret       :: ThreadedInstr
  PrimOp    :: Text -> [ExecAddr] -> ThreadedInstr
