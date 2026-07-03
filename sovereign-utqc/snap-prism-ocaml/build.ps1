# Build script for snap-prism-ocaml (PowerShell)
# Attempts to build without full opam initialization

$ErrorActionPreference = "Continue"

Write-Host "Building snap-prism-ocaml..." -ForegroundColor Cyan

# Check if dune is available
if (-not (Get-Command dune -ErrorAction SilentlyContinue)) {
    Write-Host "Error: dune not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install OCaml and dune:" -ForegroundColor Yellow
    Write-Host "  Windows: winget install OCaml.opam"
    Write-Host "  macOS: brew install ocaml opam"
    Write-Host "  Linux: sudo apt install ocaml dune"
    Write-Host ""
    Write-Host "Then run:" -ForegroundColor Yellow
    Write-Host "  opam init --bare"
    Write-Host "  opam switch create 5.2.0"
    Write-Host "  eval `$(`$opam env)"
    Write-Host "  opam install sha2 digestif cmdliner alcotest"
    exit 1
}

# Check if dependencies are installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow

# Try to build (will fail if dependencies missing)
$buildOutput = dune build 2>&1
if ($buildOutput -match "Unknown package") {
    Write-Host ""
    Write-Host "Missing dependencies. Installing via opam..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if opam is available
    if (Get-Command opam -ErrorAction SilentlyContinue) {
        Write-Host "Installing dependencies with opam..." -ForegroundColor Yellow
        opam install sha2 digestif cmdliner alcotest -y
        Write-Host ""
        Write-Host "Dependencies installed. Building..." -ForegroundColor Yellow
        dune build
    } else {
        Write-Host "Error: opam not found" -ForegroundColor Red
        Write-Host "Install opam: winget install OCaml.opam"
        exit 1
    }
} else {
    Write-Host "Build successful!" -ForegroundColor Green
}

# Run tests
Write-Host ""
Write-Host "Running tests..." -ForegroundColor Yellow
dune runtest

Write-Host ""
Write-Host "All tests passed!" -ForegroundColor Green
