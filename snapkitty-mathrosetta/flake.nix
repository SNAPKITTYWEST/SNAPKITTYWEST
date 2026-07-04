{
  description = "SnapKitty Rosetta Math Engine — Universal Mathematical Translation";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
    naersk.url = "github:nix-community/naersk";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, naersk }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

        naersk' = pkgs.callPackage naersk {
          cargo = rustToolchain;
          rustc = rustToolchain;
        };

        # Solver Zoo
        z3 = pkgs.z3.overrideAttrs (old: rec {
          version = "4.13.0";
          src = pkgs.fetchFromGitHub {
            owner = "Z3Prover";
            repo = "z3";
            rev = "z3-${version}";
            sha256 = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          };
          cmakeFlags = old.cmakeFlags ++ [
            "-DZ3_BUILD_LIBZ3_SHARED=ON"
            "-DZ3_INSTALL_PYTHON_BINDINGS=OFF"
          ];
        });

        sympy = pkgs.python3.withPackages (ps: with ps; [
          sympy
          mpmath
        ]);

        cvode = pkgs.sundials;
        singular = pkgs.singular;
        lean4 = pkgs.lean4;
        cgal = pkgs.cgal;

        julia = pkgs.julia-bin;

        # Neural solver (ONNX runtime)
        neural-solver = pkgs.python3.withPackages (ps: with ps; [
          onnxruntime
          numpy
          scipy
        ]);

        # MathIR core (Rust)
        mathir-core = naersk'.buildPackage {
          pname = "mathir";
          version = "0.1.0";
          src = ./.;
          cargoBuildFlags = [ "--bin" "sk-math" ];
        };

        # Full solver zoo package
        solver-zoo = pkgs.symlinkJoin {
          name = "solver-zoo";
          paths = [
            z3
            sympy
            cvode
            singular
            lean4
            cgal
            julia
            neural-solver
          ];
        };

      in {
        packages = {
          default = mathir-core;
          inherit mathir-core z3 sympy cvode singular lean4 cgal julia neural-solver solver-zoo;
        };

        apps = {
          sk-math = {
            type = "app";
            program = "${mathir-core}/bin/sk-math";
          };
          default = self.apps.${system}.sk-math;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [
            rustToolchain
            pkgs.cargo-watch
            pkgs.rust-analyzer
            pkgs.prolog
            pkgs.swi-prolog
            pkgs.cmake
            pkgs.pkg-config
            pkgs.openssl

            # Solver Zoo for development
            z3
            sympy
            cvode
            singular
            lean4
            cgal
            julia
            neural-solver
          ];

          shellHook = ''
            echo "SnapKitty Rosetta Math Engine — Dev Shell"
            echo "Solvers available: z3, sympy, cvode, singular, lean4, cgal, julia, neural"
            echo ""
            echo "Commands:"
            echo "  cargo build          — Build MathIR core"
            echo "  cargo run --bin sk-math — Run sk-math CLI"
            echo "  cargo test           — Run tests"
            echo "  cargo watch -x run   — Watch mode"
            echo ""
            echo "Prolog policies: policies/solver_policy.pl"
            echo "Nix flake: flake.nix"
          '';
        };

        nixosModules.default = { config, ... }: {
          nixpkgs.overlays = [ self.overlays.default ];

          environment.systemPackages = [
            self.packages.${system}.mathir-core
            self.packages.${system}.solver-zoo
          ];

          # Optional: systemd service for gRPC daemon
          # systemd.services.snapkitty-mathrosetta = {
          #   wantedBy = [ "multi-user.target" ];
          #   serviceConfig = {
          #     ExecStart = "${self.packages.${system}.mathir-core}/bin/sk-math serve --port 50051";
          #     User = "mathrosetta";
          #     Restart = "on-failure";
          #   };
          # };
        };

        overlays.default = final: prev: {
          inherit (self.packages.${system})
            mathir-core
            solver-zoo
            z3
            sympy
            cvode
            singular
            lean4
            cgal
            julia
            neural-solver;
        };
      }
    );
}
