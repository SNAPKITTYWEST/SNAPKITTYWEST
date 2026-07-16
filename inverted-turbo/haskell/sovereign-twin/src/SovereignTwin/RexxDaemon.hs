{-# LANGUAGE QuasiQuotes, OverloadedStrings #-}

module SovereignTwin.RexxDaemon
  ( RexxConfig(..)
  , generateRexxDaemon
  , generateSigmaRexx
  ) where

import Data.Text (Text)
import qualified Data.Text as T
import Text.RawString.QQ (r)

-- | REXX daemon configuration
data RexxConfig = RexxConfig
  { resonancePath           :: FilePath
  , syncScript              :: FilePath
  , pollIntervalMicros      :: Int
  , maxParallelism          :: Int
  , rexxConfigResonancePath :: FilePath
  , rexxConfigPollIntervalMicros :: Int
  }

-- | Generate REXX daemon script for resonance-driven sync
generateRexxDaemon :: RexxConfig -> Text
generateRexxDaemon cfg = T.pack [r|
/* REXX Daemon: Sovereign Twin Sync Loop */
signal on halt

do forever
  if stream(resonancePath, "C", "QUERY EXISTS") \= "" then do
    call read_resonance_block
    call execute_repo_sync
    call sysfiledelete resonancePath
  end
  call syssleep pollIntervalMicros / 1000000
end
exit

read_resonance_block:
  line = linein(resonancePath)
  call stream resonancePath, "C", "CLOSE"
return

execute_repo_sync:
  say "Resonance triggered. Syncing 140-repository umbrella..."
  "sh" syncScript
return

halt:
  say "System loop terminated."
  exit
|]
  where resonancePath = T.pack (show (rexxConfigResonancePath cfg))
        syncScript = T.pack (show (syncScript cfg))
        pollIntervalMicros = T.pack (show (rexxConfigPollIntervalMicros cfg))

-- | Generate REXX daemon with Sigma Twin ComeFrom hot-swap
generateSigmaRexx :: RexxConfig -> Text
generateSigmaRexx cfg = T.pack [r|
/* REXX Daemon: Sigma Twin Hot-Swap Loop */
signal on halt

do forever
  if stream(resonancePath, "C", "QUERY EXISTS") \= "" then do
    call read_sigma_resonance
    call hot_swap_vectors
    call sysfiledelete resonancePath
  end
  call syssleep pollIntervalMicros / 1000000
end
exit

read_sigma_resonance:
  line = linein(resonancePath)
  call stream resonancePath, "C", "CLOSE"
return

hot_swap_vectors:
  say "Hot-swapping ComeFrom vectors in Lisp image..."
  "sh" "/usr/local/bin/lisp-vector-patch.sh" comeFromUpdates
return

halt:
  say "Sigma loop terminated."
  exit
|]
  where resonancePath = T.pack (show (rexxConfigResonancePath cfg))
        pollIntervalMicros = T.pack (show (rexxConfigPollIntervalMicros cfg))
