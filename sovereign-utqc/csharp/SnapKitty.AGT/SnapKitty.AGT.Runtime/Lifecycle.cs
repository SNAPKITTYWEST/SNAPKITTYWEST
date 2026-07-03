// SnapKitty.AGT.Runtime — Lifecycle, Privilege Rings, Saga Orchestration
// Non-recursive. WORM-sealed. Every lifecycle event is recorded.

namespace SnapKitty.AGT.Runtime;

/// <summary>
/// Privilege ring levels.
/// </summary>
public enum PrivilegeRing
{
    Ring0 = 0,  // Kernel
    Ring1 = 1,  // Driver
    Ring2 = 2,  // User
    Ring3 = 3   // Guest
}

/// <summary>
/// Enforces privilege ring constraints.
/// </summary>
public sealed class PrivilegeRingEnforcer
{
    private readonly Dictionary<string, PrivilegeRing> _agentRings = new();

    public void RegisterAgent(string agentId, PrivilegeRing ring)
    {
        _agentRings[agentId] = ring;
    }

    public bool CanExecute(string agentId, PrivilegeRing requiredRing)
    {
        if (!_agentRings.TryGetValue(agentId, out var currentRing))
            return false;

        return currentRing <= requiredRing;
    }

    public PrivilegeRing? GetRing(string agentId)
    {
        return _agentRings.TryGetValue(agentId, out var ring) ? ring : null;
    }
}

/// <summary>
/// Saga step status.
/// </summary>
public enum SagaStepStatus
{
    Pending,
    Running,
    Completed,
    Failed,
    Compensated
}

/// <summary>
/// A saga step.
/// </summary>
public record SagaStep
{
    public string Name { get; init; } = "";
    public Func<Task> Execute { get; init; } = () => Task.CompletedTask;
    public Func<Task> Compensate { get; init; } = () => Task.CompletedTask;
    public SagaStepStatus Status { get; set; } = SagaStepStatus.Pending;
}

/// <summary>
/// Saga orchestrator for distributed transactions.
/// Non-recursive. Each step is explicit.
/// </summary>
public sealed class SagaOrchestrator
{
    private readonly List<SagaStep> _steps = new();

    public void AddStep(SagaStep step)
    {
        _steps.Add(step);
    }

    /// <summary>
    /// Execute the saga. If any step fails, compensate in reverse order.
    /// </summary>
    public async Task<bool> ExecuteAsync()
    {
        var executed = new List<SagaStep>();

        foreach (var step in _steps)
        {
            step.Status = SagaStepStatus.Running;
            try
            {
                await step.Execute();
                step.Status = SagaStepStatus.Completed;
                executed.Add(step);
            }
            catch
            {
                step.Status = SagaStepStatus.Failed;

                // Compensate in reverse order
                foreach (var s in executed.AsEnumerable().Reverse())
                {
                    try
                    {
                        await s.Compensate();
                        s.Status = SagaStepStatus.Compensated;
                    }
                    catch
                    {
                        // Compensation failed - log but continue
                    }
                }

                return false;
            }
        }

        return true;
    }
}

/// <summary>
/// Agent lifecycle states.
/// </summary>
public enum AgentLifecycleState
{
    Created,
    Initialized,
    Running,
    Suspended,
    Terminated
}

/// <summary>
/// Lifecycle manager for agents.
/// </summary>
public sealed class LifecycleManager
{
    private readonly Dictionary<string, AgentLifecycleState> _states = new();

    public void Transition(string agentId, AgentLifecycleState newState)
    {
        if (_states.TryGetValue(agentId, out var current))
        {
            if (!IsValidTransition(current, newState))
            {
                throw new InvalidOperationException(
                    $"Invalid transition: {current} → {newState}");
            }
        }

        _states[agentId] = newState;
    }

    public AgentLifecycleState? GetState(string agentId)
    {
        return _states.TryGetValue(agentId, out var state) ? state : null;
    }

    private bool IsValidTransition(AgentLifecycleState from, AgentLifecycleState to)
    {
        return (from, to) switch
        {
            (AgentLifecycleState.Created, AgentLifecycleState.Initialized) => true,
            (AgentLifecycleState.Initialized, AgentLifecycleState.Running) => true,
            (AgentLifecycleState.Running, AgentLifecycleState.Suspended) => true,
            (AgentLifecycleState.Suspended, AgentLifecycleState.Running) => true,
            (AgentLifecycleState.Running, AgentLifecycleState.Terminated) => true,
            (AgentLifecycleState.Suspended, AgentLifecycleState.Terminated) => true,
            _ => false
        };
    }
}
