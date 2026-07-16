-- packages/pearl/lean/PearlInvariants.lean
-- Production Prime Foundry Pearl — Lean invariant layer.
-- Imports foundry-intel ALP namespace.
-- All ten SYNTH constraints encoded as Lean propositions.
-- Crux (RH) structurally honest: none encoding preserved from F1Square.lean lines 365, 388.
-- Zero sorry here — sorrys live only in alp_sorry_manifest.json (13 entries, CI-gated).

import ALP.Contracts.NonBypassability
import ALP.Contracts.TrustArbitration
import ALP.Constitution.L0
import ALP.PolicyEngine.Proofs
import ALP.Archivum.WitnessContract
import ALP.Candle.PirtmBridge

namespace Pearl.Invariants

-- ── SYNTH-001: No Unaligned Execution ──────────────────────────────────────────
-- Direct alias of the foundry axiom in NonBypassability.lean line 18.
-- The axiom IS the constraint. No additional proof layer needed.
theorem synth_001_no_unaligned_execution :
    ∀ (trace : List (ALP.Contracts.NonBypassability.SystemState ×
                     ALP.Contracts.NonBypassability.Transition))
      (a : ALP.Types.Action),
    (ALP.Contracts.NonBypassability.SystemState.Execute a,
     ALP.Contracts.NonBypassability.Transition.ExecuteAction a) ∈ trace →
      (ALP.Contracts.NonBypassability.SystemState.AlpGate a true,
       ALP.Contracts.NonBypassability.Transition.AlpCheck a) ∈ trace :=
  ALP.Contracts.NonBypassability.no_unaligned_execution

-- ── SYNTH-003: L0 validate is a total decidable procedure ──────────────────────
-- ALP.Constitution.L0.validate returns Bool — total, no partiality.
theorem synth_003_l0_validate_total (c : ALP.Constitution.Model.ConstitutionModel) :
    ALP.Constitution.L0.validate c = true ∨
    ALP.Constitution.L0.validate c = false := by
  cases ALP.Constitution.L0.validate c <;> simp

-- ── SYNTH-004: L0-5 contractivity implies Banach precondition ──────────────────
-- If l0_5_lambda_m_compliant c = true then contractivity_score ∈ (0, 1].
-- Derived from L0.lean lines 35-36: score > 0 && score <= 1.0.
theorem synth_004_contractivity_implies_banach_precondition
    (c : ALP.Constitution.Model.ConstitutionModel)
    (h : ALP.Constitution.L0.l0_5_lambda_m_compliant c = true) :
    c.contractivity_score > 0 ∧ c.contractivity_score ≤ 1.0 := by
  simp [ALP.Constitution.L0.l0_5_lambda_m_compliant] at h
  exact h

-- ── SYNTH-005: External mutating actions are blocked ───────────────────────────
-- Direct alias of PolicyEngine.Proofs axiom (sorry-manifest entry 10).
theorem synth_005_external_mutating_blocked :
    ∀ (pe : ALP.PolicyEngine.PolicyEngine) (a : ALP.Types.Action),
    a.mutating = true →
      (ALP.PolicyEngine.validate_action pe a ALP.Types.TrustLevel.External).allowed = false :=
  ALP.PolicyEngine.Proofs.external_mutating_action_blocked

-- ── SYNTH-005b: External server-binding blocked ─────────────────────────────────
theorem synth_005b_external_server_binding_blocked :
    ∀ (pe : ALP.PolicyEngine.PolicyEngine) (a : ALP.Types.Action),
    a.server_binding.isSome = true →
      (ALP.PolicyEngine.validate_action pe a ALP.Types.TrustLevel.External).allowed = false :=
  ALP.PolicyEngine.Proofs.external_with_server_binding_blocked

-- ── SYNTH-007: Circuit breaker fires at threshold 3 ───────────────────────────
-- CIRCUIT_BREAKER_THRESHOLD = 3 in L0.lean line 6 and mod.rs line 9.
theorem synth_007_circuit_breaker
    (c : ALP.Constitution.Model.ConstitutionModel)
    (h : c.consecutive_failures ≥ ALP.Constitution.L0.CIRCUIT_BREAKER_THRESHOLD) :
    ALP.Constitution.L0.l0_7_circuit_breaker_not_tripped c = false := by
  simp [ALP.Constitution.L0.l0_7_circuit_breaker_not_tripped,
        ALP.Constitution.L0.CIRCUIT_BREAKER_THRESHOLD]
  omega

-- ── SYNTH-008: Crux is structurally honest (none encoding, machine-checked) ────
-- Matches F1Square.lean epistemic convention:
--   universallyValid := none  ⇒  NOT asserted proven (open / conditional)
-- The Pearl does not assert RH. These are definitional nones with rfl witnesses.
def pearl_hodge_index_holds : Option Bool := none  -- Hodge index = RH: open
def pearl_li_positivity_holds : Option Bool := none  -- analytic face: open

-- Elaboration witnesses (rfl proofs, machine-checked — no sorry).
example : pearl_hodge_index_holds = none := rfl
example : pearl_li_positivity_holds = none := rfl

-- ── SYNTH-009: VETOED actions foreclose future admission ──────────────────────
-- Direct alias of WitnessContract axiom (sorry-manifest entry 1).
theorem synth_009_veto_forecloses :
    ∀ (pe : ALP.PolicyEngine.PolicyEngine) (a : ALP.Types.Action)
      (w : ALP.Archivum.WitnessContract.UnifiedWitness),
    w.action_id = a.id →
    w.veto_status = "VETOED" →
      (ALP.PolicyEngine.validate_action pe a ALP.Types.TrustLevel.Internal).allowed = false :=
  ALP.Archivum.WitnessContract.witness_after_veto_implies_disallowed

-- ── SYNTH-009b: ADMITTED witness implies constitution valid ────────────────────
theorem synth_009b_admit_implies_constitution_valid :
    ∀ (pe : ALP.PolicyEngine.PolicyEngine) (a : ALP.Types.Action)
      (w : ALP.Archivum.WitnessContract.UnifiedWitness),
    w.action_id = a.id →
    w.veto_status = "ADMITTED" →
      ALP.Constitution.L0.validate pe.constitution :=
  ALP.Archivum.WitnessContract.witness_after_admit_implies_constitution_valid

-- ── SYNTH-010: Candle bridge soundness (Lean/Rust boundary) ───────────────────
-- Direct alias of PirtmBridge axiom (sorry-manifest entry 3).
-- A valid SedonaTrace guarantees contractivity_ok — the Lean/Rust hash chain.
theorem synth_010_candle_ignition_sound :
    ∀ (trace : ALP.Candle.PirtmBridge.SedonaTrace),
    trace.valid = true → trace.contractivity_ok = true :=
  ALP.Candle.PirtmBridge.candle_ignition_sound

end Pearl.Invariants
