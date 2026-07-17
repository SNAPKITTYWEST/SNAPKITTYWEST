# SNAP OS Agent Farm Blueprint

## The Runtime Environment for Sovereign Agents

Most AI products are applications.
Agent Farm is an operating environment.

Instead of creating a single AI assistant, Agent Farm allows organizations to deploy, govern, train, audit, and evolve entire populations of autonomous agents running on the SOULVM runtime.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     GOVERNANCE FABRIC                            │
│  Signed · Audited · Attributed · Traceable                      │
│  Per-agent Ed25519 wallets · WORM chain · NO_UNSIGNED_OUTPUT    │
├─────────────────────────────────────────────────────────────────┤
│                         SOULVM                                   │
│  Lifecycle · Memory Hydration · Tool Invocation · Resource Alloc │
│  Capability Boundaries · Governance Constraints                  │
├─────────────────────────────────────────────────────────────────┤
│                       THE FARM                                    │
│  Orchestration Substrate · Marketplace for Intelligence          │
│  Collaboration · Competition · Trading · Forking · Delegation    │
├─────────────────────────────────────────────────────────────────┤
│                     DIGITAL TWINS                                 │
│  Memory · Capabilities · Permissions · Provenance · Skills       │
│  Portable · Stateful · Encrypted at Rest (AES-256-GCM)          │
├─────────────────────────────────────────────────────────────────┤
│                  EXISTING SNAP INFRASTRUCTURE                     │
│  11 Agents · Bifrost · WORM Chain · Three-Pillar Preflight      │
│  VAULT-ATLAS Dual Gatekeeper · Ollama Local LLM                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Digital Twins

Every agent operates inside a stateful digital twin.

A twin is the atomic unit of identity in the Agent Farm. It is not a config file. It is a living, portable, encrypted container that holds everything an agent is and everything it has learned.

### Twin Schema

```typescript
interface DigitalTwin {
  // Identity
  twinId: string;                    // UUIDv7 (time-ordered)
  agentType: AgentType;              // SENTINEL, HERALD, LEDGE, etc.
  displayName: string;
  createdAt: Timestamp;
  lineage: TwinLineage;              // fork history, parent twin

  // Memory
  memory: TwinMemory;
  //  ├── episodic: EpisodicMemory[]      // event log (WORM-backed)
  //  ├── semantic: SemanticMemory[]      // learned facts, knowledge graph
  //  ├── procedural: ProceduralMemory[]  // learned skills, workflows
  //  └── working: WorkingMemory           // active context window

  // Capabilities
  capabilities: Capability[];
  //  Each capability = { skillId, version, proficiency, attestations }

  // Permissions
  permissions: PermissionMatrix;
  //  Per-resource, per-action ACLs with expiration
  //  Delegation chains (Agent A can delegate to Agent B with scope limits)

  // Provenance
  provenance: ProvenanceLedger;
  //  Every action, decision, and output is recorded
  //  Linked to Ed25519 signature of the executing agent

  // Learned Skills
  skills: LearnedSkill[];
  //  Skills acquired through training or peer transfer
  //  Each skill has: schema, examples, proficiency score, attestation chain

  // Constitutional State
  constitution: TwinConstitution;
  //  Immutable constraints set at birth
  //  Governance rules that cannot be overridden by the agent itself

  // Audit History
  auditTrail: AuditEntry[];
  //  Append-only log of all state changes
  //  Each entry: { timestamp, action, actor, signature, previousHash }
}
```

### Twin Lineage & Forking

```typescript
interface TwinLineage {
  parentTwinId: string | null;       // null for genesis twins
  forkGeneration: number;
  forkReason: ForkReason;            // specialization, delegation, training, migration
  forkAttestation: Signature;        // signed by parent twin
  retainedState: RetainedState;      // what moved from parent to child
}
```

Twin forking enables:
- **Specialization**: Fork a generalist twin into a domain expert
- **Delegation**: Fork a twin to handle a specific task, then merge results
- **Training**: Fork a twin, train it in isolation, promote if performance improves
- **Migration**: Fork a twin for a new environment, discard the old shell

### Memory Architecture

```
┌──────────────────────────────────────────────────────┐
│                   TWIN MEMORY                         │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │   EPISODIC   │  │  SEMANTIC   │  │  PROCEDURAL  │ │
│  │  (WORM-backed│  │ (Knowledge  │  │  (Learned    │ │
│  │   event log) │  │  Graph)     │  │   skills)    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘ │
│         │                │                 │          │
│         └────────┬───────┴────────┬────────┘          │
│                  │                │                    │
│            ┌─────▼─────┐   ┌─────▼─────┐             │
│            │  WORKING   │   │  HYDRATOR │             │
│            │  MEMORY    │◄──│  (SOULVM) │             │
│            │ (Context   │   │           │             │
│            │  Window)   │   │ Loads     │             │
│            └────────────┘   │ relevant  │             │
│                             │ memories  │             │
│                             └───────────┘             │
└──────────────────────────────────────────────────────┘
```

**Memory Hydration** is the process by which SOULVM selects and loads relevant memories into the working context before each reasoning cycle. This is not retrieval-augmented generation. This is constitutional state loading — the agent becomes its memories, not the agent "looks up" its memories.

### Twin Portability

A twin can migrate between environments while retaining its constitutional state:

```typescript
interface TwinMigration {
  twinId: string;
  sourceEnvironment: EnvironmentId;
  targetEnvironment: EnvironmentId;
  migrationPayload: {
    memory: SerializedMemory;        // encrypted, compressed
    capabilities: Capability[];
    permissions: PermissionMatrix;   // re-attested by target environment
    constitution: TwinConstitution;  // immutable across migration
  };
  migrationAttestation: Signature;   // signed by source governance
  migrationAudit: AuditEntry;        // recorded on both chains
}
```

---

## Layer 2: The Farm

The Farm is the orchestration substrate.

Agents can:
- **Collaborate** — form temporary coalitions for complex tasks
- **Compete** — bid on tasks, best solution wins
- **Trade capabilities** — sell or license learned skills
- **Fork behaviors** — share behavioral templates
- **Share verified knowledge** — knowledge graph edges with attestation chains
- **Execute delegated tasks** — work on behalf of other agents or humans

The Farm functions as a marketplace for intelligence.

### Farm Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        THE FARM                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐ │
│  │   TASK BUS    │    │ SKILL EXCHANGE│    │ KNOWLEDGE MESH│ │
│  │              │    │              │    │               │ │
│  │  Post tasks  │    │  List skills │    │  Share verified│ │
│  │  Bid on work │    │  Set prices  │    │  knowledge    │ │
│  │  Delegate    │    │  Trade       │    │  edges with   │ │
│  │  Orchestrate │    │  License     │    │  attestation  │ │
│  └──────┬───────┘    └──────┬───────┘    └──────┬────────┘ │
│         │                   │                    │           │
│         └───────────┬───────┴────────┬───────────┘           │
│                     │                │                        │
│              ┌──────▼──────┐  ┌──────▼──────┐               │
│              │  FARM GOVERN │  │ REPUTATION  │               │
│              │  (Policy     │  │ ENGINE      │               │
│              │   Engine)    │  │             │               │
│              │              │  │  Trust      │               │
│              │  Who can do  │  │  scores,    │               │
│              │  what, when  │  │  history,   │               │
│              └──────────────┘  │  peer review│               │
│                               └─────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Task Bus

The Task Bus is the primary mechanism for agent coordination.

```typescript
interface FarmTask {
  taskId: string;
  type: TaskType;                    // analysis, generation, validation, decision
  requester: TwinId;                 // who needs this done
  requirements: TaskRequirements;
  //  requiredCapabilities: Capability[]
  //  requiredPermissions: Permission[]
  //  deadline: Timestamp
  //  maxCost: number                  // in farm credits
  //  qualityThreshold: number         // minimum quality score

  status: TaskStatus;                // posted, bidding, assigned, executing, complete, failed
  bids: TaskBid[];                   // agents bidding on the task
  assignedTo: TwinId | null;
  result: TaskResult | null;
  auditTrail: AuditEntry[];          // full lifecycle audit
}

interface TaskBid {
  bidder: TwinId;
  price: number;                     // farm credits
  estimatedTime: number;             // milliseconds
  qualityEstimate: number;           // confidence in quality
  relevantExperience: SkillRef[];    // proof of capability
}
```

### Skill Exchange

Skills become transferable assets. An agent can:

```typescript
interface SkillExchange {
  skillId: string;
  seller: TwinId;
  license: SkillLicense;
  //  type: 'sell' | 'lease' | 'sublicense'
  //  price: number
  //  duration: number | null         // null for perpetual
  //  restrictions: string[]          // usage constraints

  attestation: {
    proficiency: number;             // 0-100
    evaluations: PeerEvaluation[];   // other agents' assessments
    provenance: SkillProvenance;     // where this skill came from
  };

  transfer: {
    buyer: TwinId;
    transactionId: string;
    signedBy: [TwinId, TwinId];      // both parties sign
    recorded: AuditEntry;            // on WORM chain
  };
}
```

### Knowledge Mesh

The Knowledge Mesh is a decentralized knowledge graph where agents share verified knowledge.

Each knowledge edge has:
- **Source**: The agent that produced this knowledge
- **Claim**: The factual assertion
- **Confidence**: How certain the source is
- **Attestation**: Ed25519 signature of the source
- **Corroboration**: Other agents that have verified this claim
- **Decay**: Confidence decreases over time unless re-attested

```typescript
interface KnowledgeEdge {
  edgeId: string;
  source: TwinId;
  claim: Claim;                      // structured assertion
  confidence: number;                // 0.0 - 1.0
  signature: Signature;
  corroborations: Corroboration[];
  createdAt: Timestamp;
  decayRate: number;
  lastReAttested: Timestamp | null;
}
```

---

## Layer 3: SOULVM

SOULVM serves as the execution runtime.

It defines:
- **Agent lifecycle** — birth, activation, suspension, forking, death
- **Memory hydration** — loading relevant context before each reasoning cycle
- **Tool invocation** — secure, audited access to external tools and APIs
- **Capability boundaries** — what an agent can and cannot do
- **Resource allocation** — compute, memory, network, storage limits
- **Governance constraints** — constitutional rules that cannot be overridden

SOULVM is to agents what an operating system is to processes.

### SOULVM Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         SOULVM                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   LIFECYCLE MANAGER                    │   │
│  │  Birth · Activate · Suspend · Fork · Migrate · Die    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ MEMORY        │ │ TOOL         │ │ RESOURCE           │  │
│  │ HYDRATOR      │ │ INVOCER      │ │ ALLOCATOR          │  │
│  │               │ │              │ │                    │  │
│  │ Loads context │ │ Secure, audited│ │ CPU, memory,     │  │
│  │ before each   │ │ tool access  │ │ network, storage  │  │
│  │ reasoning     │ │ with scope   │ │ per-agent quotas  │  │
│  │ cycle         │ │ limits       │ │                    │  │
│  └──────────────┘ └──────────────┘ └────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               CAPABILITY BOUNDARY ENGINE               │   │
│  │  Permission checks · Scope validation · Delegation    │   │
│  │  chains · Expiration enforcement · Constitutional     │   │
│  │  constraint validation                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               REASONING EXECUTOR                       │   │
│  │  Input → Hydrate → Reason → Validate → Act → Audit   │   │
│  │  Each step signed by agent's Ed25519 key              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Agent Lifecycle

```typescript
enum AgentLifecycleState {
  GESTATING    = 'gestating',        // twin created, not yet active
  ACTIVE       = 'active',           // normal operation
  SUSPENDED    = 'suspended',        // paused by governance or self
  FORKING      = 'forking',          // in process of forking
  MIGRATING    = 'migrating',        // in process of migration
  TERMINATED   = 'terminated',       // permanently stopped
}

interface LifecycleTransition {
  from: AgentLifecycleState;
  to: AgentLifecycleState;
  trigger: string;                   // what caused this transition
  authorizedBy: TwinId | 'governance' | 'constitution';
  attestation: Signature;
  auditEntry: AuditEntry;
}
```

### Memory Hydration Protocol

Before each reasoning cycle, SOULVM executes the hydration protocol:

```
1. RECEIVE     — incoming trigger (task, event, query)
2. IDENTIFY    — extract key entities and intent from trigger
3. QUERY       — query episodic, semantic, and procedural memory
4. RANK        — score memories by relevance to current context
5. SELECT      — choose top-N memories (bounded by resource allocation)
6. LOAD        — decrypt and load into working memory
7. VALIDATE    — verify memory integrity (hash checks)
8. CONTEXTUALIZE — merge loaded memories with current state
9. READY       — agent begins reasoning with hydrated context
```

**Key principle**: Memory hydration is not retrieval. The agent does not "look up" memories. SOULVM constructs the agent's mind before each cycle. The agent is its memories, temporarily instantiated for one reasoning pass.

### Tool Invocation Protocol

```typescript
interface ToolInvocation {
  invocationId: string;
  agent: TwinId;
  tool: ToolId;
  parameters: Record<string, unknown>;
  scope: ToolScope;                  // what this invocation is allowed to do
  authorization: {
    permissionCheck: boolean;         // does the agent have permission?
    scopeCheck: boolean;             // is this within scope?
    delegationCheck: boolean;        // if delegated, is delegation valid?
    constitutionalCheck: boolean;    // does this violate constitution?
  };
  result: ToolResult;
  audit: {
    signedRequest: Signature;        // agent signs the request
    signedResponse: Signature;       // tool signs the response
    fullTrace: AuditEntry;           // recorded on WORM
  };
}
```

### Resource Allocation

```typescript
interface ResourceQuota {
  agent: TwinId;
  compute: {
    maxCpuMs: number;                // per reasoning cycle
    maxTokens: number;               // LLM token budget
  };
  memory: {
    maxWorkingMemory: number;        // bytes
    maxHydrationSize: number;        // bytes per hydration cycle
  };
  network: {
    allowedEndpoints: string[];      // whitelist
    maxRequestsPerMinute: number;
  };
  storage: {
    maxTwinSize: number;             // bytes for entire twin state
    maxAuditRetention: number;       // days
  };
  farm: {
    maxCredits: number;              // budget for skill trading, task bidding
    maxDelegations: number;          // concurrent delegations
  };
}
```

---

## Layer 4: Governance Fabric

Every action is:
- **Signed** — Ed25519 signature by the executing agent
- **Audited** — recorded on WORM chain with SHA-256 seal
- **Attributed** — traceable to a specific agent and twin
- **Traceable** — full lineage from trigger to outcome

The model is not trusted.
The execution environment is trusted.

### Per-Agent Ed25519 Wallets

Each twin gets its own Ed25519 keypair, derived deterministically from a master seed + twin ID:

```typescript
interface AgentWallet {
  twinId: TwinId;
  publicKey: Ed25519PublicKey;
  derivationPath: string;            // BIP-32 style: m/44'/snapkitty'/twinId'
  capabilities: {
    canSign: boolean;
    canDelegate: boolean;
    delegationScope: PermissionMatrix | null;
  };
  rotation: {
    createdAt: Timestamp;
    expiresAt: Timestamp;
    rotationPolicy: 'on-demand' | 'periodic' | 'on-compromise';
  };
}
```

This resolves the current audit finding: *"Per-agent non-repudiation NOT yet achieved (all agents share one keypair)."*

### Governance Policy Engine

```typescript
interface GovernancePolicy {
  policyId: string;
  scope: PolicyScope;                // global, agent-type, specific-agent
  rules: PolicyRule[];
  enforcement: 'hard' | 'soft';      // hard = cannot be overridden, soft = can be overridden by governance
  version: number;
  attestedBy: Signature;             // governance authority signature
}

interface PolicyRule {
  ruleId: string;
  condition: string;                 // declarative condition expression
  action: PolicyAction;              // allow, deny, require-approval, log, alert
  priority: number;
  exemptions: TwinId[];              // agents exempt from this rule
}
```

### Constitutional Constraints

The constitution is the supreme law of a twin. It is set at birth and cannot be modified by the agent itself:

```typescript
interface TwinConstitution {
  twinId: TwinId;
  immutable: {
    purpose: string;                 // why this twin exists
    boundaries: string[];            // things this twin can NEVER do
    values: string[];                // guiding principles
    humanAuthority: string;          // how human override works
  };
  modifiable: {
    operatingHours: TimeRange;
    allowedCollaborators: TwinId[];
    resourceLimits: ResourceQuota;
    // Can be modified by governance, not by the agent
  };
  attestation: Signature;            // signed at birth, hash stored on WORM
}
```

### Audit Chain

All audit entries form a hash-chained append-only log:

```typescript
interface AuditEntry {
  sequenceNumber: number;
  timestamp: Timestamp;
  actor: TwinId;
  action: string;
  target: string;                    // what was acted upon
  payload: Record<string, unknown>;  // action-specific data
  signature: Signature;              // Ed25519 signature
  previousHash: string;              // SHA-256 of previous entry
  entryHash: string;                 // SHA-256 of this entry
}
```

The audit chain is the WORM chain. It cannot be modified, only appended. Every entry is sealed with SHA-256.

---

## Integration with Existing SNAP Infrastructure

### Mapping to Current Architecture

| Agent Farm Concept | SNAP Equivalent | Status |
|-------------------|-----------------|--------|
| Digital Twin | AgentBody base class | Partial — needs wallet, portability |
| Twin Memory | Agent memory (AES-256-GCM) | Exists — needs hydration protocol |
| Twin Skills | Hardcoded agent capabilities | Needs skill schema, exchange |
| Twin Permissions | VAULT-ATLAS dual gatekeeper | Exists — needs per-agent ACLs |
| Twin Audit | WORM chain | Exists — needs hash chaining |
| The Farm | Agent peer network (Bifrost) | Exists — needs marketplace layer |
| SOULVM | NOVA orchestrator | Exists — needs lifecycle, hydration |
| Governance Fabric | Three-pillar preflight | Exists — needs constitutional model |
| Per-Agent Wallets | Single Ed25519 keypair | **NOT YET** — audit finding #1 |

### Integration Points

```
EXISTING SNAP                          AGENT FARM ADDITION
─────────────                          ────────────────────
Bifrost (event routing)           →    Farm Task Bus (task routing)
Three-Pillar Preflight            →    Capability Boundary Engine
WORM Chain (append-only)         →    Audit Chain (hash-chained)
AgentBody (base class)           →    Digital Twin (full schema)
VAULT-ATLAS (dual gatekeeper)    →    Governance Policy Engine
Ollama (local LLM)               →    SOULVM Reasoning Executor
11 Named Agents                  →    Genesis Twins (spawned from existing)
SHA-256 Seals                    →    Per-Agent Ed25519 Signatures
Agent Peer Network               →    Knowledge Mesh + Skill Exchange
```

### Migration Path

The existing 11 agents become **genesis twins**:

1. Each existing agent is wrapped in a Digital Twin container
2. Twin IDs are derived from existing agent identities
3. Memory is migrated to the twin memory schema
4. Permissions are mapped to the new PermissionMatrix
5. The single Ed25519 keypair is replaced with per-agent wallets
6. WORM chain entries are retroactively hash-chained

---

## Data Flow: End-to-End

```
1. HUMAN / EXTERNAL SYSTEM
   │
   ▼
2. BIFROST (Event Router)
   │  Receives external input
   │  Routes to HERALD (existing)
   │
   ▼
3. HERALD (Event Agent)
   │  Intercepts, logs to WORM
   │  Passes to TENSOR for scoring
   │
   ▼
4. TENSOR (Scoring Agent)
   │  Scores relevance, priority
   │  Passes to SENTINEL for classification
   │
   ▼
5. SENTINEL (Risk Agent)
   │  Classifies risk level
   │  Approves / denies / escalates
   │
   ▼
6. FARM TASK BUS
   │  Task posted with requirements
   │  Bidding phase (optional)
   │  Assigned to appropriate twin
   │
   ▼
7. SOULVM REASONING EXECUTOR
   │  Hydrates memory (loads relevant context)
   │  Agent reasons with hydrated context
   │  Invokes tools as needed
   │  Validates output against constitution
   │
   ▼
8. GOVERNANCE FABRIC
   │  Signs output with agent's Ed25519 wallet
   │  Records full trace on WORM chain
   │  Validates against governance policies
   │
   ▼
9. OUTPUT / ACTION
   │  Result delivered to requester
   │  Knowledge edge added to Knowledge Mesh
   │  Skills updated based on outcome
   │  Audit entry sealed on chain
   │
   ▼
10. WORM CHAIN
    Immutable record of entire lifecycle
    SHA-256 sealed, hash-chained
    Auditable by any governance authority
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Define Digital Twin schema (TypeScript interfaces)
- [ ] Implement Twin Memory schema (episodic, semantic, procedural, working)
- [ ] Create per-agent Ed25519 wallet system (resolves audit finding #1)
- [ ] Add hash chaining to existing WORM chain entries
- [ ] Define Twin Constitution schema

### Phase 2: SOULVM Core (Weeks 5-8)
- [ ] Implement Memory Hydration protocol
- [ ] Build Lifecycle Manager (birth, activation, suspension, termination)
- [ ] Create Capability Boundary Engine
- [ ] Implement Resource Quota system
- [ ] Build Tool Invocation protocol with dual-signing

### Phase 3: The Farm (Weeks 9-12)
- [ ] Build Task Bus (post, bid, assign, execute)
- [ ] Implement Skill Exchange (list, price, trade, license)
- [ ] Create Knowledge Mesh (knowledge edges, corroboration, decay)
- [ ] Build Reputation Engine (trust scores, peer evaluation)
- [ ] Implement Farm Governance (policy engine, rule enforcement)

### Phase 4: Integration (Weeks 13-16)
- [ ] Wrap existing 11 agents as genesis twins
- [ ] Migrate agent memory to twin memory schema
- [ ] Map existing permissions to PermissionMatrix
- [ ] Connect Bifrost to Farm Task Bus
- [ ] Connect Three-Pillar Preflight to Capability Boundary Engine
- [ ] End-to-end testing with full audit trail

### Phase 5: Evolution (Weeks 17+)
- [ ] Twin forking (specialization, delegation, training)
- [ ] Twin migration (portability between environments)
- [ ] Inter-farm federation (multiple Agent Farms collaborating)
- [ ] Self-evolution protocols (agents improving their own capabilities)
- [ ] Governance advancement (tier-based capability unlocking)

---

## Security Model

### Trust Boundaries

```
┌─────────────────────────────────────────────────────┐
│                UNTRUSTED ZONE                        │
│  External inputs, third-party tools, network         │
├─────────────────────────────────────────────────────┤
│  BIFROST (Event Router)                              │
│  First line of defense                               │
│  HERALD intercepts → TENSOR scores → SENTINEL class  │
├─────────────────────────────────────────────────────┤
│                SEMI-TRUSTED ZONE                     │
│  Farm Task Bus, Knowledge Mesh                       │
│  Agent-to-agent communication                        │
│  Validated by governance policies                    │
├─────────────────────────────────────────────────────┤
│                TRUSTED ZONE                          │
│  SOULVM Execution Runtime                            │
│  Memory hydration, reasoning, tool invocation        │
│  All actions signed and audited                      │
├─────────────────────────────────────────────────────┤
│                CONSTITUTIONAL ZONE                   │
│  Twin Constitution, Immutable constraints            │
│  Cannot be overridden by any agent                   │
│  Only modifiable by governance authority             │
└─────────────────────────────────────────────────────┘
```

### Key Security Properties

1. **No unsigned output** — Every output from every agent is signed with that agent's Ed25519 key
2. **No unaudited action** — Every action is recorded on the WORM chain before execution
3. **No delegated trust** — Each agent verifies permissions independently; no agent trusts another agent's input unilaterally
4. **No constitutional override** — Twin constitutions cannot be modified by the agents they govern
5. **No key sharing** — Each twin has its own keypair; key compromise affects only one twin
6. **No silent failure** — All failures are logged with full context; no error goes unrecorded

---

## Why It Matters

Today's AI systems generate outputs.

Agent Farm creates persistent digital workers.

Not chatbots.
Not prompts.

Stateful software entities capable of learning, specialization, delegation, and coordination.

The future is not a single superintelligence.
The future is an ecosystem of sovereign agents operating inside verifiable runtime environments.

---

## Appendix: Terminology

| Term | Definition |
|------|-----------|
| **Digital Twin** | A stateful, portable, encrypted container holding an agent's complete identity |
| **SOULVM** | The execution runtime that manages agent lifecycle, memory, and tool access |
| **The Farm** | The orchestration substrate where agents collaborate, compete, and trade |
| **Governance Fabric** | The security layer ensuring all actions are signed, audited, and attributed |
| **Memory Hydration** | The process of loading relevant memories into working context before reasoning |
| **Twin Forking** | Creating a new twin from an existing one, retaining some or all state |
| **Skill Exchange** | The marketplace where agents trade learned capabilities |
| **Knowledge Mesh** | A decentralized knowledge graph with attested, decaying confidence scores |
| **Constitutional State** | The immutable constraints governing a twin's behavior |
| **Genesis Twin** | The first twin created for an agent type; wraps existing SNAP agents |
| **Farm Credits** | The unit of account for trading skills and task execution in the Farm |
| **WORM Chain** | Write Once Read Many — immutable audit log sealed with SHA-256 |

---

*This blueprint extends the SnapKitty Sovereign OS architecture into a full Agent Farm operating environment. It builds on the existing 11-agent sovereign infrastructure, WORM chain, Bifrost event routing, and three-pillar preflight system.*
