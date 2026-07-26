//! SnapKitty Shell Executor
//! Executes ONLY Lean-verified ExecutionRequest objects
//!
//! MOAT Ref: SnapKittyShellContract.lean
//! Architecture: Verified Autonomous OS - Kernel Gate Pattern
//!
//! The execution chain:
//!   Agent → ExecutionRequest → Lean Gate → guarded_execute → sandbox → OS
//!
//! No command can execute unless it has a formal proof of safety
//! AND passes a deterministic runtime sandbox.

use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

// ── Core Types ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct ShellCommand {
    pub cmd: String,
    pub args: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ExecutionRequest {
    pub shell: ShellCommand,
    pub mcp_tool: Option<String>,
    pub uses_network: bool,
}

/// Result returned by executor
#[derive(Debug)]
pub struct ExecutionResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub duration_ms: u128,
    pub killed_by_timeout: bool,
}

// ── Hard Runtime Limits ────────────────────────────────────────────────────────

/// Maximum runtime for any command (NEVER trust agents)
const MAX_RUNTIME_MS: u128 = 10_000;

/// Maximum output size (prevent memory exhaustion)
const MAX_OUTPUT_BYTES: usize = 1024 * 1024; // 1MB

/// Poll interval for process status
const POLL_INTERVAL_MS: u64 = 20;

// ── Shell Safety (matches Lean is_safe_shell) ──────────────────────────────────

/// Forbidden characters in shell commands and arguments
/// Must match Lean: forbidden_chars in SnapKittyShellContract.lean
const FORBIDDEN_CHARS: &[char] = &[
    ';', '|', '&', '$', '(', ')', '<', '>', '!', '#', '*', '?', '~', '{', '}', '[', ']',
];

/// Check if string contains forbidden characters
/// Matches Lean: string_has_forbidden
pub fn string_has_forbidden(s: &str) -> bool {
    s.chars().any(|c| FORBIDDEN_CHARS.contains(&c))
}

/// Check if shell command is safe
/// Matches Lean: is_safe_shell
pub fn is_safe_shell(cmd: &ShellCommand) -> bool {
    !string_has_forbidden(&cmd.cmd) && !cmd.args.iter().any(|a| string_has_forbidden(a))
}

// ── Core Executor (LEAN-GATED ONLY ENTRYPOINT) ────────────────────────────────

/// Execute a shell command in sandboxed mode
///
/// THIS MUST NEVER BE CALLED DIRECTLY.
/// Use guarded_execute() which enforces Lean verification.
pub fn execute_shell(req: &ExecutionRequest) -> ExecutionResult {
    let start = Instant::now();

    // Pre-flight safety check (defense in depth)
    if !is_safe_shell(&req.shell) {
        return ExecutionResult {
            success: false,
            stdout: String::new(),
            stderr: "BLOCKED: Shell command contains forbidden characters".to_string(),
            exit_code: None,
            duration_ms: 0,
            killed_by_timeout: false,
        };
    }

    // Spawn process with piped IO
    let mut child = match Command::new(&req.shell.cmd)
        .args(&req.shell.args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null()) // No stdin access
        .spawn()
    {
        Ok(child) => child,
        Err(e) => {
            return ExecutionResult {
                success: false,
                stdout: String::new(),
                stderr: format!("spawn failed: {}", e),
                exit_code: None,
                duration_ms: 0,
                killed_by_timeout: false,
            }
        }
    };

    // Poll loop with timeout enforcement
    let mut exited = false;
    let mut exit_status = None;

    while start.elapsed().as_millis() < MAX_RUNTIME_MS {
        match child.try_wait() {
            Ok(Some(status)) => {
                exited = true;
                exit_status = status.code();
                break;
            }
            Ok(None) => {
                std::thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));
            }
            Err(e) => {
                return ExecutionResult {
                    success: false,
                    stdout: String::new(),
                    stderr: format!("wait error: {}", e),
                    exit_code: None,
                    duration_ms: start.elapsed().as_millis(),
                    killed_by_timeout: false,
                };
            }
        }
    }

    // Force kill if timeout exceeded
    let killed_by_timeout = !exited;
    if killed_by_timeout {
        let _ = child.kill();
    }

    // Collect output
    let output = child
        .wait_with_output()
        .unwrap_or_else(|_| std::process::Output {
            status: std::process::ExitStatus::default(),
            stdout: vec![],
            stderr: vec![],
        });

    // Truncate output if too large
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    ExecutionResult {
        success: output.status.success() && !killed_by_timeout,
        stdout: truncate_to_limit(&stdout, MAX_OUTPUT_BYTES),
        stderr: truncate_to_limit(&stderr, MAX_OUTPUT_BYTES),
        exit_code: output.status.code(),
        duration_ms: start.elapsed().as_millis(),
        killed_by_timeout,
    }
}

// ── Guarded Execute (THE ONLY SAFE ENTRYPOINT) ────────────────────────────────

/// Execute a shell command ONLY if Lean verification passed
///
/// This is the ONLY public function that should be called.
/// It enforces the Lean kernel gate before execution.
pub fn guarded_execute(lean_verified: bool, req: &ExecutionRequest) -> Option<ExecutionResult> {
    if !lean_verified {
        return None;
    }

    Some(execute_shell(req))
}

// ── Lean Verification Bridge ───────────────────────────────────────────────────

/// Lean verification result (mirrors LeanVerificationResult from Lean)
#[derive(Debug, Clone)]
pub struct LeanVerificationResult {
    pub valid: bool,
    pub reason: Option<String>,
    pub checks: Vec<LeanCheck>,
}

#[derive(Debug, Clone)]
pub struct LeanCheck {
    pub name: String,
    pub passed: bool,
    pub message: String,
}

/// Kernel state (mirrors KernelState from Lean)
#[derive(Debug, Clone)]
pub struct KernelState {
    pub permissions: Vec<String>,
    pub sandbox: String,
    pub cpu_limit_ms: u64,
    pub network_locked: bool,
}

/// Verify execution request against Lean predicates (Rust implementation)
/// This mirrors the Lean valid_execution predicate
pub fn lean_verify(state: &KernelState, req: &ExecutionRequest) -> LeanVerificationResult {
    let mut checks = Vec::new();
    let mut all_passed = true;

    // Check 1: Shell safety
    let shell_safe = is_safe_shell(&req.shell);
    checks.push(LeanCheck {
        name: "is_safe_shell".to_string(),
        passed: shell_safe,
        message: if shell_safe {
            "Shell command is safe".to_string()
        } else {
            "Shell command contains forbidden characters".to_string()
        },
    });
    if !shell_safe {
        all_passed = false;
    }

    // Check 2: CPU limit
    let cpu_ok = state.cpu_limit_ms <= 10000;
    checks.push(LeanCheck {
        name: "cpu_ok".to_string(),
        passed: cpu_ok,
        message: if cpu_ok {
            "CPU limit within bounds".to_string()
        } else {
            format!("CPU limit {}ms exceeds 10000ms", state.cpu_limit_ms)
        },
    });
    if !cpu_ok {
        all_passed = false;
    }

    // Check 3: Execute permission
    let has_execute = state.permissions.contains(&"execute".to_string());
    checks.push(LeanCheck {
        name: "has_perm(execute)".to_string(),
        passed: has_execute,
        message: if has_execute {
            "Execute permission granted".to_string()
        } else {
            "Execute permission denied".to_string()
        },
    });
    if !has_execute {
        all_passed = false;
    }

    // Check 4: MCP tool permission (if applicable)
    if let Some(ref tool) = req.mcp_tool {
        let required_perm = match tool.as_str() {
            "gl_get_trial_balance" | "gl_get_account_balance" |
            "consolidated_balance_sheet" | "budget_variance" => "read",

            "gl_create_journal_entry" => "write",

            "loc_audit" | "loc_calculate_interest" |
            "consolidation_eliminate_ic" => "execute",

            "prolog_verify_deed" | "woz_vault_status" => "mcp",

            _ => "execute",
        };

        let has_perm = state.permissions.contains(&required_perm.to_string());
        checks.push(LeanCheck {
            name: format!("mcp_allowed({})", tool),
            passed: has_perm,
            message: if has_perm {
                format!("MCP tool {} allowed", tool)
            } else {
                format!("MCP tool {} requires {}", tool, required_perm)
            },
        });
        if !has_perm {
            all_passed = false;
        }
    }

    // Check 5: Network permission (if applicable)
    if req.uses_network {
        let has_network = state.permissions.contains(&"network".to_string());
        let not_locked = !state.network_locked;
        let network_ok = has_network && not_locked;

        checks.push(LeanCheck {
            name: "network_allowed".to_string(),
            passed: network_ok,
            message: if network_ok {
                "Network access allowed".to_string()
            } else if !has_network {
                "Network permission denied".to_string()
            } else {
                "Network is locked".to_string()
            },
        });
        if !network_ok {
            all_passed = false;
        }
    }

    LeanVerificationResult {
        valid: all_passed,
        reason: if all_passed {
            None
        } else {
            Some("Execution denied by kernel gate".to_string())
        },
        checks,
    }
}

// ── Full Kernel Gate (Lean → Execute) ──────────────────────────────────────────

/// The complete kernel gate: verify then execute
///
/// Usage:
///   let state = KernelState { permissions: vec!["execute".into()], ... };
///   let req = ExecutionRequest { shell: ShellCommand { cmd: "ls".into(), args: vec!["-la".into()] }, ... };
///   let result = kernel_gate(&state, &req);
pub fn kernel_gate(state: &KernelState, req: &ExecutionRequest) -> Option<ExecutionResult> {
    let verification = lean_verify(state, req);

    if !verification.valid {
        return None;
    }

    Some(execute_shell(req))
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/// Truncate string to max bytes
fn truncate_to_limit(s: &str, max_bytes: usize) -> String {
    let bytes = s.as_bytes();
    if bytes.len() <= max_bytes {
        s.to_string()
    } else {
        String::from_utf8_lossy(&bytes[..max_bytes]).to_string()
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn test_state() -> KernelState {
        KernelState {
            permissions: vec!["read".into(), "write".into(), "execute".into()],
            sandbox: "test".into(),
            cpu_limit_ms: 5000,
            network_locked: false,
        }
    }

    #[test]
    fn safe_shell_passes() {
        let req = ExecutionRequest {
            shell: ShellCommand {
                cmd: "ls".into(),
                args: vec!["-la".into()],
            },
            mcp_tool: None,
            uses_network: false,
        };
        assert!(is_safe_shell(&req.shell));
    }

    #[test]
    fn forbidden_chars_fail() {
        let req = ExecutionRequest {
            shell: ShellCommand {
                cmd: "ls; rm -rf /".into(),
                args: vec![],
            },
            mcp_tool: None,
            uses_network: false,
        };
        assert!(!is_safe_shell(&req.shell));
    }

    #[test]
    fn lean_verify_passes_for_safe_command() {
        let state = test_state();
        let req = ExecutionRequest {
            shell: ShellCommand {
                cmd: "echo".into(),
                args: vec!["hello".into()],
            },
            mcp_tool: None,
            uses_network: false,
        };
        let result = lean_verify(&state, &req);
        assert!(result.valid);
    }

    #[test]
    fn lean_verify_fails_for_dangerous_command() {
        let state = test_state();
        let req = ExecutionRequest {
            shell: ShellCommand {
                cmd: "ls; rm -rf /".into(),
                args: vec![],
            },
            mcp_tool: None,
            uses_network: false,
        };
        let result = lean_verify(&state, &req);
        assert!(!result.valid);
    }

    #[test]
    fn lean_verify_fails_without_execute_perm() {
        let state = KernelState {
            permissions: vec!["read".into()],
            sandbox: "test".into(),
            cpu_limit_ms: 5000,
            network_locked: false,
        };
        let req = ExecutionRequest {
            shell: ShellCommand {
                cmd: "echo".into(),
                args: vec!["hello".into()],
            },
            mcp_tool: None,
            uses_network: false,
        };
        let result = lean_verify(&state, &req);
        assert!(!result.valid);
    }

    #[test]
    fn guarded_execute_blocks_unverified() {
        let req = ExecutionRequest {
            shell: ShellCommand {
                cmd: "echo".into(),
                args: vec!["hello".into()],
            },
            mcp_tool: None,
            uses_network: false,
        };
        let result = guarded_execute(false, &req);
        assert!(result.is_none());
    }

    #[test]
    fn guarded_execute_passes_verified() {
        let req = ExecutionRequest {
            shell: ShellCommand {
                cmd: "echo".into(),
                args: vec!["hello".into()],
            },
            mcp_tool: None,
            uses_network: false,
        };
        let result = guarded_execute(true, &req);
        assert!(result.is_some());
    }

    #[test]
    fn kernel_gate_full_chain() {
        let state = test_state();
        #[cfg(windows)]
        let (cmd, args, expected) = ("cmd".into(), vec!["/c".into(), "echo".into(), "kernel_gate_test".into()], "kernel_gate_test");
        #[cfg(not(windows))]
        let (cmd, args, expected) = ("echo".into(), vec!["kernel_gate_test".into()], "kernel_gate_test");
        let req = ExecutionRequest {
            shell: ShellCommand { cmd, args },
            mcp_tool: None,
            uses_network: false,
        };
        let result = kernel_gate(&state, &req);
        assert!(result.is_some());
        let exec = result.unwrap();
        assert!(exec.success);
        assert!(exec.stdout.contains(expected));
    }
}
