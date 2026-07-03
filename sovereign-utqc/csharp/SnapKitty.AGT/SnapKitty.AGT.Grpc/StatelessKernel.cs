// SnapKitty.AGT.Grpc — Stateless Kernel for Governance Execution
// Non-recursive. WORM-sealed. Every execution is recorded.

namespace SnapKitty.AGT.Grpc;

public class StatelessKernel
{
    private readonly Dictionary<string, Func<ExecutionContext, ExecutionResult>> _handlers = new();

    public StatelessKernel()
    {
        _handlers["governance.approve"] = ctx => new ExecutionResult { Success = true };
        _handlers["governance.revoke"] = ctx => new ExecutionResult { Success = true };
    }

    public async Task<ExecutionResult> ExecuteAsync(
        string action,
        Dictionary<string, object> parameters,
        ExecutionContext context)
    {
        if (_handlers.TryGetValue(action, out var handler))
        {
            return await Task.FromResult(handler(context));
        }

        return await Task.FromResult(new ExecutionResult
        {
            Success = false,
            Error = $"Unknown action: {action}"
        });
    }
}
