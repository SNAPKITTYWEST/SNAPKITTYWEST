-- ════════════════════════════════════════════════════════════════
-- DATALOG ENGINE — Non-recursive Datalog-inspired validator
--
-- Mirrors the Rust implementation in datalog.rs
-- Facts: Artifact, JsonAdmissible, NfcOk, SnapCanonical,
--        Sha256Digest, SnapAddress, Accepted, Rejected, WormReceipt
--
-- 8-stage evaluation pipeline:
--   1. artifact(A)
--   2. json_admissible(A)
--   3. nfc_ok(A, N)
--   4. snap_canonical(N, B)
--   5. sha256_digest(B, D)
--   6. snap_address(A, Addr)
--   7. accepted(A, Addr)
--   8. worm_receipt(A, Addr, Seal)
--
-- Ahmad Ali Parr · SNAPKITTYWEST · DATALOG-GENESIS-001
-- ════════════════════════════════════════════════════════════════

module DatalogEngine
    ( Fact(..)
    , DatalogEngine(..)
    , evaluate
    , evaluateAddress
    , isAccepted
    , snapAddress
    , rejectionReason
    ) where

import Data.Char (ord)
import Data.List (foldl')
import qualified Data.ByteString as BS
import qualified Data.ByteString.Char8 as BSC
import Crypto.Hash (SHA256, hash)
import Crypto.Hash.IO ()

-- ════════════════════════════════════════════════════════════════
-- FACT — Datalog facts (mirrors Rust Fact enum)
-- ════════════════════════════════════════════════════════════════

data Fact
    = Artifact String                    -- artifact(A)
    | JsonAdmissible String              -- json_admissible(A)
    | NfcOk String String               -- nfc_ok(A, N)
    | SnapCanonical String BS.ByteString -- snap_canonical(N, B)
    | Sha256Digest BS.ByteString String -- sha256_digest(B, D)
    | SnapAddress String String          -- snap_address(A, Addr)
    | Accepted String String             -- accepted(A, Addr)
    | Rejected String String             -- rejected(A, Reason)
    | WormReceipt String String String   -- worm_receipt(A, Addr, Seal)
    deriving (Show, Eq)

-- ════════════════════════════════════════════════════════════════
-- DATALOG ENGINE — Non-recursive evaluator
-- ════════════════════════════════════════════════════════════════

data DatalogEngine = DatalogEngine
    { facts :: [Fact]
    , counter :: Int
    }

-- | Create a new empty engine
newEngine :: DatalogEngine
newEngine = DatalogEngine [] 0

-- | Evaluate all rules against a JSON-like value
-- For simplicity, we take a String representation (like Rust's format!("{:?}", value))
evaluate :: String -> DatalogEngine
evaluate inputValue = foldl' applyStage newEngine stages
  where
    stages =
        [ stageArtifact inputValue
        , stageJsonAdmissible
        , stageNfcOk
        , stageSnapCanonical
        , stageSha256Digest
        , stageSnapAddress
        , stageAccepted
        , stageWormReceipt
        ]

-- | Apply a stage to the engine
applyStage :: DatalogEngine -> (DatalogEngine -> DatalogEngine) -> DatalogEngine
applyStage engine stage = stage engine

-- ════════════════════════════════════════════════════════════════
-- STAGES — 8-stage evaluation pipeline
-- ════════════════════════════════════════════════════════════════

-- Stage 1: artifact(A)
stageArtifact :: String -> DatalogEngine -> DatalogEngine
stageArtifact inputValue engine =
    engine { facts = facts engine ++ [Artifact inputValue] }

-- Stage 2: json_admissible(A)
stageJsonAdmissible :: DatalogEngine -> DatalogEngine
stageJsonAdmissible engine =
    case facts engine of
        (Artifact a : _) ->
            if isJsonAdmissible a
                then engine { facts = facts engine ++ [JsonAdmissible a] }
                else engine { facts = facts engine ++ [Rejected a "not_json_admissible"] }
        _ -> engine

-- Stage 3: nfc_ok(A, N)
stageNfcOk :: DatalogEngine -> DatalogEngine
stageNfcOk engine =
    case filter isJsonAdmissibleFact (facts engine) of
        (JsonAdmissible a : _) ->
            let normalized = normalizeNfc a
            in engine { facts = facts engine ++ [NfcOk a normalized] }
        _ -> engine

-- Stage 4: snap_canonical(N, B)
stageSnapCanonical :: DatalogEngine -> DatalogEngine
stageSnapCanonical engine =
    case filter isNfcOkFact (facts engine) of
        (NfcOk _ n : _) ->
            let canonical = toCanonical n
            in engine { facts = facts engine ++ [SnapCanonical n canonical] }
        _ -> engine

-- Stage 5: sha256_digest(B, D)
stageSha256Digest :: DatalogEngine -> DatalogEngine
stageSha256Digest engine =
    case filter isSnapCanonicalFact (facts engine) of
        (SnapCanonical _ b : _) ->
            let digest = sha256Hex b
            in engine { facts = facts engine ++ [Sha256Digest b digest] }
        _ -> engine

-- Stage 6: snap_address(A, Addr)
stageSnapAddress :: DatalogEngine -> DatalogEngine
stageSnapAddress engine =
    case (filter isArtifactFact (facts engine), filter isSha256DigestFact (facts engine)) of
        (Artifact a : _, Sha256Digest _ d : _) ->
            let addr = "snapaddr:" ++ d
            in engine { facts = facts engine ++ [SnapAddress a addr] }
        _ -> engine

-- Stage 7: accepted(A, Addr)
stageAccepted :: DatalogEngine -> DatalogEngine
stageAccepted engine =
    if any isRejectedFact (facts engine)
        then engine  -- Already rejected, don't accept
        else case filter isSnapAddressFact (facts engine) of
            (SnapAddress a addr : _) ->
                engine { facts = facts engine ++ [Accepted a addr] }
            _ -> engine

-- Stage 8: worm_receipt(A, Addr, Seal)
stageWormReceipt :: DatalogEngine -> DatalogEngine
stageWormReceipt engine =
    case filter isAcceptedFact (facts engine) of
        (Accepted a addr : _) ->
            let receiptBytes = "accepted:" ++ a ++ ":" ++ addr
                seal = sha256Hex (BSC.pack receiptBytes)
            in engine { facts = facts engine ++ [WormReceipt a addr seal] }
        _ -> engine

-- ════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ════════════════════════════════════════════════════════════════

-- | Check if a string is valid JSON (simplified)
isJsonAdmissible :: String -> Bool
isJsonAdmissible s = not (null s) && head s `elem` "{[\"0123456789-t"

-- | Normalize to NFC (simplified - just identity for now)
normalizeNfc :: String -> String
normalizeNfc = id

-- | Convert to canonical form (simplified)
toCanonical :: String -> BS.ByteString
toCanonical = BSC.pack

-- | Compute SHA-256 hash and return hex string
sha256Hex :: BS.ByteString -> String
sha256Hex bs = show (hash bs :: SHA256)

-- | Check fact types
isArtifactFact :: Fact -> Bool
isArtifactFact (Artifact _) = True
isArtifactFact _ = False

isJsonAdmissibleFact :: Fact -> Bool
isJsonAdmissibleFact (JsonAdmissible _) = True
isJsonAdmissibleFact _ = False

isNfcOkFact :: Fact -> Bool
isNfcOkFact (NfcOk _ _) = True
isNfcOkFact _ = False

isSnapCanonicalFact :: Fact -> Bool
isSnapCanonicalFact (SnapCanonical _ _) = True
isSnapCanonicalFact _ = False

isSha256DigestFact :: Fact -> Bool
isSha256DigestFact (Sha256Digest _ _) = True
isSha256DigestFact _ = False

isSnapAddressFact :: Fact -> Bool
isSnapAddressFact (SnapAddress _ _) = True
isSnapAddressFact _ = False

isAcceptedFact :: Fact -> Bool
isAcceptedFact (Accepted _ _) = True
isAcceptedFact _ = False

isRejectedFact :: Fact -> Bool
isRejectedFact (Rejected _ _) = True
isRejectedFact _ = False

-- ════════════════════════════════════════════════════════════════
-- QUERY FUNCTIONS
-- ════════════════════════════════════════════════════════════════

-- | Check if the input was accepted
isAccepted :: DatalogEngine -> Bool
isAccepted engine = any isAcceptedFact (facts engine)

-- | Get the snap address if accepted
snapAddress :: DatalogEngine -> Maybe String
snapAddress engine =
    case filter isAcceptedFact (facts engine) of
        (Accepted _ addr : _) -> Just addr
        _ -> Nothing

-- | Get rejection reason if rejected
rejectionReason :: DatalogEngine -> Maybe String
rejectionReason engine =
    case filter isRejectedFact (facts engine) of
        (Rejected _ reason : _) -> Just reason
        _ -> Nothing

-- | Convenience function: evaluate and get address
evaluateAddress :: String -> Maybe String
evaluateAddress input =
    let engine = evaluate input
    in snapAddress engine

-- ════════════════════════════════════════════════════════════════
-- TESTS
-- ════════════════════════════════════════════════════════════════

-- Test: evaluate accepted value
testEvaluateAccepted :: Bool
testEvaluateAccepted =
    let engine = evaluate "{\"key\": \"value\"}"
    in isAccepted engine &&
       case snapAddress engine of
           Just addr -> take 9 addr == "snapaddr:"
           Nothing -> False

-- Test: facts count
testFactsCount :: Bool
testFactsCount =
    let engine = evaluate "[1, 2, 3]"
    in length (facts engine) == 8

-- Test: evaluate address
testEvaluateAddress :: Bool
testEvaluateAddress =
    case evaluateAddress "{\"test\": 42}" of
        Just addr -> take 9 addr == "snapaddr:" && length addr == 73
        Nothing -> False
