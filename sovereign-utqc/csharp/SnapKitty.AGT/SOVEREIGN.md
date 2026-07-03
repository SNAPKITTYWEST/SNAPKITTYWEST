# SOVEREIGN.md — SnapKitty AGT Covenant

## Agent Governance Toolkit

**SNAPKITTY-AGT-CSHARP-001**

This solution implements operator-grade governance for the SnapKitty agent ecosystem.

## Core Thesis

```
C# governs.
gRPC routes.
WORM seals.
Agents obey policy before action.
```

## Architecture

```
C# = dashboard, receipts, governance UI, operator console
gRPC = communication (port 7701)
WORM = artifact sealing
```

## Projects

| Project | Description |
|---------|-------------|
| `SnapKitty.AGT.Mesh` | DID, identity, credentials, mTLS, namespaces |
| `SnapKitty.AGT.OS` | Stateless policy kernel |
| `SnapKitty.AGT.Runtime` | Lifecycle, privilege rings, saga orchestration |
| `SnapKitty.AGT.SRE` | Circuit breaker, chaos hooks, health |
| `SnapKitty.AGT.Compliance` | GDPR/HIPAA/SOX policy checks |
| `SnapKitty.AGT.Discovery` | Shadow-agent detection |
| `SnapKitty.AGT.Hypervisor` | Reversibility validation |
| `SnapKitty.AGT.McpGovernance` | MCP policy enforcement |
| `SnapKitty.AGT.Grpc` | gRPC services on 7701 |
| `SnapKitty.AGT.Cli` | dotnet CLI |

## Invariants

1. **Non-recursive**: All execution is staged, never recursive
2. **WORM-sealed**: Every governance decision emits a receipt
3. **Fail-closed**: Any error terminates processing
4. **Observable**: Every intermediate state is inspectable
5. **gRPC primary**: HTTP deprecated

## Rules

- `IGovernanceStage<TInput, TOutput>` — Governance pipeline stage
- `StatelessKernel` — Policy before action
- `CircuitBreaker` — Fault tolerance
- `PrivilegeRingEnforcer` — Ring-based access control
- `SagaOrchestrator` — Distributed transaction management
- `LifecycleManager` — Agent state machine

## Seal

```
SNAPKITTY-AGT-CSHARP-001
C# governs.
gRPC routes.
WORM seals.
Agents obey policy before action.
No recursion. No borrowed thesis.
```
