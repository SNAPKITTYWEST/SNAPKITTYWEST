{-# LANGUAGE RecordWildCards #-}

module SovereignTwin.Kernel
  ( KernelState(..)
  , sovereignStep
  , bootstrapKernel
  ) where

import System.Directory (doesFileExist, removeFile)
import System.IO.Error (isDoesNotExistError)
import Control.Exception (catch, throwIO, IOException)

import SovereignTwin.AST
import SovereignTwin.SExp
import SovereignTwin.Resonance
import SovereignTwin.RexxDaemon
import SovereignTwin.InvertedBlock (ComeFromRegistry(..), dispatchComeFrom)

-- | Main loop state (single-threaded ownership)
data KernelState = KernelState
  { twin          :: TwinState
  , lispImage     :: LispImage
  , resonancePath :: FilePath
  , rexxConfig    :: RexxConfig
  , comeFromReg   :: ComeFromRegistry
  }

-- | One iteration of the sovereign loop
--
-- Sequence: detect resonance → apply ComeFrom dispatch → rebuild AST → dump image → consume block
sovereignStep :: KernelState -> IO KernelState
sovereignStep kernel = do
  let rPath = resonancePath kernel
  exists <- doesFileExist rPath
  if not exists
    then do
      putStrLn "No resonance block. Idle."
      return kernel
    else do
      putStrLn "Resonance block detected — dispatching ComeFrom vectors..."

      -- Apply any pending ComeFrom redirects before rebuilding the image
      let reg = comeFromReg kernel
      let dispatched = map (dispatchComeFrom reg) (map fst (handlers reg))
      putStrLn $ "  Dispatched " ++ show (length dispatched) ++ " ComeFrom entries"

      let sexp = agdaToSExp (currentAST (twin kernel))
      img <- dumpWorld sexp
      putStrLn "Lisp image saved."

      -- Consume the resonance block atomically
      removeFile rPath `catch` \(e :: IOException) ->
        if isDoesNotExistError e then return ()
        else throwIO e
      putStrLn "Resonance block consumed. Parent defunct."

      return kernel { lispImage = img }

-- | Bootstrap: initial kernel from repo snapshot
bootstrapKernel :: FilePath -> RexxConfig -> IO KernelState
bootstrapKernel repoRoot rexxCfg = do
  putStrLn $ "Bootstrapping sovereign twin from " ++ repoRoot
  let initialAST = AgdaModule "Bootstrap" [] []
      initTwin   = TwinState { currentAST = initialAST, mutationLog = [] }
  let sexp = agdaToSExp initialAST
  img <- dumpWorld sexp
  return KernelState
    { twin          = initTwin
    , lispImage     = img
    , resonancePath = rexxConfigResonancePath rexxCfg
    , rexxConfig    = rexxCfg
    , comeFromReg   = CFRegistry { handlers = [] }
    }
