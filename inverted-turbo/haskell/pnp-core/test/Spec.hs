module Main where

import Test.Tasty (defaultMain, testGroup)
import Test.Tasty.HUnit (assertEqual, testCase)
import PnP.Convergence (computeUniverseSum, ConvergenceEvent(..))
import PnP.Verify (verifySolution, VerificationResult(..))
import PnP.Solution (Solution(..))
import Data.Text (Text)

main :: IO ()
main = defaultMain $ testGroup "pnp-core"
  [ testCase "universe sum empty" $
      assertEqual "empty sum" 0.0 (computeUniverseSum [])

  , testCase "universe sum accumulates" $
      let evts = [ ConvergenceEvent "problem_solved" "a" "agent1" 0.001
                 , ConvergenceEvent "problem_solved" "b" "agent2" 0.002
                 ]
      in assertEqual "sum" 0.003 (computeUniverseSum evts)

  , testCase "verify rejects empty proof" $
      let sol = Solution "p" "a" "{}" "" undefined
      in case verifySolution sol of
           Rejected _ -> return ()
           Verified _ -> error "should reject"

  , testCase "verify accepts valid proof" $
      let sol = Solution "p" "a" "{}" "some-proof" undefined
      in case verifySolution sol of
           Verified _ -> return ()
           Rejected e -> error $ "should verify: " ++ show e
  ]
