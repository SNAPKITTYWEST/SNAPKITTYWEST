# QWEN SKILLS PACKET 11: NATS JETSTREAM MESSAGE BUS
## Sovereign Pub/Sub Fabric for Agent Communication
**Compiled:** 2026-07-08  
**Source:** magmad/src/nats_bus.rs  
**Purpose:** At-least-once delivery, replay, sequence sealing for AXIOM agents

---

## OVERVIEW

The NATS bus provides **asynchronous message passing** between sovereign agents using the NATS messaging system. Messages follow a subject hierarchy:

```
sovereign.<layer>.<verb>.<version>
```

**Key Innovation:** Every message is sealed to the WORM chain, providing at-least-once delivery with cryptographic audit trail.

---

## SKILL STACK 66: NATS CORE OPERATIONS

### 66.1 NatsBus Structure
**Source:** nats_bus.rs, lines 14-18

```rust
#[derive(Clone)]
pub struct NatsBus {
    client: Client,
}
```

**Properties:**
- **Cloneable:** Arc inside async-nats client
- **Async:** All operations are non-blocking
- **Type-safe:** Payloads must implement `Serialize`

### 66.2 Connect

```rust
pub async fn connect(url: &str) -> Result<Self> {
    let client = async_nats::connect(url).await?;
    info!("NATS connected: {}", url);
    Ok(Self { client })
}
```

**Usage:**
```rust
let bus = NatsBus::connect("nats://localhost:4222").await?;
```

### 66.3 Publish

```rust
pub async fn publish<T: Serialize>(&self, subject: &str, payload: &T) -> Result<()> {
    let bytes = serde_json::to_vec(payload)?;
    self.client
        .publish(subject.to_owned(), bytes.into())
        .await?;
    Ok(())
}
```

**Usage:**
```rust
#[derive(Serialize)]
struct ProofEvent {
    theorem: String,
    proof_hash: String,
    agent: String,
}

let event = ProofEvent {
    theorem: "collatz_27".to_string(),
    proof_hash: "abc123...".to_string(),
    agent: "BOB".to_string(),
};

bus.publish("sovereign.proof.publish.v1", &event).await?;
```

### 66.4 Publish String

```rust
pub async fn publish_str(&self, subject: &str, payload: &str) -> Result<()> {
    self.client
        .publish(subject.to_owned(), payload.as_bytes().to_vec().into())
        .await?;
    Ok(())
}
```

### 66.5 Subscribe

```rust
pub async fn subscribe(&self, subject: &str) -> Result<async_nats::Subscriber> {
    Ok(self.client.subscribe(subject.to_owned()).await?)
}
```

**Usage:**
```rust
let mut sub = bus.subscribe("sovereign.proof.>").await?;

while let Some(msg) = sub.next().await {
    let event: ProofEvent = serde_json::from_slice(&msg.payload)?;
    println!("Received proof: {}", event.theorem);
}
```

---

## SKILL STACK 67: AUDIT EVENTS

### 67.1 Sovereign Audit Publishing

```rust
pub async fn audit<T: Serialize>(&self, event: &str, payload: &T) -> Result<()> {
    #[derive(Serialize)]
    struct AuditEnvelope<'a, T> {
        event:     &'a str,
        payload:   &'a T,
        timestamp: String,
    }
    let envelope = AuditEnvelope {
        event,
        payload,
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    self.publish("sovereign.audit.bifrost.commit.v1", &envelope).await
}
```

**Usage:**
```rust
#[derive(Serialize)]
struct SealEvent {
    seal: String,
    agent: String,
    claim: String,
}

let seal = SealEvent {
    seal: "abc123...".to_string(),
    agent: "METATRON".to_string(),
    claim: "INTERCOL(D_i, D_j) = 0 → ⊥".to_string(),
};

bus.audit("SEAL_COMMIT", &seal).await?;
```

**Subject:** `sovereign.audit.bifrost.commit.v1`

**Envelope:**
```json
{
  "event": "SEAL_COMMIT",
  "payload": {
    "seal": "abc123...",
    "agent": "METATRON",
    "claim": "INTERCOL(D_i, D_j) = 0 → ⊥"
  },
  "timestamp": "2026-07-08T12:34:56.789Z"
}
```

---

## SKILL STACK 68: SUBJECT HIERARCHY

### 68.1 Sovereign Subject Pattern

```
sovereign.<layer>.<verb>.<version>
```

**Layers:**
- `forge` — Code generation
- `cipher` — Cryptographic operations
- `audit` — Bifrost audit chain
- `proof` — Theorem proving
- `agent` — Agent lifecycle

**Verbs:**
- `build` — Create artifact
- `seal` — Cryptographic seal
- `commit` — Append to chain
- `publish` — Broadcast event
- `verify` — Check integrity

**Versions:**
- `v1` — Current version

### 68.2 Example Subjects

```
sovereign.forge.build.v1          # Code generation events
sovereign.cipher.seal.v1          # Cryptographic sealing
sovereign.audit.bifrost.commit.v1 # Audit chain commits
sovereign.proof.publish.v1        # Theorem proofs
sovereign.agent.boot.v1           # Agent cold boot
sovereign.agent.task.v1           # Agent task execution
```

### 68.3 Wildcard Subscriptions

```rust
// Subscribe to all proof events
let sub = bus.subscribe("sovereign.proof.>").await?;

// Subscribe to all audit events
let sub = bus.subscribe("sovereign.audit.>").await?;

// Subscribe to all sovereign events
let sub = bus.subscribe("sovereign.>").await?;
```

---

## SKILL STACK 69: OFFLINE STUB

### 69.1 Graceful Degradation

```rust
pub async fn publish_offline(subject: &str, payload: &str) {
    warn!("NATS offline — dropped: {} → {}", subject, &payload[..payload.len().min(80)]);
}
```

**Purpose:** When NATS is unavailable, log the publish attempt and continue. No blocking, no crash.

**Usage:**
```rust
match bus.publish("sovereign.proof.publish.v1", &event).await {
    Ok(_) => info!("Published"),
    Err(_) => publish_offline("sovereign.proof.publish.v1", &payload_str).await,
}
```

---

## SKILL STACK 70: JETSTREAM (AT-LEAST-ONCE)

### 70.1 JetStream Integration

NATS JetStream provides **persistent messaging** with at-least-once delivery:

```python
import nats

class AXIOMNATSBridge:
    def __init__(self, nats_url="nats://localhost:4222"):
        self.nats_url = nats_url
        self.nc = None
        self.js = None
    
    async def connect(self):
        self.nc = await nats.connect(self.nats_url)
        self.js = self.nc.jetstream()
    
    async def publish_proof(self, theorem_name, proof_term):
        """Publish proof to JetStream with at-least-once delivery."""
        await self.js.publish(
            "axiom.proofs",
            json.dumps({
                "theorem": theorem_name,
                "proof": proof_term,
                "timestamp": datetime.utcnow().isoformat()
            }).encode()
        )
    
    async def subscribe_proofs(self, callback):
        """Subscribe to proofs with durable consumer."""
        await self.js.subscribe(
            "axiom.proofs",
            "axiom-consumer",
            cb=callback,
            durable="axiom-durable"
        )
    
    async def replay(self, start_sequence=1):
        """Replay messages from sequence number."""
        sub = await self.js.subscribe(
            "axiom.proofs",
            deliver_policy=nats.js.api.DeliverPolicy.BY_START_SEQUENCE,
            opt_start_seq=start_sequence
        )
        return sub
```

### 70.2 At-Least-Once Delivery

**Guarantees:**
- Messages are persisted to disk
- Acknowledgment required for delivery
- Unacknowledged messages are redelivered
- Duplicate detection via message ID

**Usage:**
```python
async def handle_proof(msg):
    """Handle incoming proof with acknowledgment."""
    try:
        proof = json.loads(msg.data.decode())
        # Process proof
        await verify_in_axiom(proof["theorem"], proof["proof"])
        # Acknowledge
        await msg.ack()
    except Exception as e:
        # Negative acknowledgment — redeliver
        await msg.nak()
```

### 70.3 Replay Mechanism

```python
# Replay from sequence 100
sub = await bridge.replay(start_sequence=100)

async for msg in sub.messages:
    proof = json.loads(msg.data.decode())
    print(f"Replaying: {proof['theorem']}")
```

---

## INTEGRATION WITH AXIOM

### How to Use NATS in AXIOM Workflow

1. **Connect to NATS**
   ```python
   bridge = AXIOMNATSBridge()
   await bridge.connect()
   ```

2. **Publish proof**
   ```python
   await bridge.publish_proof("collatz_27", proof_term)
   ```

3. **Subscribe to proofs**
   ```python
   await bridge.subscribe_proofs(handle_proof)
   ```

4. **Seal to WORM**
   ```python
   async def handle_proof(msg):
       proof = json.loads(msg.data.decode())
       worm.seal("PROOF_RECEIVED", proof)
       await msg.ack()
   ```

### Integration Architecture

```
AXIOM Agent 1                    AXIOM Agent 2
     │                                │
     ▼                                ▼
  NATS Bus  ◄──── pub/sub ────►  NATS Bus
     │                                │
     ▼                                ▼
  WORM Chain                      WORM Chain
```

---

## PRACTICE PROBLEMS

### Problem 1: Publish Proof
**Task:** Publish a proof event to NATS.

**Solution:**
```python
bridge = AXIOMNATSBridge()
await bridge.connect()
await bridge.publish_proof("pythagorean", "a² + b² = c²")
```

### Problem 2: Subscribe to Proofs
**Task:** Subscribe to all proof events and print them.

**Solution:**
```python
async def handle(msg):
    proof = json.loads(msg.data.decode())
    print(f"Theorem: {proof['theorem']}")
    await msg.ack()

await bridge.subscribe_proofs(handle)
```

### Problem 3: Audit Event
**Task:** Publish an audit event to the Bifrost chain.

**Solution:**
```rust
bus.audit("SEAL_COMMIT", &seal_event).await?;
// Subject: sovereign.audit.bifrost.commit.v1
```

### Problem 4: Replay Messages
**Task:** Replay all messages from sequence 50.

**Solution:**
```python
sub = await bridge.replay(start_sequence=50)
async for msg in sub.messages:
    process(msg)
```

### Problem 5: Offline Fallback
**Task:** Handle NATS being offline gracefully.

**Solution:**
```rust
match bus.publish(subject, &payload).await {
    Ok(_) => info!("Published"),
    Err(_) => publish_offline(subject, &payload_str).await,
}
```

---

## REFERENCES

### Source Files
- `magmad/src/nats_bus.rs` — Rust NATS client wrapper (67 lines)

### Documentation
- NATS Documentation: https://docs.nats.io/
- JetStream: https://docs.nats.io/nats-concepts/jetstream
- async-nats crate: https://crates.io/crates/async-nats

### Related Packets
- Packet 9 (Orchestration): WORM chain integration
- Packet 10 (Constitution): Agent lifecycle events
- Packet 7 (Exo-Synchronicity): WORM receipt chain

---

*Compiled from magmad (SNAPKITTYWEST)*  
*Ahmad Ali Parr · SnapKitty Collective · 2026*  
*NATS pub/sub · At-least-once · WORM-anchored · sovereign.<layer>.<verb>.<version>*
