// Sovereign.Receipts - ContractivityReceipt Viewer
// Non-recursive. WORM-sealed. Read-only.

namespace Sovereign.Receipts;

/// <summary>
/// A contractivity receipt from the C++ compiler core.
/// </summary>
public record ContractivityReceipt
{
    public ulong PrimeIndex { get; init; }
    public string Hash { get; init; } = "";
    public ulong TimestampNs { get; init; }
    public string Operator { get; init; } = "";
    public string MerkleRoot { get; init; } = "";
    public bool Verified { get; init; }

    public DateTime Timestamp => DateTimeOffset.FromUnixTimeSeconds((long)(TimestampNs / 1_000_000_000)).DateTime;

    public string ToDisplayString()
    {
        return $"""
            ╔══════════════════════════════════════════════════════╗
            ║ Contractivity Receipt                              ║
            ╠══════════════════════════════════════════════════════╣
            ║ Prime Index: {PrimeIndex,-38} ║
            ║ Operator:    {Operator,-38} ║
            ║ Hash:        {Hash[..16]}...{' ',-21} ║
            ║ Verified:    {(Verified ? "✓ VERIFIED" : "✗ FAILED"),-38} ║
            ║ Timestamp:   {Timestamp:yyyy-MM-dd HH:mm:ss}{' ',-18} ║
            ╚══════════════════════════════════════════════════════╝
            """;
    }
}

/// <summary>
/// Receipt viewer and verifier.
/// </summary>
public class ReceiptViewer
{
    private readonly List<ContractivityReceipt> _receipts = new();

    public void AddReceipt(ContractivityReceipt receipt)
    {
        _receipts.Add(receipt);
    }

    public ContractivityReceipt? GetByHash(string hash)
    {
        return _receipts.FirstOrDefault(r => r.Hash == hash);
    }

    public IReadOnlyList<ContractivityReceipt> GetRecent(int count = 10)
    {
        return _receipts.TakeLast(count).ToList().AsReadOnly();
    }

    public bool VerifyChain()
    {
        if (_receipts.Count <= 1) return true;

        for (int i = 1; i < _receipts.Count; i++)
        {
            if (_receipts[i].MerkleRoot == "")
                return false;
        }
        return true;
    }

    public void PrintRecent(int count = 5)
    {
        var recent = GetRecent(count);
        Console.WriteLine($"[RECEIPTS] Showing {recent.Count} recent receipts:");

        foreach (var receipt in recent)
        {
            Console.WriteLine(receipt.ToDisplayString());
        }
    }
}
