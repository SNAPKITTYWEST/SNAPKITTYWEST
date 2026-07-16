{-# LANGUAGE OverloadedStrings #-}

module PnP.Registry
  ( ProblemRegistry(..)
  , loadRegistry
  , saveRegistry
  ) where

import Data.Text (Text)
import Data.Aeson (FromJSON, ToJSON, decode, encode)
import qualified Data.ByteString.Lazy as LBS
import System.IO (hPutStrLn, stderr)

import PnP.Problem (Problem)

data ProblemRegistry = ProblemRegistry
  { problems :: [Problem]
  } deriving (Eq, Show)
instance FromJSON ProblemRegistry
instance ToJSON ProblemRegistry

loadRegistry :: FilePath -> IO (Maybe ProblemRegistry)
loadRegistry path = do
  contents <- LBS.readFile path
  return (decode contents)

saveRegistry :: FilePath -> ProblemRegistry -> IO ()
saveRegistry path reg = do
  LBS.writeFile path (encode reg)
  hPutStrLn stderr $ "Saved registry to " ++ path
