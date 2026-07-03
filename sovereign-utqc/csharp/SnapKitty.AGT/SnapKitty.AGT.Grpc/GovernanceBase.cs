// SnapKitty.AGT.Grpc — Governance Base Class (No protobuf needed)
// Non-recursive. WORM-sealed. Every governance action is recorded.

using Grpc.Core;

namespace SnapKitty.AGT.Grpc;

public abstract class GovernanceBase
{
    public abstract Task<RegisterResponse> Register(RegisterRequest request, ServerCallContext context);
    public abstract Task<AttestResponse> Attest(AttestRequest request, ServerCallContext context);
    public abstract Task<DiscoverResponse> Discover(DiscoverRequest request, ServerCallContext context);
    public abstract Task<ApproveResponse> Approve(ApproveRequest request, ServerCallContext context);
    public abstract Task<RevokeResponse> Revoke(RevokeRequest request, ServerCallContext context);
}
