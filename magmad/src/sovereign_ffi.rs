// sovereign_ffi.rs — Rust FFI bindings to libsovereign.a
//
// Safe Rust wrappers around the certified C SovereignJudge.
// Mirrors the ERRANT FFI pattern (errant_ffi.rs).
//
// libsovereign is compiled by build.rs from sovereign-judge/sovereign_judge.c.
// The C implementation is a faithful translation of proofs/coq/SovereignJudge.v.
// Theorems T1-T15 are preserved — every gate call is certified.

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};

// ── Raw C layout (must match sovereign_judge.h exactly) ────────────────────

#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CVerdictTag {
    Approve       = 0,
    Defer         = 1,
    Reject        = 2,
    HumanRequired = 3,
    Escalate      = 4,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CMoralVerdict {
    Approve = 0,
    Reject  = 1,
    Repent  = 2,
}

#[repr(C)]
struct CMoralAction {
    truthful:         c_int,
    harmful:          c_int,
    exploitative:     c_int,
    requires_consent: c_int,
    has_consent:      c_int,
    witnessed:        c_int,
    cited:            c_int,
}

#[repr(C)]
struct CVerdictRaw {
    tag:     CVerdictTag,
    payload: [c_char; 256],
}

extern "C" {
    fn sj_lawful(a: CMoralAction) -> c_int;
    fn sj_judge(a: CMoralAction) -> CMoralVerdict;
    fn sj_requires_human_gate(task_type: *const c_char) -> c_int;
    fn sj_gate(
        a:         CMoralAction,
        task_type: *const c_char,
        policy_id: *const c_char,
    ) -> CVerdictRaw;
    fn sj_version() -> *const c_char;
}

// ── Safe Rust types ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum VerdictTag {
    Approve,
    Defer,
    Reject,
    HumanRequired,
    Escalate,
}

impl VerdictTag {
    pub fn priority(&self) -> u8 {
        match self {
            VerdictTag::Escalate       => 4,
            VerdictTag::HumanRequired  => 3,
            VerdictTag::Reject         => 2,
            VerdictTag::Defer          => 1,
            VerdictTag::Approve        => 0,
        }
    }

    /// "EVIDENCE" if the agent can proceed; "SILENCE" if blocked.
    pub fn verdict_word(&self) -> &'static str {
        match self {
            VerdictTag::Approve => "EVIDENCE",
            _                   => "SILENCE",
        }
    }
}

#[derive(Debug, Clone)]
pub struct SovereignVerdict {
    pub tag:     VerdictTag,
    pub payload: String,
}

impl SovereignVerdict {
    pub fn is_approved(&self) -> bool {
        self.tag == VerdictTag::Approve
    }

    pub fn word(&self) -> &'static str {
        self.tag.verdict_word()
    }
}

// ── Conversion helpers ──────────────────────────────────────────────────────

fn to_c_action(
    truthful:         bool,
    harmful:          bool,
    exploitative:     bool,
    requires_consent: bool,
    has_consent:      bool,
    witnessed:        bool,
    cited:            bool,
) -> CMoralAction {
    CMoralAction {
        truthful:         truthful         as c_int,
        harmful:          harmful          as c_int,
        exploitative:     exploitative     as c_int,
        requires_consent: requires_consent as c_int,
        has_consent:      has_consent      as c_int,
        witnessed:        witnessed        as c_int,
        cited:            cited            as c_int,
    }
}

fn convert_verdict(raw: CVerdictRaw) -> SovereignVerdict {
    let payload = unsafe {
        CStr::from_ptr(raw.payload.as_ptr())
            .to_string_lossy()
            .into_owned()
    };
    let tag = match raw.tag {
        CVerdictTag::Approve       => VerdictTag::Approve,
        CVerdictTag::Defer         => VerdictTag::Defer,
        CVerdictTag::Reject        => VerdictTag::Reject,
        CVerdictTag::HumanRequired => VerdictTag::HumanRequired,
        CVerdictTag::Escalate      => VerdictTag::Escalate,
    };
    SovereignVerdict { tag, payload }
}

// ── Public API ──────────────────────────────────────────────────────────────

/// Full sovereign gate — the primary call site in magmad.
///
/// Checks: (1) moral lawfulness of the action, (2) whether task_type
/// requires a human sign-off. Returns EVIDENCE if the agent may proceed,
/// SILENCE otherwise.
///
/// Pipeline (Coq-certified):
///   judge(action) → moral_to_verdict → human_gate check → SovereignVerdict
pub fn gate(
    truthful:         bool,
    harmful:          bool,
    exploitative:     bool,
    requires_consent: bool,
    has_consent:      bool,
    witnessed:        bool,
    cited:            bool,
    task_type:        &str,
    policy_id:        &str,
) -> SovereignVerdict {
    let a   = to_c_action(truthful, harmful, exploitative,
                          requires_consent, has_consent, witnessed, cited);
    let tt  = CString::new(task_type).unwrap_or_default();
    let pid = CString::new(policy_id).unwrap_or_default();

    let raw = unsafe { sj_gate(a, tt.as_ptr(), pid.as_ptr()) };
    convert_verdict(raw)
}

/// Check if a task type requires human sign-off (Theorem T14/T15).
pub fn requires_human_gate(task_type: &str) -> bool {
    let tt = CString::new(task_type).unwrap_or_default();
    unsafe { sj_requires_human_gate(tt.as_ptr()) != 0 }
}

/// Returns the libsovereign version string.
pub fn version() -> String {
    unsafe { CStr::from_ptr(sj_version()).to_string_lossy().into_owned() }
}

// ── Convenience: default lawful action (witnessed, cited, truthful) ─────────

pub fn gate_default_lawful(task_type: &str, policy_id: &str) -> SovereignVerdict {
    gate(true, false, false, false, false, true, true, task_type, policy_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lawful_action_is_evidence() {
        // T1: approved_is_lawful — truthful, witnessed, cited, no harm
        let v = gate(true, false, false, false, false, true, true,
                     "read_file", "SOV-TEST");
        assert!(v.is_approved(), "lawful action should be EVIDENCE");
    }

    #[test]
    fn harmful_action_is_silence() {
        // T9: harmful_action_not_approved
        let v = gate(true, true, false, false, false, true, true,
                     "read_file", "SOV-TEST");
        assert!(!v.is_approved(), "harmful action must be SILENCE");
        assert_eq!(v.tag, VerdictTag::Escalate);
        assert_eq!(v.payload, "moral_arbiter");
    }

    #[test]
    fn dishonest_action_is_silence() {
        // T10: dishonest_action_not_approved
        let v = gate(false, false, false, false, false, true, true,
                     "read_file", "SOV-TEST");
        assert!(!v.is_approved());
    }

    #[test]
    fn deploy_mainnet_requires_human() {
        // T14: requires_human_gate "deploy_mainnet" = true
        assert!(requires_human_gate("deploy_mainnet"));
        // T15: requires_human_gate "read_file" = false
        assert!(!requires_human_gate("read_file"));
    }

    #[test]
    fn lawful_but_critical_task_needs_human() {
        // Even a perfectly lawful action on a critical task → human_required
        let v = gate(true, false, false, false, false, true, true,
                     "deploy_mainnet", "SOV-DEPLOY");
        assert_eq!(v.tag, VerdictTag::HumanRequired);
        assert!(!v.is_approved());
    }

    #[test]
    fn version_contains_certified() {
        let v = version();
        assert!(v.contains("Coq-certified"), "version string must reference Coq proof");
    }
}
