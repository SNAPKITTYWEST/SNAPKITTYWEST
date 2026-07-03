# PowerShell version for Windows
# Run: .\scripts\build-all.ps1

$ErrorActionPreference = "Continue"

Write-Host "Checking toolchains..." -ForegroundColor Cyan

# Check each toolchain
$clangOk = $false
$mlirOk = $false
$dotnetOk = $false
$duneOk = $false

if (Get-Command clang++ -ErrorAction SilentlyContinue) {
    Write-Host "  clang++: OK" -ForegroundColor Green
    $clangOk = $true
} else {
    Write-Host "  clang++: NOT FOUND (C++ build skipped)" -ForegroundColor Yellow
}

if (Get-Command mlir-opt -ErrorAction SilentlyContinue) {
    Write-Host "  mlir-opt: OK" -ForegroundColor Green
    $mlirOk = $true
} else {
    Write-Host "  mlir-opt: NOT FOUND (MLIR build skipped)" -ForegroundColor Yellow
}

if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    Write-Host "  dotnet: OK" -ForegroundColor Green
    $dotnetOk = $true
} else {
    Write-Host "  dotnet: NOT FOUND (C# build skipped)" -ForegroundColor Yellow
}

if (Get-Command dune -ErrorAction SilentlyContinue) {
    Write-Host "  dune: OK" -ForegroundColor Green
    $duneOk = $true
} else {
    Write-Host "  dune: NOT FOUND (OCaml build skipped)" -ForegroundColor Yellow
}

Write-Host ""

# Build C++ if toolchain available
if ($clangOk -and $mlirOk) {
    Write-Host "Building C++ / LLVM / MLIR..." -ForegroundColor Yellow
    cmake -S cpp -B build/cpp -G Ninja
    cmake --build build/cpp
    ctest --test-dir build/cpp --output-on-failure
} else {
    Write-Host "Skipping C++ build (missing toolchain)" -ForegroundColor Yellow
}

# Build C# if toolchain available
if ($dotnetOk) {
    Write-Host "Building C# AGT..." -ForegroundColor Yellow
    dotnet restore ./sovereign-utqc/csharp/SnapKitty.AGT.slnx
    dotnet build ./sovereign-utqc/csharp/SnapKitty.AGT.slnx --configuration Release
    dotnet test ./sovereign-utqc/csharp/SnapKitty.AGT.slnx --configuration Release --no-build
} else {
    Write-Host "Skipping C# build (missing toolchain)" -ForegroundColor Yellow
}

# Build OCaml if toolchain available
if ($duneOk) {
    Write-Host "Building OCaml snap-prism..." -ForegroundColor Yellow
    Push-Location snap-prism
    opam install . --deps-only -y
    dune build
    dune runtest
    Pop-Location
} else {
    Write-Host "Skipping OCaml build (missing toolchain)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All builds passed." -ForegroundColor Green
