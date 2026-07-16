{-# LANGUAGE DeriveGeneric, OverloadedStrings #-}

module PnP.Problem
  ( ProblemId(..)
  , Difficulty(..)
  , Problem(..)
  , ProblemStatus(..)
  ) where

import Data.Text (Text)
import Data.Aeson (FromJSON, ToJSON)
import GHC.Generics (Generic)

newtype ProblemId = ProblemId { unProblemId :: Text }
  deriving (Eq, Ord, Show, FromJSON, ToJSON)

data Difficulty = NPHard | NPComplete | NPEasy | P
  deriving (Eq, Show, Generic)
instance FromJSON Difficulty
instance ToJSON Difficulty

data ProblemStatus = Open | Claimed | Solved
  deriving (Eq, Show, Generic)
instance FromJSON ProblemStatus
instance ToJSON ProblemStatus

data Problem = Problem
  { problemId       :: ProblemId
  , specHash        :: Text
  , verifyFn        :: Maybe FilePath
  , difficulty      :: Difficulty
  , problemStatus   :: ProblemStatus
  , claimedBy       :: Maybe Text
  , solvedBy        :: Maybe Text
  , solutionRef     :: Maybe FilePath
  } deriving (Show, Generic)
instance FromJSON Problem
instance ToJSON Problem
