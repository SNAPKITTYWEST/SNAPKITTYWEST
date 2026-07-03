// Sovereign.PhaseMirror - Near-Miss Alert Stream
// Non-recursive. WORM-sealed. Emit warnings for near-misses.

using System.Text.Json;

namespace Sovereign.PhaseMirror;

/// <summary>
/// Severity of a phase mirror alert.
/// </summary>
public enum AlertSeverity
{
    Info,
    Warning,
    Critical,
    KillSwitch
}

/// <summary>
/// A phase mirror alert for near-miss events.
/// </summary>
public record PhaseMirrorAlert
{
    public string Tension { get; init; } = "";
    public string Evidence { get; init; } = "";
    public string Owner { get; init; } = "";
    public string Metric { get; init; } = "";
    public string Horizon { get; init; } = "7 days";
    public List<string> Actions { get; init; } = new();
    public AlertSeverity Severity { get; init; }
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    public string ToJson()
    {
        return JsonSerializer.Serialize(new
        {
            tension = Tension,
            evidence = Evidence,
            owner = Owner,
            metric = Metric,
            horizon = Horizon,
            actions = Actions,
            severity = Severity.ToString(),
            timestamp = Timestamp.ToString("o")
        }, new JsonSerializerOptions { WriteIndented = true });
    }
}

/// <summary>
/// Phase Mirror near-miss alert emitter.
/// </summary>
public class PhaseMirrorEmitter
{
    private readonly List<PhaseMirrorAlert> _alerts = new();
    private readonly string _leverPath;

    public PhaseMirrorEmitter(string leverPath = "phase_mirror_lever.json")
    {
        _leverPath = leverPath;
    }

    /// <summary>
    /// Emit a near-miss alert.
    /// </summary>
    public void Emit(PhaseMirrorAlert alert)
    {
        _alerts.Add(alert);
        WriteLeverFile(alert);
        PrintAlert(alert);
    }

    /// <summary>
    /// Emit a stratum boundary near-miss.
    /// </summary>
    public void EmitStratumBoundaryWarning(ulong currentStratum, ulong threshold)
    {
        Emit(new PhaseMirrorAlert
        {
            Tension = $"Stratum boundary approaching: {currentStratum}/{threshold}",
            Evidence = $"Current stratum {currentStratum} is within 10% of threshold {threshold}",
            Owner = "Compiler Engineering",
            Metric = "stratum_boundary_proximity",
            Severity = AlertSeverity.Warning,
            Actions = new() { "Review operator constraints", "Consider refactoring" }
        });
    }

    /// <summary>
    /// Emit a multiplicity overflow near-miss.
    /// </summary>
    public void EmitMultiplicityOverflow(ulong prime, string exponent)
    {
        Emit(new PhaseMirrorAlert
        {
            Tension = $"Multiplicity overflow near-miss: {prime}^{exponent}",
            Evidence = $"Computation {prime}^{exponent} is near u64 overflow boundary",
            Owner = "Math Kernel Engineering",
            Metric = "multiplicity_overflow_proximity",
            Severity = AlertSeverity.Critical,
            Actions = new() { "Reduce prime index", "Use smaller exponent", "Check for safe arithmetic" }
        });
    }

    /// <summary>
    /// Emit a Lean proof failure alert.
    /// </summary>
    public void EmitLeanProofFailure(string proofHash, string error)
    {
        Emit(new PhaseMirrorAlert
        {
            Tension = $"Lean proof verification failed: {proofHash[..16]}...",
            Evidence = error,
            Owner = "Formal Verification Team",
            Metric = "lean_proof_failure",
            Severity = AlertSeverity.KillSwitch,
            Actions = new() { "Fix the proof", "Re-run verification", "Check Lean environment" }
        });
    }

    public IReadOnlyList<PhaseMirrorAlert> GetRecent(int count = 10)
    {
        return _alerts.TakeLast(count).ToList().AsReadOnly();
    }

    private void WriteLeverFile(PhaseMirrorAlert alert)
    {
        try
        {
            var json = alert.ToJson();
            File.AppendAllText(_leverPath, json + Environment.NewLine);
        }
        catch (IOException)
        {
            // Best effort - don't fail on I/O errors
        }
    }

    private void PrintAlert(PhaseMirrorAlert alert)
    {
        var color = alert.Severity switch
        {
            AlertSeverity.Info => ConsoleColor.Cyan,
            AlertSeverity.Warning => ConsoleColor.Yellow,
            AlertSeverity.Critical => ConsoleColor.Red,
            AlertSeverity.KillSwitch => ConsoleColor.Magenta,
            _ => ConsoleColor.White
        };

        var prev = Console.ForegroundColor;
        Console.ForegroundColor = color;
        Console.WriteLine($"[PHASE-MIRROR] [{alert.Severity}] {alert.Tension}");
        Console.ForegroundColor = prev;
    }
}
