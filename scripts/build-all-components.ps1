# Master build script for SNAPKITTYWEST sovereign compute stack (PowerShell)
# Builds all components: Haskell, C++, C#, OCaml

$ErrorActionPreference = "Continue"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "SNAPKITTYWEST Sovereign Compute Stack Build" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Track results
$HaskellOk = $false
$CppOk = $false
$CsharpOk = $false
$OcamlOk = $false

# ════════════════════════════════════════════════════════════════
# Phase 1: Haskell Datalog Engine
# ════════════════════════════════════════════════════════════════
Write-Host "Phase 1: Haskell Datalog Engine" -ForegroundColor Yellow
Write-Host "--------------------------------"

if (Get-Command ghc -ErrorAction SilentlyContinue) {
    Write-Host "  GHC found: $(ghc --version)"
    
    if (Get-Command cabal -ErrorAction SilentlyContinue) {
        Write-Host "  Building Haskell Datalog Engine..."
        Push-Location errant/datalog
        
        if (cabal build 2>&1) {
            Write-Host "  ✓ Haskell Datalog Engine built successfully" -ForegroundColor Green
            $HaskellOk = $true
        } else {
            Write-Host "  ✗ Haskell Datalog Engine build failed" -ForegroundColor Red
        }
        
        Pop-Location
    } else {
        Write-Host "  ✗ cabal not found" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ GHC not found (Haskell build skipped)" -ForegroundColor Yellow
}
Write-Host ""

# ════════════════════════════════════════════════════════════════
# Phase 2: C++ Modules
# ════════════════════════════════════════════════════════════════
Write-Host "Phase 2: C++ Modules" -ForegroundColor Yellow
Write-Host "--------------------"

if (Get-Command cmake -ErrorAction SilentlyContinue) {
    Write-Host "  CMake found: $(cmake --version | Select-Object -First 1)"
    
    Write-Host "  Building C++ modules..."
    Push-Location sovereign-utqc/cpp
    
    if (cmake -S . -B build) {
        if (cmake --build build) {
            Write-Host "  ✓ C++ modules built successfully" -ForegroundColor Green
            $CppOk = $true
        } else {
            Write-Host "  ✗ C++ modules build failed" -ForegroundColor Red
        }
    } else {
        Write-Host "  ✗ CMake configuration failed" -ForegroundColor Red
    }
    
    Pop-Location
} else {
    Write-Host "  ✗ CMake not found (C++ build skipped)" -ForegroundColor Yellow
}
Write-Host ""

# ════════════════════════════════════════════════════════════════
# Phase 3: C# AGT
# ════════════════════════════════════════════════════════════════
Write-Host "Phase 3: C# AGT" -ForegroundColor Yellow
Write-Host "----------------"

if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    Write-Host "  .NET found: $(dotnet --version)"
    
    Write-Host "  Building C# AGT..."
    Push-Location sovereign-utqc/csharp
    
    if (dotnet build SnapKitty.AGT.slnx --configuration Release 2>&1) {
        Write-Host "  ✓ C# AGT built successfully" -ForegroundColor Green
        
        Write-Host "  Running tests..."
        if (dotnet test SnapKitty.AGT.slnx --configuration Release --no-build 2>&1) {
            Write-Host "  ✓ C# AGT tests passed" -ForegroundColor Green
            $CsharpOk = $true
        } else {
            Write-Host "  ✗ C# AGT tests failed" -ForegroundColor Red
        }
    } else {
        Write-Host "  ✗ C# AGT build failed" -ForegroundColor Red
    }
    
    Pop-Location
} else {
    Write-Host "  ✗ .NET not found (C# build skipped)" -ForegroundColor Yellow
}
Write-Host ""

# ════════════════════════════════════════════════════════════════
# Phase 4: OCaml snap-prism
# ════════════════════════════════════════════════════════════════
Write-Host "Phase 4: OCaml snap-prism" -ForegroundColor Yellow
Write-Host "-------------------------"

if (Get-Command dune -ErrorAction SilentlyContinue) {
    Write-Host "  dune found: $(dune --version)"
    
    Write-Host "  Building OCaml snap-prism..."
    Push-Location sovereign-utqc/snap-prism-ocaml
    
    if (dune build 2>&1) {
        Write-Host "  ✓ OCaml snap-prism built successfully" -ForegroundColor Green
        
        Write-Host "  Running tests..."
        if (dune runtest 2>&1) {
            Write-Host "  ✓ OCaml snap-prism tests passed" -ForegroundColor Green
            $OcamlOk = $true
        } else {
            Write-Host "  ✗ OCaml snap-prism tests failed" -ForegroundColor Red
        }
    } else {
        Write-Host "  ✗ OCaml snap-prism build failed" -ForegroundColor Red
    }
    
    Pop-Location
} else {
    Write-Host "  ✗ dune not found (OCaml build skipped)" -ForegroundColor Yellow
}
Write-Host ""

# ════════════════════════════════════════════════════════════════
# Phase 5: Rust Workspaces
# ════════════════════════════════════════════════════════════════
Write-Host "Phase 5: Rust Workspaces" -ForegroundColor Yellow
Write-Host "------------------------"

if (Get-Command cargo -ErrorAction SilentlyContinue) {
    Write-Host "  Cargo found: $(cargo --version)"
    
    Write-Host "  Building sovereign-utqc..."
    if (cargo test --manifest-path sovereign-utqc/Cargo.toml --workspace 2>&1) {
        Write-Host "  ✓ sovereign-utqc tests passed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ sovereign-utqc tests failed" -ForegroundColor Red
    }
    
    Write-Host "  Building sovereign-llm..."
    if (cargo test --manifest-path sovereign-llm/Cargo.toml --workspace 2>&1) {
        Write-Host "  ✓ sovereign-llm tests passed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ sovereign-llm tests failed" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ Cargo not found (Rust build skipped)" -ForegroundColor Yellow
}
Write-Host ""

# ════════════════════════════════════════════════════════════════
# Summary
# ════════════════════════════════════════════════════════════════
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Build Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Haskell Datalog: $(if ($HaskellOk) { '✓ PASS' } else { '✗ FAIL' })"
Write-Host "  C++ Modules:     $(if ($CppOk) { '✓ PASS' } else { '✗ FAIL' })"
Write-Host "  C# AGT:          $(if ($CsharpOk) { '✓ PASS' } else { '✗ FAIL' })"
Write-Host "  OCaml snap-prism: $(if ($OcamlOk) { '✓ PASS' } else { '✗ FAIL' })"
Write-Host ""

# Calculate total
$Total = @($HaskellOk, $CppOk, $CsharpOk, $OcamlOk) | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count
Write-Host "  Total: $Total/4 components built successfully"
Write-Host ""

if ($Total -eq 4) {
    Write-Host "All components built successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some components failed to build." -ForegroundColor Yellow
    exit 1
}
