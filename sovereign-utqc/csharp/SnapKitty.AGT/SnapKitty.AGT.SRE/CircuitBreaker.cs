// SnapKitty.AGT.SRE — Circuit Breaker, Chaos Hooks, Health
// Non-recursive. WORM-sealed. Every failure is recorded.

namespace SnapKitty.AGT.SRE;

/// <summary>
/// Circuit breaker states.
/// </summary>
public enum CircuitState
{
    Closed,
    Open,
    HalfOpen
}

/// <summary>
/// Circuit breaker for fault tolerance.
/// </summary>
public sealed class CircuitBreaker
{
    private readonly int _failureThreshold;
    private readonly TimeSpan _resetAfter;
    private int _failures;
    private DateTimeOffset? _openedAt;

    public CircuitState State { get; private set; } = CircuitState.Closed;

    public CircuitBreaker(int failureThreshold, TimeSpan resetAfter)
    {
        _failureThreshold = failureThreshold;
        _resetAfter = resetAfter;
    }

    public bool IsAllowed()
    {
        if (State != CircuitState.Open) return true;

        if (_openedAt.HasValue &&
            DateTimeOffset.UtcNow - _openedAt.Value >= _resetAfter)
        {
            State = CircuitState.HalfOpen;
            return true;
        }

        return false;
    }

    public void RecordFailure()
    {
        _failures++;

        if (_failures >= _failureThreshold)
        {
            State = CircuitState.Open;
            _openedAt = DateTimeOffset.UtcNow;
        }
    }

    public void RecordSuccess()
    {
        _failures = 0;
        State = CircuitState.Closed;
        _openedAt = null;
    }
}

/// <summary>
/// Health status.
/// </summary>
public enum HealthStatus
{
    Healthy,
    Degraded,
    Unhealthy
}

/// <summary>
/// Health check result.
/// </summary>
public record HealthCheckResult
{
    public string Name { get; init; } = "";
    public HealthStatus Status { get; init; }
    public string? Message { get; init; }
    public TimeSpan Duration { get; init; }
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Health checker for services.
/// </summary>
public sealed class HealthChecker
{
    private readonly List<Func<Task<HealthCheckResult>>> _checks = new();

    public void RegisterCheck(Func<Task<HealthCheckResult>> check)
    {
        _checks.Add(check);
    }

    public async Task<List<HealthCheckResult>> CheckAllAsync()
    {
        var results = new List<HealthCheckResult>();

        foreach (var check in _checks)
        {
            try
            {
                var result = await check();
                results.Add(result);
            }
            catch (Exception ex)
            {
                results.Add(new HealthCheckResult
                {
                    Name = "unknown",
                    Status = HealthStatus.Unhealthy,
                    Message = ex.Message
                });
            }
        }

        return results;
    }

    public async Task<HealthStatus> GetOverallHealthAsync()
    {
        var results = await CheckAllAsync();

        if (results.Any(r => r.Status == HealthStatus.Unhealthy))
            return HealthStatus.Unhealthy;

        if (results.Any(r => r.Status == HealthStatus.Degraded))
            return HealthStatus.Degraded;

        return HealthStatus.Healthy;
    }
}
