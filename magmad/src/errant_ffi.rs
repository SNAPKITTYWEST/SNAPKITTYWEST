// errant_ffi.rs — Rust FFI bindings to liberrant.a
//
// Safe Rust wrappers around the C linear type checker.
// The unsafe blocks are contained here; callers use ErrantResult directly.
//
// liberrant is compiled by build.rs from errant/runtime/errant.c.
// Zero external dependencies in C (SHA-256 inline, no openssl).

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};

// ── Raw C layout (must match errant.h exactly) ─────────────────────────────

const ERROR_MAX:  usize = 512;
const HASH_HEX:   usize = 65;
const OUTPUT_MAX: usize = 4096;

#[repr(C)]
struct CEResult {
    ok:           bool,
    fallback:     bool,
    error:        [c_char; ERROR_MAX],
    worm_hash:    [c_char; HASH_HEX],
    output:       [c_char; OUTPUT_MAX],
    steps:        c_int,
    ruptures:     c_int,
    lin_consumed: c_int,
    lin_leaked:   c_int,
}

extern "C" {
    fn errant_verify_named(op_names: *const *const c_char, count: c_int) -> CEResult;
    fn errant_sha256_hex(data: *const u8, len: usize, hex_out: *mut c_char);
    fn errant_version() -> *const c_char;
}

// ── Safe Rust result ───────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct ErrantResult {
    pub ok:           bool,
    pub fallback:     bool,
    pub error:        String,
    pub worm_hash:    String,
    pub output:       String,
    pub steps:        i32,
    pub ruptures:     i32,
    pub lin_consumed: i32,
    pub lin_leaked:   i32,
}

impl ErrantResult {
    pub fn verdict(&self) -> &'static str {
        if self.ok { "EVIDENCE" } else { "SILENCE" }
    }
}

fn c_str_to_string(buf: &[c_char]) -> String {
    unsafe {
        CStr::from_ptr(buf.as_ptr())
            .to_string_lossy()
            .into_owned()
    }
}

fn convert(raw: CEResult) -> ErrantResult {
    ErrantResult {
        ok:           raw.ok,
        fallback:     raw.fallback,
        error:        c_str_to_string(&raw.error),
        worm_hash:    c_str_to_string(&raw.worm_hash),
        output:       c_str_to_string(&raw.output),
        steps:        raw.steps,
        ruptures:     raw.ruptures,
        lin_consumed: raw.lin_consumed,
        lin_leaked:   raw.lin_leaked,
    }
}

// ── Public API ─────────────────────────────────────────────────────────────

/// Verify a sequence of ERRANT opcode names.
/// Input: &["PUSH_LIN", "HASH", "SEAL"] — same format bridge.mjs sends.
/// Returns: ErrantResult with EVIDENCE/SILENCE + WORM hash.
pub fn verify_named(ops: &[&str]) -> ErrantResult {
    // Build null-terminated C strings
    let c_strings: Vec<CString> = ops
        .iter()
        .map(|s| CString::new(*s).unwrap_or_default())
        .collect();
    let c_ptrs: Vec<*const c_char> = c_strings.iter().map(|s| s.as_ptr()).collect();

    let raw = unsafe {
        errant_verify_named(c_ptrs.as_ptr(), c_ptrs.len() as c_int)
    };
    convert(raw)
}

/// Verify from a whitespace-separated opcode string.
/// Convenience wrapper: "PUSH_LIN HASH SEAL" → same as verify_named.
pub fn verify_source(source: &str) -> ErrantResult {
    let ops: Vec<&str> = source.split_whitespace().collect();
    verify_named(&ops)
}

/// Compute SHA-256 hex of arbitrary bytes.
/// Returns lowercase 64-char hex string.
pub fn sha256_hex(data: &[u8]) -> String {
    let mut buf = [0i8; HASH_HEX];
    unsafe {
        errant_sha256_hex(data.as_ptr(), data.len(), buf.as_mut_ptr());
    }
    c_str_to_string(&buf)
}

/// Returns the liberrant version string.
pub fn version() -> String {
    unsafe { CStr::from_ptr(errant_version()).to_string_lossy().into_owned() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sha256_empty_fips_vector() {
        let h = sha256_hex(b"");
        assert_eq!(h, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    }

    #[test]
    fn metamine_omega_path_evidence() {
        let r = verify_named(&["ORIGIN", "SEED", "RUPTURE", "ECHO", "SEAL"]);
        assert!(r.ok, "METAMINE path should be EVIDENCE, got: {}", r.error);
        assert!(!r.worm_hash.is_empty());
    }

    #[test]
    fn dup_on_lin_is_silence() {
        let r = verify_named(&["PUSH_LIN", "DUP_UN", "SEAL"]);
        assert!(!r.ok, "DUP_UN on lin must be SILENCE");
    }

    #[test]
    fn lin_leaked_at_halt_is_silence() {
        let r = verify_named(&["PUSH_LIN", "MOVE", "HALT"]);
        assert!(!r.ok, "Unconsumed lin at HALT must be SILENCE");
    }

    #[test]
    fn forge_chain_evidence() {
        let r = verify_named(&["SEED", "SEED", "FORGE", "SEAL"]);
        assert!(r.ok, "FORGE chain should be EVIDENCE");
    }
}
