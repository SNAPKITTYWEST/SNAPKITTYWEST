#!/usr/bin/env bash
# Windows: Run in Git Bash, WSL, or MSYS2
# PowerShell: .\scripts\build-all.ps1
set -euo pipefail

echo "Checking toolchains..."

# Check each toolchain and report status
if command -v clang++ &> /dev/null; then
    echo "  clang++: OK"
    CLANG_OK=1
else
    echo "  clang++: NOT FOUND (C++ build skipped)"
    CLANG_OK=0
fi

if command -v mlir-opt &> /dev/null; then
    echo "  mlir-opt: OK"
    MLIR_OK=1
else
    echo "  mlir-opt: NOT FOUND (MLIR build skipped)"
    MLIR_OK=0
fi

if command -v dotnet &> /dev/null; then
    echo "  dotnet: OK"
    DOTNET_OK=1
else
    echo "  dotnet: NOT FOUND (C# build skipped)"
    DOTNET_OK=0
fi

if command -v dune &> /dev/null; then
    echo "  dune: OK"
    DUNE_OK=1
else
    echo "  dune: NOT FOUND (OCaml build skipped)"
    DUNE_OK=0
fi

echo ""

# Build C++ if toolchain available
if [ "$CLANG_OK" -eq 1 ] && [ "$MLIR_OK" -eq 1 ]; then
    echo "Building C++ / LLVM / MLIR..."
    cmake -S cpp -B build/cpp -G Ninja
    cmake --build build/cpp
    ctest --test-dir build/cpp --output-on-failure
else
    echo "Skipping C++ build (missing toolchain)"
fi

# Build C# if toolchain available
if [ "$DOTNET_OK" -eq 1 ]; then
    echo "Building C# AGT..."
    dotnet restore ./sovereign-utqc/csharp/SnapKitty.AGT.slnx
    dotnet build ./sovereign-utqc/csharp/SnapKitty.AGT.slnx --configuration Release
    dotnet test ./sovereign-utqc/csharp/SnapKitty.AGT.slnx --configuration Release --no-build
else
    echo "Skipping C# build (missing toolchain)"
fi

# Build OCaml if toolchain available
if [ "$DUNE_OK" -eq 1 ]; then
    echo "Building OCaml snap-prism..."
    cd snap-prism
    opam install . --deps-only -y
    dune build
    dune runtest
    cd ..
else
    echo "Skipping OCaml build (missing toolchain)"
fi

echo ""
echo "All builds passed."
