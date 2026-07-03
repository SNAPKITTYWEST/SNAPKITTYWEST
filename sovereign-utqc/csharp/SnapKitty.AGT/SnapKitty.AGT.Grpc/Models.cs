// SnapKitty.AGT.Grpc — Governance Protobuf Models
// Non-recursive. WORM-sealed. Every governance action is recorded.

namespace SnapKitty.AGT.Grpc;

public record RegisterRequest
{
    public string Name { get; init; } = "";
    public IEnumerable<string> Capabilities { get; init; } = Array.Empty<string>();
}

public record RegisterResponse
{
    public string Did { get; init; } = "";
    public bool Success { get; init; }
}

public record AttestRequest
{
    public string Did { get; init; } = "";
}

public record AttestResponse
{
    public bool Verified { get; init; }
    public string Message { get; init; } = "";
}

public record DiscoverRequest
{
    public string Query { get; init; } = "";
}

public record DiscoverResponse
{
    public IEnumerable<AgentInfo> Agents { get; init; } = Array.Empty<AgentInfo>();
}

public record AgentInfo
{
    public string Did { get; init; } = "";
    public string Name { get; init; } = "";
    public IEnumerable<string> Capabilities { get; init; } = Array.Empty<string>();
}

public record ApproveRequest
{
    public string Did { get; init; } = "";
    public IEnumerable<string> Policies { get; init; } = Array.Empty<string>();
}

public record ApproveResponse
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";
}

public record RevokeRequest
{
    public string Did { get; init; } = "";
    public IEnumerable<string> Policies { get; init; } = Array.Empty<string>();
}

public record RevokeResponse
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";
}

public record ExecutionContext
{
    public string AgentID { get; init; } = "";
    public string Action { get; init; } = "";
    public IEnumerable<string> Policies { get; init; } = Array.Empty<string>();
}

public record ExecutionResult
{
    public bool Success { get; init; }
    public string? Error { get; init; }
}
