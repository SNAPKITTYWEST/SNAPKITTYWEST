-- ════════════════════════════════════════════════════════════════
-- ERRANT DATALOG CLI — Command-line interface
-- ════════════════════════════════════════════════════════════════

module Main where

import DatalogEngine
import System.Environment (getArgs)
import System.Exit (exitFailure, exitSuccess)

main :: IO ()
main = do
    args <- getArgs
    case args of
        [input] -> do
            let engine = evaluate input
            if isAccepted engine
                then do
                    putStrLn $ "Status: accepted"
                    putStrLn $ "Address: " ++ maybe "none" id (snapAddress engine)
                    putStrLn $ "Facts: " ++ show (length (facts engine))
                    exitSuccess
                else do
                    putStrLn $ "Status: rejected"
                    putStrLn $ "Reason: " ++ maybe "unknown" id (rejectionReason engine)
                    exitFailure
        _ -> do
            putStrLn "Usage: errant-datalog-cli <json-input>"
            putStrLn ""
            putStrLn "Examples:"
            putStrLn "  errant-datalog-cli '{\"key\": \"value\"}'"
            putStrLn "  errant-datalog-cli '[1, 2, 3]'"
            exitFailure
