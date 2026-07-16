{-# LANGUAGE RecordWildCards #-}

module SovereignTwin.Kernel
  ( KernelState(..)
  , sovereignStep
  , bootstrapKernel
  ) where

import Data.Text (Text)
import Data.Time (POSIXTime)
import System.Directory (doesFileExist)

import SovereignTwin.AST
import SovereignTwin.SExp
import SovereignTwin.Resonance
import SovereignTwin.RexxDaemon

-- | Main loop state (single-threaded ownership)
data KernelState = KernelState
  { twin          :: TwinState
  , lispImage     :: LispImage
  , resonancePath :: FilePath
  , rexxConfig    :: RexxConfig
  }

-- | One iteration of the sovereign loop
sovereignStep :: KernelState -> IO KernelState
sovereignStep kernel = do
  let rPath = resonancePath kernel
  exists <- doesFileExist rPath
  if exists
    then do
      putStrLn "Resonance block detected — processing..."
      let sexp = agdaToSExp (currentAST (twin kernel))
      img <- dumpWorld sexp
      putStrLn "Lisp image saved. Parent defunct."
      return kernel { lispImage = img }
    else do
      putStrLn "No resonance block. Idle."
      return kernel

-- | Bootstrap: initial kernel from repo snapshot
bootstrapKernel :: FilePath -> RexxConfig -> IO KernelState
bootstrapKernel repoRoot rexxCfg = do
  putStrLn $ "Bootstrapping sovereign twin from " ++ repoRoot
  let initialAST = AgdaModule "Bootstrap" [] []
      twin = TwinState { currentAST = initialAST, mutationLog = [] }
  let sexp = agdaToSExp initialAST
  img <- dumpWorld sexp
  return KernelState
    { twin = twin
    , lispImage = img
    , resonancePath = rexxConfigResonancePath rexxCfg
    , rexxConfig = rexxCfg
    }
