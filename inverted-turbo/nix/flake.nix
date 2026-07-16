{
  description = "Inverted Turbo — Sovereign Twin + P/NP Swarm monorepo";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
    lean4 = {
      url = "github:leanprover/lean4/v4.19.0";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, lean4 }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

        # Agda for Agda twin AST verification
        agdaWithStdlib = pkgs.agda.withPackages (p: [ p.standard-library ]);

        # SBCL for Lisp world dump
        sbcl = pkgs.sbcl;

        # Regina REXX for daemon scripts
        regina = pkgs.reginaRexx;

        # Fortran compiler for SAT solver
        gfortran = pkgs.gfortran;

        # Lean 4 toolchain
        lean = lean4.packages.${system}.lean;

        # Node.js for doc generation
        nodejs = pkgs.nodejs_20;

      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            # Haskell
            pkgs.ghc
            pkgs.cabal-install
            pkgs.haskell-language-server

            # Rust
            rustToolchain

            # Lean
            lean

            # Agda
            agdaWithStdlib

            # Lisp
            sbcl

            # REXX
            regina

            # Fortran
            gfortran

            # Node.js
            nodejs

            # Utilities
            pkgs.git
            pkgs.jq
            pkgs.openssh
          ];

          shellHook = ''
            echo "╔══════════════════════════════════════════════════╗"
            echo "║  Inverted Turbo — Sovereign Twin Dev Shell      ║"
            echo "╠══════════════════════════════════════════════════╣"
            echo "║  GHC:        $(ghc --version | head -1)          ║"
            echo "║  Rust:       $(rustc --version)                  ║"
            echo "║  Lean:       $(lean --version)                   ║"
            echo "║  Agda:       $(agda --version)                   ║"
            echo "║  SBCL:       $(sbcl --version)                   ║"
            echo "║  Fortran:    $(gfortran --version | head -1)     ║"
            echo "║  REXX:       $(regina --version)                 ║"
            echo "║  Node.js:    $(node --version)                   ║"
            echo "╚══════════════════════════════════════════════════╝"
          '';
        };

        # Individual tool packages for CI
        packages = {
          inherit rustToolchain lean sbcl agdaWithStdlib gfortran regina;
        };
      }
    );
}
