# PowerShell version for Windows
# Run: .\scripts\build-all.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔧 Checking toolchains..." -ForegroundColor Cyan
clang++ --version
mlir-opt --version
dotnet --version
dune --version

Write-Host "🏗️ Building C++ / LLVM / MLIR..." -ForegroundColor Yellow
cmake -S cpp -B build/cpp -G Ninja
cmake --build build/cpp
ctest --test-dir build/cpp --output-on-failure

Write-Host "🏗️ Building C# AGT..." -ForegroundColor Yellow
dotnet restore ./agt
dotnet build ./agt --configuration Release
dotnet test ./agt --configuration Release --no-build

Write-Host "🏗️ Building OCaml snap-prism..." -ForegroundColor Yellow
Push-Location snap-prism
opam install . --deps-only -y
dune build
dune runtest
Pop-Location

Write-Host "✅ All builds passed." -ForegroundColor Green
