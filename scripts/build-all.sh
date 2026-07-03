#!/usr/bin/env bash
# Windows: Run in Git Bash, WSL, or MSYS2
# PowerShell: .\scripts\build-all.ps1
set -euo pipefail

echo "🔧 Checking toolchains..."
clang++ --version
mlir-opt --version
dotnet --version
dune --version

echo "🏗️ Building C++ / LLVM / MLIR..."
cmake -S cpp -B build/cpp -G Ninja
cmake --build build/cpp
ctest --test-dir build/cpp --output-on-failure

echo "🏗️ Building C# AGT..."
dotnet restore ./agt
dotnet build ./agt --configuration Release
dotnet test ./agt --configuration Release --no-build

echo "🏗️ Building OCaml snap-prism..."
cd snap-prism
opam install . --deps-only -y
dune build
dune runtest
cd ..

echo "✅ All builds passed."
