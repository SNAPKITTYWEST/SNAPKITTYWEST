#!/bin/bash
# Build script for snap-prism-ocaml
# Attempts to build without full opam initialization

set -e

echo "Building snap-prism-ocaml..."

# Check if dune is available
if ! command -v dune &> /dev/null; then
    echo "Error: dune not found"
    echo ""
    echo "Install OCaml and dune:"
    echo "  Windows: winget install OCaml.opam"
    echo "  macOS: brew install ocaml opam"
    echo "  Linux: sudo apt install ocaml dune"
    echo ""
    echo "Then run:"
    echo "  opam init --bare"
    echo "  opam switch create 5.2.0"
    echo "  eval \$(opam env)"
    echo "  opam install sha2 digestif cmdliner alcotest"
    exit 1
fi

# Check if dependencies are installed
echo "Checking dependencies..."

# Try to build (will fail if dependencies missing)
if dune build 2>&1 | grep -q "Unknown package"; then
    echo ""
    echo "Missing dependencies. Installing via opam..."
    echo ""
    
    # Check if opam is available
    if command -v opam &> /dev/null; then
        echo "Installing dependencies with opam..."
        opam install sha2 digestif cmdliner alcotest -y
        echo ""
        echo "Dependencies installed. Building..."
        dune build
    else
        echo "Error: opam not found"
        echo "Install opam: winget install OCaml.opam"
        exit 1
    fi
else
    echo "Build successful!"
fi

# Run tests
echo ""
echo "Running tests..."
dune runtest

echo ""
echo "All tests passed!"
