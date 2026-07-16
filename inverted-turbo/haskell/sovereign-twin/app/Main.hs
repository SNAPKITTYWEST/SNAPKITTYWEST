module Main where

import System.Environment (getArgs, lookupEnv)
import Control.Concurrent (threadDelay, newEmptyMVar, MVar, tryTakeMVar, tryPutMVar)
import Control.Exception (catch, handle, SomeException, AsyncException(..))
import SovereignTwin.Kernel (KernelState(..), bootstrapKernel, sovereignStep)
import SovereignTwin.RexxDaemon (RexxConfig(..))

defaultResonancePath :: IO FilePath
defaultResonancePath = do
  env <- lookupEnv "RESONANCE_PATH"
  return $ case env of
    Just p  -> p
    Nothing -> "z:/resonance.xml"

defaultCfg :: IO RexxConfig
defaultCfg = do
  rPath <- defaultResonancePath
  return RexxConfig
    { resonancePath               = rPath
    , syncScript                  = "/usr/local/bin/parallel-git-sync.sh"
    , pollIntervalMicros          = 1000000
    , maxParallelism              = 140
    , rexxConfigResonancePath     = rPath
    , rexxConfigPollIntervalMicros = 1000000
    }

main :: IO ()
main = do
  args <- getArgs
  case args of
    ["bootstrap", repoRoot] -> do
      putStrLn $ "Bootstrapping from " ++ repoRoot
      cfg    <- defaultCfg
      kernel <- bootstrapKernel repoRoot cfg
      putStrLn "Bootstrap complete."
      putStrLn $ "  Twin AST: " ++ show (length (mutationLog (twin kernel)))
      putStrLn $ "  Image: " ++ imagePath (lispImage kernel)

    ["loop", repoRoot] -> do
      cfg    <- defaultCfg
      kernel <- bootstrapKernel repoRoot cfg
      halt   <- newEmptyMVar
      putStrLn "Starting sovereign loop (Ctrl+C to halt)..."
      -- GHC runtime raises UserInterrupt on Ctrl+C; catch it to halt cleanly
      handle (\e -> case e of
                      UserInterrupt -> tryPutMVar halt () >> return ()
                      _             -> ioError (userError (show e))) $
        loop halt kernel

    _ -> putStrLn "Usage: sovereign-twin-cli <bootstrap|loop> <repo-root>"

loop :: MVar () -> KernelState -> IO ()
loop halt kernel = do
  shouldHalt <- tryTakeMVar halt
  case shouldHalt of
    Just () -> putStrLn "Sovereign loop halted cleanly."
    Nothing -> do
      kernel' <- sovereignStep kernel `catch` \(e :: SomeException) -> do
        putStrLn $ "Kernel step error: " ++ show e
        return kernel
      threadDelay (pollIntervalMicros (rexxConfig kernel'))
      loop halt kernel'
