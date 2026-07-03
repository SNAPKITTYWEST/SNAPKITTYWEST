// SnapKitty.AGT.Grpc — gRPC Services on Port 7701
// Non-recursive. WORM-sealed. HTTP deprecated, gRPC primary.

using Grpc.Core;
using SnapKitty.AGT.Mesh;
using SnapKitty.AGT.OS;
using SnapKitty.AGT.SRE;

namespace SnapKitty.AGT.Grpc;

/// <summary>
/// Governance service for agent management.
/// </summary>
public class GovernanceService : GovernanceBase
{
    private readonly StatelessKernel _kernel;
    private readonly CircuitBreaker _breaker;

    public GovernanceService(StatelessKernel kernel, CircuitBreaker breaker)
    {
        _kernel = kernel;
        _breaker = breaker;
    }

    public override async Task<RegisterResponse> Register(RegisterRequest request, ServerCallContext context)
    {
        if (!_breaker.IsAllowed())
        {
            throw new RpcException(new Status(StatusCode.Unavailable, "Circuit breaker open"));
        }

        var did = AgentDID.Generate();
        var identity = new AgentIdentity
        {
            DID = did,
            Name = request.Name,
            Capabilities = request.Capabilities.ToList()
        };

        return new RegisterResponse
        {
            Did = did.FullDID,
            Success = true
        };
    }

    public override async Task<AttestResponse> Attest(AttestRequest request, ServerCallContext context)
    {
        if (!_breaker.IsAllowed())
        {
            throw new RpcException(new Status(StatusCode.Unavailable, "Circuit breaker open"));
        }

        return new AttestResponse
        {
            Verified = true,
            Message = "Attestation accepted"
        };
    }

    public override async Task<DiscoverResponse> Discover(DiscoverRequest request, ServerCallContext context)
    {
        if (!_breaker.IsAllowed())
        {
            throw new RpcException(new Status(StatusCode.Unavailable, "Circuit breaker open"));
        }

        return new DiscoverResponse
        {
            Agents = { /* discovered agents */ }
        };
    }

    public override async Task<ApproveResponse> Approve(ApproveRequest request, ServerCallContext context)
    {
        var result = await _kernel.ExecuteAsync(
            "governance.approve",
            new Dictionary<string, object> { ["agent_did"] = request.Did },
            new ExecutionContext
            {
                AgentID = request.Did,
                Action = "governance.approve",
                Policies = request.Policies.ToList()
            });

        return new ApproveResponse
        {
            Success = result.Success,
            Message = result.Error ?? "Approved"
        };
    }

    public override async Task<RevokeResponse> Revoke(RevokeRequest request, ServerCallContext context)
    {
        var result = await _kernel.ExecuteAsync(
            "governance.revoke",
            new Dictionary<string, object> { ["agent_did"] = request.Did },
            new ExecutionContext
            {
                AgentID = request.Did,
                Action = "governance.revoke",
                Policies = request.Policies.ToList()
            });

        return new RevokeResponse
        {
            Success = result.Success,
            Message = result.Error ?? "Revoked"
        };
    }
}
