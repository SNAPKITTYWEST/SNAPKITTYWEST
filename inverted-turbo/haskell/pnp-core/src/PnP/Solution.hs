{-# LANGUAGE DeriveGeneric, OverloadedStrings #-}

module PnP.Solution
  ( Solution(..)
  , SolutionPool
  ) where

import Data.Text (Text)
import Data.Aeson (FromJSON, ToJSON)
import Data.Time (UTCTime)
import Data.Map (Map)
import GHC.Generics (Generic)

data Solution = Solution
  { solProblemId :: Text
  , solAgentId   :: Text
  , solWitness   :: Text  -- JSON-encoded witness
  , solProof     :: Text  -- JSON-encoded proof
  , solTimestamp :: UTCTime
  } deriving (Show, Generic)
instance FromJSON Solution
instance ToJSON Solution

type SolutionPool = Map Text [Solution]  -- problemId → solutions
