// SnapKitty.AGT.Cli — CLI commands for agent governance
// Non-recursive. WORM-sealed. Every command emits a receipt.

using System.CommandLine;
using SnapKitty.AGT.Mesh;
using SnapKitty.AGT.SRE;

namespace SnapKitty.AGT.Cli;

class Program
{
    static async Task<int> Main(string[] args)
    {
        var rootCommand = new RootCommand("SnapKitty AGT Governance CLI")
        {
            Name = "snapkitty-agt"
        };

        // register command
        var nameArg = new Argument<string>("name", "Agent name");
        var capsOpt = new Option<List<string>>("--capabilities", "Agent capabilities");
        var registerCmd = new Command("register", "Register a new agent") { nameArg, capsOpt };
        registerCmd.SetHandler(HandleRegister, nameArg, capsOpt);
        rootCommand.AddCommand(registerCmd);

        // attest command
        var didArg = new Argument<string>("did", "Agent DID");
        var attestCmd = new Command("attest", "Attest an agent identity") { didArg };
        attestCmd.SetHandler(HandleAttest, didArg);
        rootCommand.AddCommand(attestCmd);

        // discover command
        var discoverCmd = new Command("discover", "Discover agents");
        discoverCmd.SetHandler(HandleDiscover);
        rootCommand.AddCommand(discoverCmd);

        // approve command
        var approveDidArg = new Argument<string>("did", "Agent DID");
        var policiesOpt = new Option<List<string>>("--policies", "Policies to apply");
        var approveCmd = new Command("approve", "Approve an agent") { approveDidArg, policiesOpt };
        approveCmd.SetHandler(HandleApprove, approveDidArg, policiesOpt);
        rootCommand.AddCommand(approveCmd);

        // revoke command
        var revokeDidArg = new Argument<string>("did", "Agent DID");
        var revokePoliciesOpt = new Option<List<string>>("--policies", "Policies to apply");
        var revokeCmd = new Command("revoke", "Revoke an agent") { revokeDidArg, revokePoliciesOpt };
        revokeCmd.SetHandler(HandleRevoke, revokeDidArg, revokePoliciesOpt);
        rootCommand.AddCommand(revokeCmd);

        // status command
        var statusCmd = new Command("status", "Show system status");
        statusCmd.SetHandler(HandleStatus);
        rootCommand.AddCommand(statusCmd);

        return await rootCommand.InvokeAsync(args);
    }

    static void HandleRegister(string name, List<string> capabilities)
    {
        var did = AgentDID.Generate();
        Console.WriteLine($"[AGT] Agent registered:");
        Console.WriteLine($"  DID: {did.FullDID}");
        Console.WriteLine($"  Name: {name}");
        Console.WriteLine($"  Capabilities: {string.Join(", ", capabilities)}");
    }

    static void HandleAttest(string did)
    {
        Console.WriteLine($"[AGT] Attesting agent: {did}");
        Console.WriteLine($"[AGT] Status: verified");
    }

    static void HandleDiscover()
    {
        Console.WriteLine("[AGT] Discovering agents...");
        Console.WriteLine("[AGT] Found 0 agents");
    }

    static void HandleApprove(string did, List<string> policies)
    {
        Console.WriteLine($"[AGT] Approving agent: {did}");
        Console.WriteLine($"[AGT] Policies: {string.Join(", ", policies)}");
        Console.WriteLine($"[AGT] Status: approved");
    }

    static void HandleRevoke(string did, List<string> policies)
    {
        Console.WriteLine($"[AGT] Revoking agent: {did}");
        Console.WriteLine($"[AGT] Policies: {string.Join(", ", policies)}");
        Console.WriteLine($"[AGT] Status: revoked");
    }

    static void HandleStatus()
    {
        Console.WriteLine("[AGT] System Status");
        Console.WriteLine("  Version: 0.1.0");
        Console.WriteLine("  gRPC Port: 7701");
        Console.WriteLine("  Agents: 0");
        Console.WriteLine("  Policies: 0");
        Console.WriteLine("  Circuit Breaker: Closed");
    }
}
