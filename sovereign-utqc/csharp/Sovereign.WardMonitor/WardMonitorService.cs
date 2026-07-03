// Sovereign.WardMonitor - Runtime Drift Control Panel
// Non-recursive. WORM-sealed. Kill-switch enforcement.

using System.Text.Json;

namespace Sovereign.WardMonitor;

/// <summary>
/// Drift thresholds for the WardMonitor.
/// </summary>
public record DriftThresholds
{
    public double RhoWarn { get; init; } = 0.85;
    public double RhoHalt { get; init; } = 1.0;
    public double DeltaMax { get; init; } = 1e-4;
    public double LambdaLMax { get; init; } = 1.0;
}

/// <summary>
/// Current manifold state.
/// </summary>
public record ManifoldState
{
    public double Rho { get; init; }
    public double Delta { get; init; }
    public double LambdaLProduct { get; init; }
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// WardMonitor action result.
/// </summary>
public enum MonitorAction
{
    Continue,
    Warning,
    Kill,
    Error
}

/// <summary>
/// Result of a monitor step.
/// </summary>
public record MonitorResult
{
    public MonitorAction Action { get; init; }
    public string Message { get; init; } = "";
    public ManifoldState State { get; init; } = new();
}

/// <summary>
/// Runtime drift detection and kill-switch enforcement.
/// </summary>
public class WardMonitorService
{
    private readonly DriftThresholds _thresholds;
    private readonly List<MonitorResult> _history = new();
    private bool _running;

    public WardMonitorService(DriftThresholds? thresholds = null)
    {
        _thresholds = thresholds ?? new DriftThresholds();
    }

    /// <summary>
    /// Evaluate a manifold state and return action.
    /// </summary>
    public MonitorResult Step(ManifoldState state)
    {
        var result = new MonitorResult { State = state };

        // Check λL stability product
        if (state.LambdaLProduct >= _thresholds.LambdaLMax)
        {
            result.Action = MonitorAction.Kill;
            result.Message = $"Finton stability violation: λL = {state.LambdaLProduct:F6} >= {_thresholds.LambdaLMax}";
            _history.Add(result);
            return result;
        }

        // Check δ drift
        if (state.Delta >= _thresholds.DeltaMax)
        {
            result.Action = MonitorAction.Kill;
            result.Message = $"Liquidity pool drift exceeded: δ = {state.Delta:F6} >= {_thresholds.DeltaMax}";
            _history.Add(result);
            return result;
        }

        // Check ρ halt threshold
        if (state.Rho >= _thresholds.RhoHalt)
        {
            result.Action = MonitorAction.Kill;
            result.Message = $"Halt threshold exceeded: ρ = {state.Rho:F6} >= {_thresholds.RhoHalt}";
            _history.Add(result);
            return result;
        }

        // Check ρ warning threshold
        if (state.Rho >= _thresholds.RhoWarn)
        {
            result.Action = MonitorAction.Warning;
            result.Message = $"Drift warning: ρ = {state.Rho:F6} >= {_thresholds.RhoWarn}";
            _history.Add(result);
            return result;
        }

        // Normal operation
        result.Action = MonitorAction.Continue;
        result.Message = "Drift within bounds";
        _history.Add(result);
        return result;
    }

    /// <summary>
    /// Start the monitor loop.
    /// </summary>
    public async Task RunAsync(Func<Task<ManifoldState>> stateProvider, CancellationToken ct)
    {
        _running = true;
        Console.WriteLine("[WARD-MONITOR] Starting drift detection...");
        Console.WriteLine($"[WARD-MONITOR] Thresholds: ρ_warn={_thresholds.RhoWarn}, ρ_halt={_thresholds.RhoHalt}, δ_max={_thresholds.DeltaMax}");

        while (!ct.IsCancellationRequested && _running)
        {
            try
            {
                var state = await stateProvider();
                var result = Step(state);

                switch (result.Action)
                {
                    case MonitorAction.Continue:
                        Console.WriteLine($"[WARD-MONITOR] [{DateTime.UtcNow:HH:mm:ss}] ρ={state.Rho:F6} δ={state.Delta:F6} λL={state.LambdaLProduct:F6} — OK");
                        break;

                    case MonitorAction.Warning:
                        Console.ForegroundColor = ConsoleColor.Yellow;
                        Console.WriteLine($"[WARD-MONITOR] [{DateTime.UtcNow:HH:mm:ss}] ⚠ {result.Message}");
                        Console.ResetColor();
                        break;

                    case MonitorAction.Kill:
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine($"[WARD-MONITOR] [{DateTime.UtcNow:HH:mm:ss}] ✗ KILL-SWITCH: {result.Message}");
                        Console.ResetColor();
                        Environment.Exit(1);
                        break;
                }

                await Task.Delay(1000, ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[WARD-MONITOR] Error: {ex.Message}");
                Console.ResetColor();
            }
        }

        Console.WriteLine("[WARD-MONITOR] Stopped.");
    }

    public void Stop() => _running = false;

    public IReadOnlyList<MonitorResult> GetHistory(int count = 10)
    {
        return _history.TakeLast(count).ToList().AsReadOnly();
    }
}
