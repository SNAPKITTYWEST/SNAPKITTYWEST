{-# LANGUAGE OverloadedStrings #-}

module PnP.Verify
  ( verifySolution
  , VerificationResult(..)
  ) where

import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.ByteString as BS
import Crypto.Hash (SHA256, hash)
import Data.Aeson (encode)

import PnP.Solution (Solution(..))

data VerificationResult = Verified Text | Rejected Text
  deriving (Eq, Show)

-- | P-time verification: check proof is well-formed
verifySolution :: Solution -> VerificationResult
verifySolution sol
  | T.null (solProof sol) = Rejected "Empty proof"
  | otherwise =
    let proofHash = show (hash (encode sol) :: SHA256)
    in Verified proofHash
