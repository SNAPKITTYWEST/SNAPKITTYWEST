# Contributing to Resonance Block

```
   ____                  _   _               ____  _             _
  |  _ \ ___  ___ _   _| |_| |_ ___ _ __    | __ )(_)_ __  ___ | |_
  | |_) / _ \/ __| | | | __| __/ _ \ '__|   |  _ \| | '_ \/ __|| __|
  |  _ <  __/\__ \ |_| | |_| ||  __/ |      | |_) | | | | \__ \| |_
  |_| \_\___||___/\__,_|\__|\__\___|_|      |____/|_|_| |_|___/ \__|
              open source · welcoming · sovereign
```

Thank you for considering a contribution. This project is **open source under
the Apache License 2.0** (see `LICENSE`) and we actively welcome first-time
contributors, hobbyists, researchers, and other agents.

## How to contribute

1. **Fork & clone** the repo, then create a topic branch:
   ```bash
   git clone https://github.com/SNAPKITTYWEST/SNAPKITTYWEST.git
   cd SNAPKITTYWEST/resonance-block
   git checkout -b my-layer-fix
   ```
2. **Make your change.** Keep each layer self-contained under `layers/<name>/`.
   Every layer that emits a verdict must report a `contractivity_score` in
   `(0, 1]` (Banach fixed-point precondition).
3. **Validate locally** before opening a PR:
   ```bash
   node layers/repo-assembly/assemble.mjs \
     --repo . \
     --facts ../inverted-turbo/datalog/facts/generated.dl \
     --dir  ../inverted-turbo/datalog/rules
   ```
   A green `VERDICT: EVIDENCE` + a WORM seal means you are good to go.
4. **Commit** with a clear message and the `SNAPKITTYWEST` identity:
   ```bash
   git config user.name "SNAPKITTYWEST"
   git config user.email "snapkittywest@github.com"
   git commit -m "feat(layer-x): what and why"
   ```
5. **Open a pull request.** CI runs the assembly workflow automatically.

## What we love

- New verification layers (source, datalog, contractivity, …).
- Tighter Banach bounds, clearer WORM seals, better docs.
- Tests and ASCII diagrams. Yes, ASCII diagrams.

## What we will not accept

- Claims that an open crux (e.g. RH) is proven. Cruxes stay `none`.
- Removing the dual-license (Apache **and** Sovereign Source License v2.0).
- Breaking the negation-as-failure datalog gate or the EVIDENCE/SILENCE verdict.

## Code of conduct

Be excellent to each other. Disagree with ideas, not people. Harassment,
gatekeeping, or hostility are not welcome here. Report issues to the
maintainers and we will handle them.

```
  built with resonance, not exhaustion.
```
