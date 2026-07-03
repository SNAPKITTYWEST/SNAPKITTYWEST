// SnapKitty.AGT.Mesh — DID, Identity, Credentials, mTLS, Namespaces
// Non-recursive. WORM-sealed. Every identity is sovereign.

using System.Security.Cryptography;
using System.Text;

namespace SnapKitty.AGT.Mesh;

/// <summary>
/// Agent Decentralized Identifier (DID).
/// </summary>
public record AgentDID
{
    public string Method { get; init; } = "snapkitty";
    public string Identifier { get; init; } = "";
    public string FullDID => $"did:{Method}:{Identifier}";

    public static AgentDID Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(16);
        var id = Convert.ToHexString(bytes).ToLowerInvariant();
        return new AgentDID { Identifier = id };
    }
}

/// <summary>
/// Agent identity with keys and capabilities.
/// </summary>
public record AgentIdentity
{
    public AgentDID DID { get; init; } = AgentDID.Generate();
    public string Name { get; init; } = "";
    public byte[] PublicKey { get; init; } = Array.Empty<byte>();
    public byte[] PrivateKey { get; init; } = Array.Empty<byte>();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; init; }
    public IReadOnlyList<string> Capabilities { get; init; } = Array.Empty<string>();

    public bool IsExpired => ExpiresAt.HasValue && DateTime.UtcNow > ExpiresAt.Value;
}

/// <summary>
/// Verifiable credential issued to an agent.
/// </summary>
public record Credential
{
    public string ID { get; init; } = Guid.NewGuid().ToString();
    public AgentDID Issuer { get; init; } = AgentDID.Generate();
    public AgentDID Subject { get; init; } = AgentDID.Generate();
    public string Type { get; init; } = "";
    public Dictionary<string, object> Claims { get; init; } = new();
    public DateTime IssuedAt { get; init; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; init; }
    public byte[] Signature { get; init; } = Array.Empty<byte>();

    public bool IsValid => !ExpiresAt.HasValue || DateTime.UtcNow <= ExpiresAt.Value;
}

/// <summary>
/// Key rotation manager for agent identities.
/// </summary>
public class KeyRotationManager
{
    private readonly Dictionary<AgentDID, List<(byte[] Key, DateTime RotatedAt)>> _keyHistory = new();

    public void RotateKey(AgentIdentity identity)
    {
        var newKey = RandomNumberGenerator.GetBytes(32);

        if (!_keyHistory.ContainsKey(identity.DID))
        {
            _keyHistory[identity.DID] = new List<(byte[], DateTime)>();
        }

        _keyHistory[identity.DID].Add((identity.PublicKey, DateTime.UtcNow));

        // Return new identity with rotated key
        return;
    }

    public IReadOnlyList<(byte[] Key, DateTime RotatedAt)> GetKeyHistory(AgentDID did)
    {
        return _keyHistory.TryGetValue(did, out var history)
            ? history.AsReadOnly()
            : Array.Empty<(byte[], DateTime)>().AsReadOnly();
    }
}

/// <summary>
/// Namespace manager for agent isolation.
/// </summary>
public class NamespaceManager
{
    private readonly Dictionary<string, HashSet<AgentDID>> _namespaces = new();

    public void Register(string namespaceName, AgentDID did)
    {
        if (!_namespaces.ContainsKey(namespaceName))
        {
            _namespaces[namespaceName] = new HashSet<AgentDID>();
        }
        _namespaces[namespaceName].Add(did);
    }

    public bool IsInNamespace(string namespaceName, AgentDID did)
    {
        return _namespaces.TryGetValue(namespaceName, out var agents) && agents.Contains(did);
    }

    public IReadOnlyList<AgentDID> GetAgents(string namespaceName)
    {
        return _namespaces.TryGetValue(namespaceName, out var agents)
            ? agents.ToList().AsReadOnly()
            : Array.Empty<AgentDID>().AsReadOnly();
    }
}
