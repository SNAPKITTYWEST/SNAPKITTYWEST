use snapkitty_core::shell::executor::{guarded_execute, ExecutionRequest, ShellCommand};
use snapkitty_core::shell::lean_bridge::{LeanBridge, LeanKernelState, LeanExecutionRequest};

fn main() {
    let state = LeanKernelState {
        permissions: vec!["read".into(), "write".into(), "execute".into()],
        sandbox: "default".into(),
        cpu_limit_ms: 10000,
        network_locked: false,
    };

    let bridge = LeanBridge::new(state);

    let req = LeanExecutionRequest {
        shell_cmd: "echo".into(),
        shell_args: vec!["SnapKitty verified gate operational".into()],
        mcp_tool: None,
        uses_network: false,
    };

    let result = bridge.verify(&req);

    if result.valid {
        println!("Gate passed — execution allowed");
        let exec_req = ExecutionRequest {
            shell: ShellCommand {
                cmd: "echo".into(),
                args: vec!["SnapKitty verified gate operational".into()],
            },
            mcp_tool: None,
            uses_network: false,
        };
        match guarded_execute(true, &exec_req) {
            Some(output) => {
                println!("exit_code: {:?}", output.exit_code);
                println!("duration: {}ms", output.duration_ms);
                if !output.stdout.is_empty() {
                    println!("stdout: {}", output.stdout.trim());
                }
            }
            None => eprintln!("Execution blocked"),
        }
    } else {
        eprintln!("Gate denied: {:?}", result.reason);
        for check in &result.checks {
            if !check.passed {
                eprintln!("  ✗ {}: {}", check.name, check.message);
            }
        }
    }
}
