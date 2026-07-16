{-# LANGUAGE DeriveGeneric, OverloadedStrings #-}

module PnP.Claim
  ( Claim(..)
  , newClaim
  ) where

import Data.Text (Text)
import Data.Aeson (FromJSON, ToJSON)
import Data.Time (UTCTime)
import GHC.Generics (Generic)
import System.Random (randomIO)

data Claim = Claim
  { claimProblemId :: Text
  , claimAgentId   :: Text
  , claimNonce     :: Text
  , claimTimestamp :: UTCTime
  , claimExpiresAt :: UTCTime
  } deriving (Show, Generic)
instance FromJSON Claim
instance ToJSON Claim

newClaim :: Text -> Text -> IO Claim
newClaim problemId agentId = do
  nonce <- randomIO :: IO Word64
  now <- getCurrentTime
  let expires = addUTCTime (4 * 3600) now  -- 4 hour expiry
  return Claim
    { claimProblemId = problemId
    , claimAgentId = agentId
    , claimNonce = show nonce
    , claimTimestamp = now
    , claimExpiresAt = expires
    }
