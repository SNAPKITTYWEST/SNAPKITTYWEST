use snapkitty_core::shell::executor::{ExecutionRequest, ShellCommand, guarded_execute};
use snapkitty_core::shell::lean_bridge::{LeanBridge, LeanKernelState, LeanExecutionRequest};
use std::io::{self, BufRead, Write};

/// Lean gate bridge server — reads JSON from stdin, writes result to stdout
///
/// Protocol:
///   Request:  {"shell_cmd":"echo","shell_args":["hello"],"mcp_tool":null,"uses_network":false}
///   Response: {"valid":true,"reason":null,"checks":[...],"executed":true,"stdout":"hello\n"}
///
/// Usage:
///   echo '{"shell_cmd":"echo","shell_args":["hello"]}' | snapkitty-bridge

fn main() {
    let state = LeanKernelState {
        permissions: vec![
            "read".into(), "write".into(), "execute".into(),
            "mcp".into(), "network".into(),
        ],
        sandbox: "standard".into(),
        cpu_limit_ms: 10000,
        network_locked: false,
    };

    let bridge = LeanBridge::new(state);
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        let line = line.trim().to_string();
        if line.is_empty() {
            continue;
        }

        let response = match serde_json::from_str::<LeanExecutionRequest>(&line) {
            Ok(req) => {
                let verification = bridge.verify(&req);

                if verification.valid {
                    // Execute
                    let exec_req = ExecutionRequest {
                        shell: ShellCommand {
                            cmd: req.shell_cmd,
                            args: req.shell_args,
                        },
                        mcp_tool: req.mcp_tool,
                        uses_network: req.uses_network,
                    };

                    match guarded_execute(true, &exec_req) {
                        Some(result) => serde_json::json!({
                            "valid": true,
                            "reason": null,
                            "checks": verification.checks.iter().map(|c| {
                                serde_json::json!({
                                    "name": c.name,
                                    "passed": c.passed,
                                    "message": c.message,
                                })
                            }).collect::<Vec<_>>(),
                            "executed": true,
                            "success": result.success,
                            "stdout": result.stdout,
                            "stderr": result.stderr,
                            "exit_code": result.exit_code,
                            "duration_ms": result.duration_ms,
                        }),
                        None => serde_json::json!({
                            "valid": false,
                            "reason": "guarded_execute blocked",
                            "checks": [],
                            "executed": false,
                        }),
                    }
                } else {
                    serde_json::json!({
                        "valid": false,
                        "reason": verification.reason,
                        "checks": verification.checks.iter().map(|c| {
                            serde_json::json!({
                                "name": c.name,
                                "passed": c.passed,
                                "message": c.message,
                            })
                        }).collect::<Vec<_>>(),
                        "executed": false,
                    })
                }
            }
            Err(e) => serde_json::json!({
                "valid": false,
                "reason": format!("parse error: {}", e),
                "checks": [],
                "executed": false,
            }),
        };

        writeln!(stdout, "{}", response).unwrap();
        stdout.flush().unwrap();
    }
}
