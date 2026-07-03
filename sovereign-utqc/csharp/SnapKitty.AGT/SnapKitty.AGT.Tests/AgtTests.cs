// SnapKitty.AGT.Tests — Unit tests for AGT components

using Xunit;
using SnapKitty.AGT.Mesh;
using SnapKitty.AGT.OS;
using ExecutionContext = SnapKitty.AGT.OS.ExecutionContext;
using SnapKitty.AGT.Runtime;
using SnapKitty.AGT.SRE;

namespace SnapKitty.AGT.Tests;

public class AgentIdentityTests
{
    [Fact]
    public void GenerateDID_IsValid()
    {
        var did = AgentDID.Generate();
        Assert.StartsWith("did:snapkitty:", did.FullDID);
        Assert.Equal(46, did.FullDID.Length); // did:snapkitty: (14) + 32 hex
    }

    [Fact]
    public void AgentIdentity_CreatedWithDefaults()
    {
        var identity = new AgentIdentity { Name = "Test" };
        Assert.Equal("Test", identity.Name);
        Assert.False(identity.IsExpired);
    }
}

public class PolicyKernelTests
{
    [Fact]
    public async Task ExecuteAsync_AllowsUnblockedAction()
    {
        var policies = new Dictionary<string, Policy>
        {
            ["test"] = new() { Name = "test", BlockedActions = { "blocked" } }
        };

        var kernel = new StatelessKernel(policies);
        var result = await kernel.ExecuteAsync(
            "allowed",
            new(),
            new ExecutionContext { Policies = { "test" } });

        Assert.True(result.Success);
    }

    [Fact]
    public async Task ExecuteAsync_BlocksAction()
    {
        var policies = new Dictionary<string, Policy>
        {
            ["test"] = new() { Name = "test", BlockedActions = { "blocked" } }
        };

        var kernel = new StatelessKernel(policies);
        var result = await kernel.ExecuteAsync(
            "blocked",
            new(),
            new ExecutionContext { Policies = { "test" } });

        Assert.False(result.Success);
        Assert.Contains("blocked", result.Error);
    }
}

public class CircuitBreakerTests
{
    [Fact]
    public void StartsClosed()
    {
        var breaker = new CircuitBreaker(3, TimeSpan.FromSeconds(1));
        Assert.Equal(CircuitState.Closed, breaker.State);
        Assert.True(breaker.IsAllowed());
    }

    [Fact]
    public void OpensAfterThreshold()
    {
        var breaker = new CircuitBreaker(3, TimeSpan.FromSeconds(1));

        breaker.RecordFailure();
        breaker.RecordFailure();
        breaker.RecordFailure();

        Assert.Equal(CircuitState.Open, breaker.State);
        Assert.False(breaker.IsAllowed());
    }

    [Fact]
    public void ResetsOnSuccess()
    {
        var breaker = new CircuitBreaker(3, TimeSpan.FromSeconds(1));

        breaker.RecordFailure();
        breaker.RecordFailure();
        breaker.RecordSuccess();

        Assert.Equal(CircuitState.Closed, breaker.State);
        Assert.True(breaker.IsAllowed());
    }
}

public class PrivilegeRingTests
{
    [Fact]
    public void Ring0_CanExecuteAll()
    {
        var enforcer = new PrivilegeRingEnforcer();
        enforcer.RegisterAgent("kernel", PrivilegeRing.Ring0);

        Assert.True(enforcer.CanExecute("kernel", PrivilegeRing.Ring0));
        Assert.True(enforcer.CanExecute("kernel", PrivilegeRing.Ring1));
        Assert.True(enforcer.CanExecute("kernel", PrivilegeRing.Ring2));
        Assert.True(enforcer.CanExecute("kernel", PrivilegeRing.Ring3));
    }

    [Fact]
    public void Ring3_CannotExecuteRing0()
    {
        var enforcer = new PrivilegeRingEnforcer();
        enforcer.RegisterAgent("guest", PrivilegeRing.Ring3);

        Assert.False(enforcer.CanExecute("guest", PrivilegeRing.Ring0));
        Assert.True(enforcer.CanExecute("guest", PrivilegeRing.Ring3));
    }
}

public class SagaOrchestratorTests
{
    [Fact]
    public async Task ExecuteAsync_AllStepsSucceed()
    {
        var saga = new SagaOrchestrator();
        var executed = new List<string>();

        saga.AddStep(new SagaStep
        {
            Name = "step1",
            Execute = () => { executed.Add("step1"); return Task.CompletedTask; }
        });
        saga.AddStep(new SagaStep
        {
            Name = "step2",
            Execute = () => { executed.Add("step2"); return Task.CompletedTask; }
        });

        var result = await saga.ExecuteAsync();

        Assert.True(result);
        Assert.Equal(2, executed.Count);
    }

    [Fact]
    public async Task ExecuteAsync_FailureCompensates()
    {
        var saga = new SagaOrchestrator();
        var compensated = false;

        saga.AddStep(new SagaStep
        {
            Name = "step1",
            Execute = () => Task.CompletedTask,
            Compensate = () => { compensated = true; return Task.CompletedTask; }
        });
        saga.AddStep(new SagaStep
        {
            Name = "step2",
            Execute = () => throw new Exception("fail")
        });

        var result = await saga.ExecuteAsync();

        Assert.False(result);
        Assert.True(compensated);
    }
}
