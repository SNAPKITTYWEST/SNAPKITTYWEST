// Test.lean – entry point for lake_exe test
import ADR.Test

def runTests : IO Unit := do
  Test.runTests

#eval runTests
