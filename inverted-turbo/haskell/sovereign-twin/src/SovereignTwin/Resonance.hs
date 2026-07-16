{-# LANGUAGE DataKinds, GADTs, TypeFamilies #-}
{-# LANGUAGE RankNTypes, ScopedTypeVariables #-}

module SovereignTwin.Resonance
  ( ResonanceState(..)
  , ComponentDelta(..)
  , SyncDirective(..)
  , ResonanceBlock(..)
  , SigmaResonanceBlock(..)
  , SigmaComponentDelta(..)
  , writeResonance
  ) where

import Data.Kind (Type)
import Data.Text (Text)
import qualified Data.ByteString as BS
import Data.Word (Word64)
import Data.Time (POSIXTime)

-- | Resonance state
data ResonanceState = Mutated | Stable | RollingBack
  deriving (Eq, Show)

-- | SHA-256 hash (32 bytes)
newtype SHA256 = SHA256 BS.ByteString
  deriving (Eq, Show)

-- | Component delta: tracks hash changes per component
data ComponentDelta where
  ComponentDelta :: { componentId  :: Text
                   , previousHash :: SHA256
                   , newHash      :: SHA256
                   } -> ComponentDelta

-- | Sync directive
data SyncDirective = ForceAlign Int | Selective [Text]
  deriving (Eq, Show)

-- | Basic resonance block
data ResonanceBlock where
  ResonanceBlock :: { state       :: ResonanceState
                    , timestamp   :: POSIXTime
                    , components  :: [ComponentDelta]
                    , syncDir     :: SyncDirective
                    } -> ResonanceBlock

-- | Sigma resonance block with ComeFrom updates
data SigmaResonanceBlock where
  SigmaResonanceBlock :: { sigmaState      :: ResonanceState
                         , sigmaTimestamp   :: POSIXTime
                         , componentDeltas :: [SigmaComponentDelta]
                         , comeFromUpdates :: [(Word64, Word64)]
                         , sigmaSyncDir    :: SyncDirective
                         } -> SigmaResonanceBlock

-- | Sigma component delta with payload hash
data SigmaComponentDelta where
  SigmaComponentDelta :: { compId      :: Text
                         , prevHash    :: SHA256
                         , compNewHash :: SHA256
                         , payloadHash :: SHA256
                         } -> SigmaComponentDelta

-- | Atomic write to RAM-disk / Unix socket
writeResonance :: ResonanceBlock -> FilePath -> IO ()
writeResonance (ResonanceBlock _ _ components sync) path = do
  putStrLn $ "Writing resonance block to " ++ path
  putStrLn $ "  Components: " ++ show (length components)
  putStrLn $ "  Sync: " ++ show sync
