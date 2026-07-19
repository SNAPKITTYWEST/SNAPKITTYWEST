import Lake
open Lake DSL

package "ADR-Scaffold" {
  srcDir := "src"
  testDriver := "test"
}

lean_lib "ADR" {
  srcDir := "src/ADR"
}

lean_lib "Analytic" {
  srcDir := "src/Analytic"
}
lean_exe test {
  root := Test.main
  srcDir := "src"
  supportInterpreter := true
}
