module Main where

import qualified Data.Text as T
import System.Environment (getArgs)
import SovereignTwin.Kernel (KernelState(..), bootstrapKernel, sovereignStep)
import SovereignTwin.RexxDaemon (RexxConfig(..))

main :: IO ()
main = do
  args <- getArgs
  case args of
    ["bootstrap", repoRoot] -> do
      putStrLn $ "Bootstrapping from " ++ repoRoot
      let cfg = RexxConfig
            { resonancePath = "z:/resonance.xml"
            , syncScript = "/usr/local/bin/parallel-git-sync.sh"
            , pollIntervalMicros = 1000000
            , maxParallelism = 140
            , rexxConfigResonancePath = "z:/resonance.xml"
            , rexxConfigPollIntervalMicros = 1000000
            }
      kernel <- bootstrapKernel repoRoot cfg
      putStrLn "Bootstrap complete."
      putStrLn $ "  Twin AST: " ++ show (length (mutationLog (twin kernel)))
      putStrLn $ "  Image: " ++ imagePath (lispImage kernel)

    ["loop", repoRoot] -> do
      let cfg = RexxConfig
            { resonancePath = "z:/resonance.xml"
            , syncScript = "/usr/local/bin/parallel-git-sync.sh"
            , pollIntervalMicros = 1000000
            , maxParallelism = 140
            , rexxConfigResonancePath = "z:/resonance.xml"
            , rexxConfigPollIntervalMicros = 1000000
            }
      kernel <- bootstrapKernel repoRoot cfg
      putStrLn "Starting sovereign loop..."
      loop kernel

    _ -> do
      putStrLn "Usage: sovereign-twin-cli <bootstrap|loop> <repo-root>"

loop :: KernelState -> IO ()
loop kernel = do
  kernel' <- sovereignStep kernel
  loop kernel'
