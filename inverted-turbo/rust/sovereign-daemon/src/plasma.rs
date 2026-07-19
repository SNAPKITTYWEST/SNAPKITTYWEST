/// Rust mirror of plasma_gate.asm — same 5 checks, same return codes.
/// Calling convention matches the x86-64 SysV export in sovereign-transformer.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlasmaResult {
    Pass,
    FailNullId,
    FailNullSha,
    FailBadSplit,
    FailZeroWeight,
    FailWeightOverflow,
}

impl PlasmaResult {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Pass               => "PLASMA_PASS",
            Self::FailNullId         => "FAIL_NULL_ID",
            Self::FailNullSha        => "FAIL_NULL_SHA",
            Self::FailBadSplit       => "FAIL_BAD_SPLIT",
            Self::FailZeroWeight     => "FAIL_ZERO_WEIGHT",
            Self::FailWeightOverflow => "FAIL_WEIGHT_OVERFLOW",
        }
    }
}

/// CHECK 1: id non-null/non-empty
/// CHECK 2: sha256 non-null/non-empty
/// CHECK 3: split_tag in 0..=3
/// CHECK 4: weight > 0.0
/// CHECK 5: weight <= 1.0
pub fn plasma_gate(id: &str, sha256: &str, split_tag: u32, weight: f64) -> PlasmaResult {
    if id.is_empty()     { return PlasmaResult::FailNullId; }
    if sha256.is_empty() { return PlasmaResult::FailNullSha; }
    if split_tag > 3     { return PlasmaResult::FailBadSplit; }
    if weight <= 0.0     { return PlasmaResult::FailZeroWeight; }
    if weight > 1.0      { return PlasmaResult::FailWeightOverflow; }
    PlasmaResult::Pass
}
