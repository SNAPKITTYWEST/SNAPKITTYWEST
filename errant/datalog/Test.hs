-- ════════════════════════════════════════════════════════════════
-- ERRANT DATALOG TESTS — Unit tests for the Datalog engine
-- ════════════════════════════════════════════════════════════════

module Main where

import DatalogEngine

main :: IO ()
main = do
    putStrLn "Running ERRANT Datalog tests..."
    testEvaluateAccepted
    testFactsCount
    testEvaluateAddress
    testRejected
    putStrLn "All tests passed!"

-- Test: evaluate accepted value
testEvaluateAccepted :: IO ()
testEvaluateAccepted = do
    let engine = evaluate "{\"key\": \"value\"}"
    if isAccepted engine
        then putStrLn "  PASS: testEvaluateAccepted"
        else error "FAIL: testEvaluateAccepted"

-- Test: facts count
testFactsCount :: IO ()
testFactsCount = do
    let engine = evaluate "[1, 2, 3]"
    if length (facts engine) == 8
        then putStrLn "  PASS: testFactsCount"
        else error $ "FAIL: testFactsCount - expected 8, got " ++ show (length (facts engine))

-- Test: evaluate address
testEvaluateAddress :: IO ()
testEvaluateAddress = do
    case evaluateAddress "{\"test\": 42}" of
        Just addr -> do
            if take 9 addr == "snapaddr:" && length addr == 73
                then putStrLn "  PASS: testEvaluateAddress"
                else error $ "FAIL: testEvaluateAddress - invalid address: " ++ addr
        Nothing -> error "FAIL: testEvaluateAddress - no address generated"

-- Test: rejected value
testRejected :: IO ()
testRejected = do
    let engine = evaluate ""
    if not (isAccepted engine)
        then putStrLn "  PASS: testRejected"
        else error "FAIL: testRejected - empty string should be rejected"
