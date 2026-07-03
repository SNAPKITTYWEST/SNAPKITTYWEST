#!/usr/bin/env bash
# Master build script for SNAPKITTYWEST sovereign compute stack
# Builds all components: Haskell, C++, C#, OCaml

set -euo pipefail

echo "============================================"
echo "SNAPKITTYWEST Sovereign Compute Stack Build"
echo "============================================"
echo ""

# Track results
HASKELL_OK=0
CPP_OK=0
CSHARP_OK=0
OCAML_OK=0

# ════════════════════════════════════════════════════════════════
# Phase 1: Haskell Datalog Engine
# ════════════════════════════════════════════════════════════════
echo "Phase 1: Haskell Datalog Engine"
echo "--------------------------------"

if command -v ghc &> /dev/null; then
    echo "  GHC found: $(ghc --version)"
    
    # Check for cabal
    if command -v cabal &> /dev/null; then
        echo "  Building Haskell Datalog Engine..."
        cd errant/datalog
        if cabal build; then
            echo "  ✓ Haskell Datalog Engine built successfully"
            HASKELL_OK=1
        else
            echo "  ✗ Haskell Datalog Engine build failed"
        fi
        cd ../..
    else
        echo "  ✗ cabal not found"
    fi
else
    echo "  ✗ GHC not found (Haskell build skipped)"
fi
echo ""

# ════════════════════════════════════════════════════════════════
# Phase 2: C++ Modules
# ════════════════════════════════════════════════════════════════
echo "Phase 2: C++ Modules"
echo "--------------------"

if command -v cmake &> /dev/null; then
    echo "  CMake found: $(cmake --version | head -1)"
    
    # Check for Ninja or Make
    if command -v ninja &> /dev/null; then
        GENERATOR="Ninja"
    elif command -v make &> /dev/null; then
        GENERATOR="Unix Makefiles"
    else
        GENERATOR="Visual Studio 17 2022"
    fi
    
    echo "  Generator: $GENERATOR"
    echo "  Building C++ modules..."
    
    cd sovereign-utqc/cpp
    mkdir -p build
    
    if cmake -S . -B build -G "$GENERATOR" && cmake --build build; then
        echo "  ✓ C++ modules built successfully"
        CPP_OK=1
    else
        echo "  ✗ C++ modules build failed"
    fi
    cd ../..
else
    echo "  ✗ CMake not found (C++ build skipped)"
fi
echo ""

# ════════════════════════════════════════════════════════════════
# Phase 3: C# AGT
# ════════════════════════════════════════════════════════════════
echo "Phase 3: C# AGT"
echo "----------------"

if command -v dotnet &> /dev/null; then
    echo "  .NET found: $(dotnet --version)"
    
    echo "  Building C# AGT..."
    cd sovereign-utqc/csharp
    
    if dotnet build SnapKitty.AGT.slnx --configuration Release; then
        echo "  ✓ C# AGT built successfully"
        
        echo "  Running tests..."
        if dotnet test SnapKitty.AGT.slnx --configuration Release --no-build; then
            echo "  ✓ C# AGT tests passed"
            CSHARP_OK=1
        else
            echo "  ✗ C# AGT tests failed"
        fi
    else
        echo "  ✗ C# AGT build failed"
    fi
    cd ../..
else
    echo "  ✗ .NET not found (C# build skipped)"
fi
echo ""

# ════════════════════════════════════════════════════════════════
# Phase 4: OCaml snap-prism
# ════════════════════════════════════════════════════════════════
echo "Phase 4: OCaml snap-prism"
echo "-------------------------"

if command -v dune &> /dev/null; then
    echo "  dune found: $(dune --version)"
    
    echo "  Building OCaml snap-prism..."
    cd sovereign-utqc/snap-prism-ocaml
    
    if dune build; then
        echo "  ✓ OCaml snap-prism built successfully"
        
        echo "  Running tests..."
        if dune runtest; then
            echo "  ✓ OCaml snap-prism tests passed"
            OCAML_OK=1
        else
            echo "  ✗ OCaml snap-prism tests failed"
        fi
    else
        echo "  ✗ OCaml snap-prism build failed"
    fi
    cd ../..
else
    echo "  ✗ dune not found (OCaml build skipped)"
fi
echo ""

# ════════════════════════════════════════════════════════════════
# Phase 5: Rust Workspaces
# ════════════════════════════════════════════════════════════════
echo "Phase 5: Rust Workspaces"
echo "------------------------"

if command -v cargo &> /dev/null; then
    echo "  Cargo found: $(cargo --version)"
    
    echo "  Building sovereign-utqc..."
    if cargo test --manifest-path sovereign-utqc/Cargo.toml --workspace; then
        echo "  ✓ sovereign-utqc tests passed"
    else
        echo "  ✗ sovereign-utqc tests failed"
    fi
    
    echo "  Building sovereign-llm..."
    if cargo test --manifest-path sovereign-llm/Cargo.toml --workspace; then
        echo "  ✓ sovereign-llm tests passed"
    else
        echo "  ✗ sovereign-llm tests failed"
    fi
else
    echo "  ✗ Cargo not found (Rust build skipped)"
fi
echo ""

# ════════════════════════════════════════════════════════════════
# Summary
# ════════════════════════════════════════════════════════════════
echo "============================================"
echo "Build Summary"
echo "============================================"
echo ""
echo "  Haskell Datalog: $([ $HASKELL_OK -eq 1 ] && echo '✓ PASS' || echo '✗ FAIL')"
echo "  C++ Modules:     $([ $CPP_OK -eq 1 ] && echo '✓ PASS' || echo '✗ FAIL')"
echo "  C# AGT:          $([ $CSHARP_OK -eq 1 ] && echo '✓ PASS' || echo '✗ FAIL')"
echo "  OCaml snap-prism: $([ $OCAML_OK -eq 1 ] && echo '✓ PASS' || echo '✗ FAIL')"
echo ""

# Calculate total
TOTAL=$((HASKELL_OK + CPP_OK + CSHARP_OK + OCAML_OK))
echo "  Total: $TOTAL/4 components built successfully"
echo ""

if [ $TOTAL -eq 4 ]; then
    echo "All components built successfully!"
    exit 0
else
    echo "Some components failed to build."
    exit 1
fi
