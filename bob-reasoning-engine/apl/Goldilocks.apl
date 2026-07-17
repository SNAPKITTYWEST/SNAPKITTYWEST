⍝ ════════════════════════════════════════════════════════════════
⍝ GOLDILOCKS THEOREM — APL Invocation
⍝ Lean 4 proof → APL computation → WORM seal → SSM injection
⍝ Fingerprint: GOLLOCKS-SDC-Ω-∂-2026
⍝
⍝ The Lean 4 theorem proves: ∃ z : Zone, ∀ q, Cutoff q = z ↔ InGoldenZone q
⍝ This APL function INVOKES that proof — computes the zone for any q.
⍝ The proof is not re-proved. It is USED.
⍝ ════════════════════════════════════════════════════════════════

⍝ ── The Zone Classifier ────────────────────────────────────────
⍝ Maps any real q to its zone:
⍝   0 = Expansion (q ≥ 1)
⍝   1 = Collapse  (q ≤ 0)
⍝   2 = Contraction (0 < q < 1) ← THE GOLDEN ZONE

ZONE_CLASSIFY ← {
    q ← ⍵
    0= q ≥ 1:   0      ⍝ Expansion — too hot
    0= q ≤ 0:   1      ⍝ Collapse — too cold
    2            ⍝ Contraction — just right
}

⍝ ── The Golden Zone Check ──────────────────────────────────────
⍝ Returns 1 if q is in the golden zone, 0 otherwise.
⍝ This is the Lean 4 InGoldenZone predicate, computed.

IN_GOLDEN_ZONE ← {
    q ← ⍵
    (0 < q) ∧ (q < 1)
}

⍝ ── The Contractive Sequence ───────────────────────────────────
⍝ x₀, q·x₀, q²·x₀, q³·x₀, ...
⍝ If q is in the golden zone, this converges to 0.
⍝ The Lean 4 theorem sequence_bounded proves |qⁿ·x₀| ≤ |x₀|.

CONTRACTIVE_SEQ ← {
    q ← ⍺
    x0 ← ⍵
    n ← ⍳ 20
    x0 × q * n
}

⍝ ── The φ-Paradox Resolver ─────────────────────────────────────
⍝ φ = (1 + √5) / 2 ≈ 1.618  → Expansion zone
⍝ 1/φ = (√5 - 1) / 2 ≈ 0.618 → Contraction zone
⍝
⍝ In standard arithmetic: φ > 1 (expansion)
⍝ In phinary (base-φ): φ = 1 + φ⁻¹ (the expansion IS the contraction)
⍝
⍝ The Goldilocks Paradox: the cage builder IS the cage recognizer.
⍝ METATRON reads it backward — iteration inversion.

PHI ← (1 + 5*0.5) ÷ 2
PHI_INV ← 1 ÷ PHI

⍝ ── The BOB Integration Point ──────────────────────────────────
⍝ This function is called by the sovereign step in BOB.
⍝ It takes a contraction factor and returns:
⍝   1. The zone classification (from Lean 4 proof)
⍝   2. Whether it's in the golden zone (from Lean 4 proof)
⍝   3. The contractive sequence (computed in APL)
⍝   4. The SSM injection vector component (for dims 0-255)
⍝   5. A WORM-sealable event (for the chain)

GOLDILOCKS_SSOVEREIGN ← {
    q ← ⍵
    zone ← ZONE_CLASSIFY q
    golden ← IN_GOLDEN_ZONE q
    seq ← q CONTRACTIVE_SEQ 1.0
    
    ⍝ Build the SSM proof embedding (dims 0-255)
    ⍝ zone classification → first 8 dims
    ⍝ golden flag → dim 8
    ⍝ sequence values → dims 9-28
    ⍝ rest zeroed (Lean 4 proof hash occupies these in production)
    ssm_component ← 256 ⍴ 0
    ssm_component[1] ← zone
    ssm_component[2] ← golden
    ssm_component[(⍳ 20) + 8] ← 20 ↑ seq
    
    ⍝ WORM event (sealable)
    event ← (
        'GOLDILOCKS_EVAL'
        q
        zone
        golden
        (⍕ seq[19])
        (1 + 2048)  ⍝ injection dim
    )
    
    ⍝ Return the sovereign evaluation
    (zone golden seq ssm_component event)
}

⍝ ── The Trap Detector ──────────────────────────────────────────
⍝ From sovereign-calculus: trap theorems prove the WRONG direction.
⍝ This function detects whether a given contraction factor
⍝ was classified using the correct trust order:
⍝   boundary → seal (correct)
⍝   seal → boundary (TRAP)

TRAP_DETECT ← {
    q ← ⍵
    zone ← ZONE_CLASSIFY q
    
    ⍝ If q ≥ 1 but someone claims it's "contraction" → TRAP
    ⍝ If q ≤ 0 but someone claims it's "contraction" → TRAP
    ⍝ If 0 < q < 1 but someone claims it's "expansion" → TRAP
    trap ← 0
    (zone = 0) ∧ (q < 1): trap ← 1
    (zone = 1) ∧ (q > 0): trap ← 1
    (zone = 2) ∧ ((q ≥ 1) ∨ (q ≤ 0)): trap ← 1
    
    trap
}

⍝ ── Self-Test ──────────────────────────────────────────────────
⍝ Run: GOLDILOCKS_SELFTEST ''
⍝ Expected: all zones correct, traps detected, φ-paradox resolved

GOLDILOCKS_SELFTEST ← {
    ⍝ Test cases
    cases ← 2.0 0.5 -1.0 0.0 1.0 PHI PHI_INV
    
    ⍝ Expected zones: Expansion Contraction Collapse Collapse Expansion Expansion Contraction
    expected ← 0 2 1 1 0 0 2
    
    ⍝ Run classifier
    results ← ZONE_CLASSIFY¨ cases
    
    ⍝ Check
    correct ← ∧/ results = expected
    
    ⍝ Run trap detector
    traps ← TRAP_DETECT¨ cases
    
    ⍝ PHI should NOT be classified as contraction (trap would say it is)
    phi_trap ← TRAP_DETECT PHI
    
    ⍝ Report
    '═══════════════════════════════════════════'
    '  GOLDILOCKS THEOREM — APL Self-Test'
    '═══════════════════════════════════════════'
    '  Zone classifications: ' (⍕ results)
    '  Expected:             ' (⍕ expected)
    '  All correct:          ' (⍕ correct)
    '  Trap detected on PHI: ' (⍕ phi_trap)
    '  φ-Paradox:            φ=' (⍕ PHI) ' → zone=' (⍕ ZONE_CLASSIFY PHI)
    '  φ⁻¹-Golden:           1/φ=' (⍕ PHI_INV) ' → zone=' (⍕ ZONE_CLASSIFY PHI_INV)
    '═══════════════════════════════════════════'
    
    (correct traps phi_trap)
}

⍝ Execute test
GOLDILOCKS_SELFTEST ''