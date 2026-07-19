# The Foundation of Multiplicity - The Prime Materia Commons

**The world's first trustless, formally verified orchestration engine over 𝔽₁.**

The Prime Materia Commons (Phase Mirror) represents the foundational stack of Multiplicity. It translates natural language commands and agentic decisions into deterministically verified state transitions using a pure mathematical foundation and recursive zero-knowledge consensus. This ensures that no hallucination, malicious injection, or out-of-bounds mutation can ever reach physical execution.

## The Sedona Spine Architecture

The architecture relies on an interconnected series of immutable constraints and mathematically uncheatable circuit breakers, collectively known as the **Sedona Spine**.

### 1. The UAC-ALP Boundary (Axiom-Clean Verification)
The **Universal Atomic Calculator (UAC)** provides a 100% formally verified, pure-math engine in Lean 4. To bridge pure math with real-world policy enforcement, the **Atomic Language Policy (ALP)** layer is employed. 
- **Manifested Gaps:** A gated boundary (`alp_sorry_manifest.json`) strictly bounds the transition. Any unverified `sorry` in Lean must be explicitly manifested, ensuring unverified logic can never silently leak into policy decisions. This boundary is rigorously audited on every CI run.

### 2. Sigma Kernel & Dissonance Engine
The **Sigma Kernel** evaluates physical operational metrics. It synchronously routes all actions through the `mirror-dissonance` engine to verify critical physical invariants:
- **$L_{eff} < 1.0$** (Effective Latency Boundary)
- **$\Delta R_{sc} \le \tau_R$** (Resource Scaling Thresholds)
Violations explicitly generate a `ConflictLogSchema` trap and stamp a **PWEH** witness to the Archivum ledger before hard-rejecting the transition.

### 3. Governance Gateway (The Triple-Lock)
Decisions made by agentic protocols are cross-examined against both the dissonance engine and the Constitutional core using a **Triple-Lock** verification loop:
1. **Guardian:** Validates mathematical constraints and Normal Form representations.
2. **Examiner:** Checks baseline drifts and system thresholds.
3. **Publisher (Gateway):** Finalizes the `VerifiedManifest`.
**Mathematical Resilience:** The Gateway explicitly blocks adversarial exhaustion and state confusion by strictly bounding `retry_nonce` (preventing infinite convergence loops) and hard-rejecting any `PROVISIONAL` states. Only definitively resolved witnesses can enter the immutable ledger.

### 4. Bootstrapped CI/CD Trust Chain
The trust chain extends upward to the deployment topology itself. The pipeline creates a cryptographic hash of the entire governance test suite (`GOV_HASH.sig`) to prevent zero-drift policy tampering. It then signs its own successful execution, appending a `pipeline_attestation` `UnifiedWitness` to the Archivum ledger. The pipeline itself is an auditable, cryptographic actor.

## Implications for Agentic Protocols

This stack provides the definitive blueprint for aligning advanced AI agent output with physical systems. By treating policy as geometry and deployments as mathematical theorems, the Prime Materia Commons ensures:
- **Total Traceability:** Every execution outputs a cryptographically verified `UnifiedWitness` anchored to the GitLedger.
- **Determinism:** Agentic output cannot bypass the `Triple-Lock`.
- **Absolute Safety:** Operational drift is mathematically impossible, making the platform uncheatable even against highly capable, adversarial orchestrators.

## Getting Started
To boot up the Phase Mirror and explore the UI:
```bash
cargo run -p pirtm-ui
```

Dive deeper into the foundational axioms in our [Whitepaper](WHITEPAPER.md) and the `docs/adr/` repository.
