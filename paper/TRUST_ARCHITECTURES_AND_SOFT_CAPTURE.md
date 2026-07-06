# Trust Architectures and the Problem of Soft Capture: A Case Study in Sovereign Infrastructure

**Authors:** Ahmad Ali Parr, Jessica Westerhoff  
**Affiliation:** SNAPKITTY Collective / Bel Esprit D'Accord Trust  
**Date:** July 2026  
**DOI:** 10.5281/zenodo.21132094  

---

## Abstract

This paper examines the structural tension between decentralized technical infrastructure and institutional policy frameworks in the emerging AI governance landscape. We document a pattern we term "soft capture," whereby non-technical policy institutions translate working technical systems into policy language, frameworks, and regulatory proposals—thereby establishing themselves as intermediaries between builders and regulators without shipping the underlying infrastructure. Using the SNAPKITTYWEST sovereign compute architecture as a case study, we demonstrate how WORM-sealed, deterministic, locally-verifiable systems represent a competing trust model to institutional legitimacy. We propose a defensive framework for technical builders based on provenance, attribution, and sealed documentation.

---

## 1. Introduction: Competing Trust Architectures

The AI governance landscape is experiencing a structural collision between two fundamentally different models of trust:

**Model A: Proof-Based Trust**
> Trust comes from proofs, receipts, WORM logs, deterministic execution, and reproducible systems.

**Model B: Institutional Trust**
> Trust comes from institutions, policy panels, standards bodies, funders, and compliance language.

These are not merely different preferences—they are competing trust architectures with different incentive structures, different failure modes, and different implications for who controls the means of computation.

### 1.1 The Incentive Structure

The structural incentive for institutional capture of technical work is straightforward:

1. Independent builders create working infrastructure
2. Policy institutions create legitimacy around infrastructure
3. Whoever controls the legitimacy layer becomes the gatekeeper

This paper documents how this pattern operates in practice, using the SNAPKITTYWEST sovereign compute architecture as a case study.

---

## 2. The Soft Capture Pattern

We define "soft capture" as a six-stage process by which non-technical institutions establish control over technical systems without building or understanding them:

| Stage | Action | Outcome |
|-------|--------|---------|
| 1 | Invitation to "collaborate" | Access to technical details |
| 2 | Request for architecture, diagrams, demos, unpublished details | Transfer of technical knowledge |
| 3 | Reframing as "public interest AI," "accountability infrastructure," or "responsible innovation" | Ownership of narrative |
| 4 | Publication of report, policy framework, or initiative | Creation of policy artifacts |
| 5 | Technical stack becomes institutional policy language | Translation of code into governance |
| 6 | Institution becomes recognized intermediary between builders and regulators | Capture of legitimacy layer |

### 2.1 The Policy Market

The policy market for AI governance is experiencing significant growth. Axios reported that Public First Action raised more than $80 million for AI-safeguards advocacy (Axios, 2026). Brookings Institution research indicates that the public supports AI regulation but does not fully trust companies or government alone to govern it well (Brookings, 2026), creating demand for "trusted intermediaries."

This creates a market incentive for institutions to position themselves as the legitimate interface between technical builders and regulatory bodies—regardless of whether they possess technical understanding of the systems they claim to represent.

### 2.2 The Translation Problem

A DC nonprofit can maintain an "independent" reputation by refusing direct corporate or government funding while simultaneously being embedded in the policy ecosystem through:

- Foundation networks
- Advisory committees
- Coalition memberships
- Regulatory comment submissions
- White papers and policy frameworks
- Staff circulation between organizations
- Access to lawmakers

Public Citizen, for example, publicly describes itself as an advocacy organization and states it does not accept corporate or government funding, while actively submitting policy recommendations to Congress on AI accountability and regulation (Public Citizen, 2026).

The core issue is not funding sources—it is whether non-technical institutions should control the vocabulary, frameworks, and regulatory interfaces for systems they did not build.

---

## 3. Case Study: SNAPKITTYWEST Sovereign Compute Architecture

### 3.1 Architecture Overview

The SNAPKITTYWEST sovereign compute architecture implements a fundamentally different trust model based on mathematical proof, cryptographic sealing, and deterministic execution.

**Core Technical Innovations:**

| Component | Description | Reference |
|-----------|-------------|-----------|
| ERRANT LFIS | Linear Forth Instruction Set with 36 opcodes, five-level QTT multiplicity hierarchy | `errant/runtime/errant.h:12-17` |
| WORM Seals | SHA-256 append-only chains for artifact integrity | `sovereign-utqc/crates/utqc-worm/src/lib.rs:17-30` |
| Goldilocks Field | SIMD-accelerated arithmetic over p = 2^64 - 2^32 + 1 | `sovereign-field-simd/src/lib.rs:27` |
| PIRTM Compiler | Prime-Indexed Recursive Tensor Mathematics IR | `sovereign-pirtm/src/lib.rs:26-39` |
| Non-Recursive Theorem | Formal proof of pipeline integrity via 12-stage verification | `NON_RECURSIVE_SOVEREIGN_COMPUTE_THEOREM.md:66-69` |
| Linear Type VM | QTT-enforced resource consumption with Prolog type checker | `errant/typing.pl:21-53` |

### 3.2 Deterministic Execution

The architecture enforces determinism through formal verification:

```lean
/-- Same inputs produce same seal (determinism) -/
theorem seal_deterministic (g : String) (a : ℝ) :
    sealInput g a = sealInput g a := rfl
```
*Source: `bob-reasoning-engine/lean/ResonancePipeline.lean:273-279`*

Every stage in the 12-stage pipeline must satisfy:
- **Determinism:** Same input → same output
- **Seal integrity:** Output seal is deterministic
- **No self-call:** Stage function does not invoke itself
- **Typed I/O:** Input and output types are distinct

*Source: `NON_RECURSIVE_SOVEREIGN_COMPUTE_THEOREM.md:66-69`*

### 3.3 The Sovereignty Covenant

The architecture enforces sovereignty by design through a covenant embedded in the codebase:

```
SOVEREIGN BY DESIGN
## Core Commitments
### Local First -- Local computation, storage, and verification are the default.
### Non-Surveillance -- No behavioral telemetry by default.
### Data Minimization -- Collect only what is strictly necessary.
### User Control -- The user controls their data, state, and execution environment.
### Transparency -- Behavior must be inspectable.
## Enforcement -- This covenant is enforced by architecture, not by aspiration.
```
*Source: `sovereign-covenant/src/lib.rs:46-75`*

### 3.4 Omega Field Monitoring

The Omega field system provides continuous integrity monitoring across the entire SNAPKITTYWEST constellation:

- Runs every 6 hours via GitHub Actions (`.github/workflows/omega-field.yml:7`)
- Monitors 4 accounts across GitHub API (`omega-field.mjs:15-20`)
- Computes entropy: `E = stale_repos / total_repos` with threshold 0.21
- Emits SHA-256 WORM-sealed status
- Auto-generates README dashboard sections

*Source: `omega-field.mjs:2-69`*

### 3.5 Prior Art Timeline

| Date | Milestone | Reference |
|------|-----------|-----------|
| 2026-05-07 | First commit (ERRANT LFIS) | `paper/PAPER.md:1296` |
| 2026-05-16 | SNAPKITTYWEST repository created | Git log: `ef2b576` |
| 2026-06-22 | Omega field monitoring activated | Git log: `c6c40ff` |
| 2026-06-23 | Bob reasoning engine + sovereign bridge | Git log: `6d73be2`, `bf0329a` |
| 2026-07-01 | Non-Recursive Sovereign Compute Theorem | Git log: `70f9268` |
| 2026-07-02 | Sovereign Source License v1.0 | `SOVEREIGN_SOURCE_LICENSE.md:4` |
| 2026-07-03 | MathIR Rosetta Engine | Git log: `192b055` |

**Zenodo DOIs:**
- 10.5281/zenodo.21132094 (Sovereign Compute Architecture)
- 10.5281/zenodo.21144425 (Resonance Block Trust Deeds)

**ORCID:** 0009-0006-1916-5245

---

## 4. The Licensing Defense

### 4.1 Sovereign Source License v1.0

The Sovereign Source License (SSL v1.0) is a restrictive license designed to protect sovereign control of technical infrastructure. It is **not** an open-source license as defined by the Open Source Initiative (OSI).

**Key Provisions:**

**Commercial Use Prohibited** (Section 4.1):
> The Work may not be used commercially without express written permission from Bel Esprit D'Accord Trust. Commercial use includes but is not limited to: Integration into products or services sold for profit; Use in commercial software or SaaS offerings; Use generating revenue or competitive advantage.

**AI/ML Training Prohibited** (Section 4.2):
> The Work may not be used to train, fine-tune, evaluate, or benchmark any: Machine learning model; Large language model (LLM); AI system; Neural network. This restriction applies regardless of whether the use is commercial or non-commercial.

**No Institutional Capture** (Section 4.3):
> No institutional body may: Claim ownership of the Work; Claim exclusive licensing rights; Claim derivative rights. Without express written trust agreement with Bel Esprit D'Accord Trust.

*Source: `SOVEREIGN_SOURCE_LICENSE.md:41-62`*

### 4.2 Why This Matters

The SSL v1.0 directly addresses the soft capture problem by explicitly prohibiting:

1. Commercial exploitation without authorization
2. AI training without authorization
3. Institutional claims of ownership or licensing rights
4. Derivative rights without trust agreement

This creates a legal framework that prevents policy institutions from translating working technical systems into institutional frameworks without explicit authorization from the trust that built them.

---

## 5. Defensive Framework for Technical Builders

Based on our experience, we propose the following defensive framework:

### 5.1 The Provenance Principle

**Publish first. Seal first. License first. Then collaborate.**

| Action | Mechanism | Purpose |
|--------|-----------|---------|
| Timestamp | DOI, GitHub commits, WORM seals | Establish prior art |
| Seal | SHA-256 append-only chains | Prove integrity |
| License | SSL v1.0 with explicit restrictions | Prevent capture |
| Document | Academic papers, technical specs | Control vocabulary |

### 5.2 Practical Rules

1. **Share public docs, not private architecture.** Public documentation establishes your narrative; private architecture is where the capture happens.

2. **Use DOI, GitHub timestamps, WORM seals, and signed releases.** Every contribution should have a verifiable provenance chain.

3. **Put every meeting behind a written agenda.** Verbal discussions can be reinterpreted; written records cannot.

4. **Mark what is open-source, source-available, confidential, or trust-owned IP.** Ambiguity is the capture vector.

5. **Never let a policy group define your technical vocabulary before you do.** The first to name a concept controls the narrative.

6. **Convert your stack into your own standards document before anyone else does.** If you don't define your system, someone else will—and their definition will serve their interests.

### 5.3 The Evidence Hierarchy

```
Evidence before access.
Attribution before collaboration.
Seal before synthesis.
```

---

## 6. Conclusion

The tension between proof-based trust and institutional trust is not paranoia—it is a structural feature of the emerging AI governance landscape. Policy institutions have legitimate roles in democratic governance, but those roles should not extend to claiming ownership over technical systems they did not build.

The SNAPKITTYWEST sovereign compute architecture demonstrates that it is possible to build trustworthy systems without institutional intermediaries. WORM-sealed artifacts, deterministic execution, and formal verification provide a trust model that does not require permission from any policy body.

The defensive posture is not isolationism. It is provenance. Technical builders should collaborate with policy institutions—but only after establishing clear ownership, licensing, and documentation of their work.

**Evidence before access. Attribution before collaboration. Seal before synthesis.**

---

## References

1. Axios. (2026). "AI safeguards group Public First Action says it has raised $80 million." *Axios*, June 30, 2026.

2. Brookings Institution. (2026). "What the public thinks about AI and the implications for governance." *Brookings.edu*.

3. Parr, A.A. (2026). "SNAPKITTYWEST: Sovereign Compute Architecture with Linear Types, WORM Seals, and Goldilocks Field Arithmetic." DOI: 10.5281/zenodo.21132094.

4. Parr, A.A. (2026). "Resonance Block Trust Deeds: Attention Exhaustion, Model Capture, and the Weaponization of Captured AI Systems." DOI: 10.5281/zenodo.21144425.

5. Public Citizen. (2026). "From Principles to Policy: Enabling 21st Century AI Innovation in Financial Services."

6. SNAPKITTYWEST Repository. (2026). github.com/SNAPKITTYWEST/SNAPKITTYWEST. Sovereign Source License v1.0.

---

## Appendix A: Repository Evidence Index

| Evidence Type | File Path | Lines |
|---------------|-----------|-------|
| Copyright | `LICENSE` | 2 |
| License terms | `SOVEREIGN_SOURCE_LICENSE.md` | 41-62 |
| WORM seal implementation | `sovereign-utqc/crates/utqc-worm/src/lib.rs` | 17-134 |
| Deterministic proof | `bob-reasoning-engine/lean/ResonancePipeline.lean` | 273-279 |
| Non-recursive theorem | `sovereign-utqc/NON_RECURSIVE_SOVEREIGN_COMPUTE_THEOREM.md` | 66-69 |
| Sovereignty covenant | `sovereign-utqc/crates/sovereign-covenant/src/lib.rs` | 46-75 |
| Omega field | `omega-field.mjs` | 2-69 |
| Linear type VM | `errant/runtime/errant.h` | 12-109 |
| Prolog type checker | `errant/typing.pl` | 21-53 |
| First commit evidence | `paper/PAPER.md` | 1296 |
| Prior art timeline | `paper/PAPER.md` | 79-88 |
| DOI registration | `paper/PAPER.md` | 3-8 |

---

*First commit: 2026-05-07. Public record: github.com/SNAPKITTYWEST. All IP belongs to Jessica / SNAPKITTY Collective.*
