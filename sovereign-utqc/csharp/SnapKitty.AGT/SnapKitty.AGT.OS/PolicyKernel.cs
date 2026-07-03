// SnapKitty.AGT.OS — Stateless Policy Kernel
// Non-recursive. WORM-sealed. Policy before action.

namespace SnapKitty.AGT.OS;

/// <summary>
/// Policy definition.
/// </summary>
public record Policy
{
    public string Name { get; init; } = "";
    public HashSet<string> BlockedActions { get; init; } = new();
    public HashSet<string> AllowedActions { get; init; } = new();
    public Dictionary<string, object> Metadata { get; init; } = new();
}

/// <summary>
/// Execution context for policy evaluation.
/// </summary>
public record ExecutionContext
{
    public string AgentID { get; init; } = "";
    public string Action { get; init; } = "";
    public List<string> Policies { get; init; } = new();
    public Dictionary<string, object> Args { get; init; } = new();
}

/// <summary>
/// Result of policy execution.
/// </summary>
public record ExecutionResult
{
    public bool Success { get; init; }
    public string Action { get; init; } = "";
    public string? Error { get; init; }
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    public static ExecutionResult SuccessResult(string action) => new() { Success = true, Action = action };
    public static ExecutionResult Blocked(string reason) => new() { Success = false, Error = reason };
}

/// <summary>
/// Stateless policy kernel. No hidden state. No recursion.
/// </summary>
public sealed class StatelessKernel
{
    private readonly IReadOnlyDictionary<string, Policy> _policies;

    public StatelessKernel(IReadOnlyDictionary<string, Policy> policies)
    {
        _policies = policies;
    }

    /// <summary>
    /// Execute an action through the policy kernel.
    /// </summary>
    public Task<ExecutionResult> ExecuteAsync(
        string action,
        Dictionary<string, object> args,
        ExecutionContext context)
    {
        foreach (var policyName in context.Policies)
        {
            if (_policies.TryGetValue(policyName, out var policy) &&
                policy.BlockedActions.Contains(action))
            {
                return Task.FromResult(ExecutionResult.Blocked(
                    $"Action blocked by policy: {action}"));
            }
        }

        return Task.FromResult(ExecutionResult.SuccessResult(action));
    }
}
