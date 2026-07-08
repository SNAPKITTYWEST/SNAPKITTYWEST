#!/usr/bin/env python3
"""
NATS Bridge — AXIOM Agent Communication via NATS JetStream

Provides at-least-once delivery, replay, and WORM sealing
for inter-agent proof communication.
"""

import asyncio
import hashlib
import json
import time
from dataclasses import dataclass, field
from typing import Callable, Optional

# ── WORM Chain (shared with constitutional_boot.py) ──────────────────────────

class WORMChain:
    """Append-only SHA-256 chained ledger."""
    
    def __init__(self):
        self.chain: list[dict] = []
    
    def seal(self, label: str, payload: dict) -> str:
        prev = self.chain[-1]["seal"] if self.chain else "0" * 64
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        raw = json.dumps({"label": label, "payload": payload, "ts": ts, "prev": prev})
        seal = hashlib.sha256(raw.encode()).hexdigest()
        self.chain.append({"label": label, "payload": payload, "ts": ts, "prev": prev, "seal": seal})
        return seal
    
    def valid(self) -> bool:
        return all(
            self.chain[i]["seal"] == self.chain[i + 1]["prev"]
            for i in range(len(self.chain) - 1)
        )


# ── NATS Bridge ──────────────────────────────────────────────────────────────

@dataclass
class AXIOMNATSBridge:
    """AXIOM agent communication via NATS JetStream."""
    
    nats_url: str = "nats://localhost:4222"
    nc: object = field(default=None, repr=False)
    js: object = field(default=None, repr=False)
    worm: WORMChain = field(default_factory=WORMChain)
    connected: bool = False
    
    async def connect(self):
        """Connect to NATS server and initialize JetStream."""
        try:
            import nats
            self.nc = await nats.connect(self.nats_url)
            self.js = self.nc.jetstream()
            self.connected = True
            print(f"  ✓ NATS connected: {self.nats_url}")
        except ImportError:
            print("  ⚠ nats-py not installed — running in offline mode")
            self.connected = False
        except Exception as e:
            print(f"  ⚠ NATS connection failed: {e} — running in offline mode")
            self.connected = False
    
    async def disconnect(self):
        """Disconnect from NATS server."""
        if self.nc and self.connected:
            await self.nc.close()
            self.connected = False
            print("  ✓ NATS disconnected")
    
    async def publish_proof(self, theorem_name: str, proof_term: str, agent: str = "UNKNOWN") -> dict:
        """Publish proof to JetStream with at-least-once delivery."""
        message = {
            "theorem": theorem_name,
            "proof": proof_term,
            "agent": agent,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "proof_hash": hashlib.sha256(proof_term.encode()).hexdigest(),
        }
        
        # Seal to WORM
        seal = self.worm.seal("PROOF_PUBLISH", message)
        message["worm_seal"] = seal
        
        if self.connected and self.js:
            try:
                await self.js.publish(
                    "axiom.proofs",
                    json.dumps(message).encode()
                )
                print(f"  ✓ Published: {theorem_name} (seal: {seal[:16]}...)")
            except Exception as e:
                print(f"  ⚠ Publish failed: {e}")
        else:
            print(f"  ⚠ Offline — logged: {theorem_name} (seal: {seal[:16]}...)")
        
        return message
    
    async def publish_audit(self, event: str, payload: dict) -> dict:
        """Publish audit event to Bifrost chain."""
        envelope = {
            "event": event,
            "payload": payload,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        
        seal = self.worm.seal("AUDIT_PUBLISH", envelope)
        envelope["worm_seal"] = seal
        
        if self.connected and self.js:
            try:
                await self.js.publish(
                    "sovereign.audit.bifrost.commit.v1",
                    json.dumps(envelope).encode()
                )
                print(f"  ✓ Audit: {event} (seal: {seal[:16]}...)")
            except Exception as e:
                print(f"  ⚠ Audit publish failed: {e}")
        else:
            print(f"  ⚠ Offline — logged audit: {event}")
        
        return envelope
    
    async def subscribe_proofs(self, callback: Callable):
        """Subscribe to proof events with durable consumer."""
        if not self.connected or not self.js:
            print("  ⚠ Cannot subscribe — not connected")
            return
        
        try:
            await self.js.subscribe(
                "axiom.proofs",
                "axiom-consumer",
                cb=callback,
                durable="axiom-durable",
            )
            print("  ✓ Subscribed to axiom.proofs")
        except Exception as e:
            print(f"  ⚠ Subscribe failed: {e}")
    
    async def handle_proof(self, msg):
        """Handle incoming proof with WORM sealing and acknowledgment."""
        try:
            proof = json.loads(msg.data.decode())
            
            # Seal received proof to WORM
            self.worm.seal("PROOF_RECEIVED", proof)
            
            # Process proof
            print(f"  ← Received: {proof.get('theorem', 'unknown')}")
            
            # Acknowledge
            await msg.ack()
            
        except Exception as e:
            print(f"  ✗ Handle failed: {e}")
            await msg.nak()
    
    def chain_status(self) -> dict:
        """Return WORM chain status."""
        return {
            "entries": len(self.worm.chain),
            "valid": self.worm.valid(),
            "connected": self.connected,
        }


# ── Main ─────────────────────────────────────────────────────────────────────

async def main():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  AXIOM NATS BRIDGE                                       ║")
    print("║  JetStream Communication with WORM Sealing               ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()
    
    bridge = AXIOMNATSBridge()
    
    print("▶ Connecting...")
    await bridge.connect()
    
    print()
    print("▶ Publishing proofs...")
    await bridge.publish_proof("collatz_27", "27 → 82 → 41 → ... → 1", "BOB")
    await bridge.publish_proof("pythagorean", "a² + b² = c²", "METATRON")
    
    print()
    print("▶ Publishing audit events...")
    await bridge.publish_audit("SEAL_COMMIT", {
        "agent": "BOB",
        "claim": "collatz_27 reaches 1",
    })
    
    print()
    print("▶ Chain status:")
    status = bridge.chain_status()
    print(f"  Entries: {status['entries']}")
    print(f"  Valid:   {status['valid']}")
    print(f"  NATS:    {'connected' if status['connected'] else 'offline'}")
    
    await bridge.disconnect()
    
    print()
    print("The cage holds.")


if __name__ == "__main__":
    asyncio.run(main())
