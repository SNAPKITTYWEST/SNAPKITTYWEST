{-# LANGUAGE OverloadedStrings #-}

module PnP.Convergence
  ( ConvergenceEvent(..)
  , computeUniverseSum
  , difficultyWeight
  ) where

import Data.Text (Text)
import qualified Data.Text as T

data ConvergenceEvent = ConvergenceEvent
  { event           :: Text
  , problemId       :: Text
  , solver          :: Text
  , universeSumDelta :: Double
  } deriving (Eq, Show)

difficultyWeight :: Text -> Double
difficultyWeight pid
  | "NP-hard" `T.isInfixOf` pid = 1.0
  | "NP-complete" `T.isInfixOf` pid = 0.8
  | "NP-easy" `T.isInfixOf` pid = 0.3
  | otherwise = 0.1

-- | Compute universe sum from convergence log
computeUniverseSum :: [ConvergenceEvent] -> Double
computeUniverseSum = sum . map universeSumDelta
