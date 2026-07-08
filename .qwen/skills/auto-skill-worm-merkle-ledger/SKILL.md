---
name: worm-merkle-ledger
description: Build append-only WORM ledger with SHA-256 sealing and Merkle tree audit trail in Rust
source: auto-skill
extracted_at: '2026-07-08T06:37:51.363Z'
---

# WORM Ledger with Merkle Tree

## Context
Building an immutable, tamper-evident audit trail for computational results (proofs, trajectories, solutions). Used in both the Collatz verification engine and AXIOM proof assistant.

## Architecture

```
Append-only JSONL ledger  ←  SHA-256 seal per entry  ←  Merkle tree root
     (collatz_worm.jsonl)      (each entry sealed)       (tamper-evident)
```

## Core Pattern (Rust)

```rust
use sha2::{Sha256, Digest};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct LedgerEntry {
    pub name: String,
    pub data_hash: String,      // SHA-256 of the actual data
    pub seal: String,           // SHA-256 of name + data_hash
    pub timestamp: u64,
    pub merkle_proof: String,   // Truncated Merkle root
}

pub struct WormLedger {
    entries: Vec<LedgerEntry>,
    path: String,
}

impl WormLedger {
    pub fn new(path: &str) -> Self { /* load existing if present */ }

    pub fn seal(&mut self, name: &str, data: &str) -> LedgerEntry {
        let data_hash = Self::hash(data);
        let seal = Self::hash(&format!("{}:{}", name, data_hash));
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

        let entry = LedgerEntry {
            name: name.into(), data_hash, seal, timestamp,
            merkle_proof: String::new(),
        };

        self.entries.push(entry);
        let root = self.compute_merkle_root();
        let idx = self.entries.len() - 1;
        self.entries[idx].merkle_proof = root[..32].to_string();
        self.append_to_file(&self.entries[idx]);
        self.entries[idx].clone()
    }

    fn hash(data: &str) -> String {
        let mut h = Sha256::new();
        h.update(data.as_bytes());
        format!("{:x}", h.finalize())
    }

    fn compute_merkle_root(&self) -> String {
        if self.entries.is_empty() { return "0".repeat(64); }

        let mut hashes: Vec<String> = self.entries.iter()
            .map(|e| Self::hash(&format!("{}:{}:{}", e.name, e.data_hash, e.seal)))
            .collect();

        while hashes.len() > 1 {
            let mut next = Vec::new();
            for chunk in hashes.chunks(2) {
                let combined = if chunk.len() == 2 {
                    format!("{}{}", chunk[0], chunk[1])
                } else {
                    format!("{}{}", chunk[0], chunk[0])  // Duplicate last if odd
                };
                next.push(Self::hash(&combined));
            }
            hashes = next;
        }
        hashes[0].clone()
    }

    fn append_to_file(&self, entry: &LedgerEntry) {
        use std::fs;
        use std::io::Write;
        let mut file = fs::OpenOptions::new()
            .create(true).append(true)
            .open(&self.path).unwrap();
        writeln!(file, "{}", serde_json::to_string(entry).unwrap()).unwrap();
    }

    pub fn verify(&self, name: &str, data: &str) -> bool {
        let data_hash = Self::hash(data);
        self.entries.iter().any(|e| e.name == name && e.data_hash == data_hash)
    }
}
```

## Key Design Decisions

1. **JSONL format** — One JSON object per line, append-only. Easy to tail, grep, stream.
2. **Seal = hash(name + data_hash)** — Binds the entry name to its content hash.
3. **Merkle tree recomputed on each seal** — Root changes with every new entry, providing a monotonically evolving commitment.
4. **Odd-leaf duplication** — When a level has odd count, duplicate the last hash (standard Merkle pattern).
5. **Truncated merkle_proof** — Store first 32 chars of root in each entry for quick cross-reference.

## File Layout

```
ledger/
├── collatz_worm.jsonl    # Append-only entries (one JSON per line)
└── merkle_root.txt       # Current root hash (64 hex chars)
```

## Usage Patterns

### Seal a computation result
```rust
let mut db = WormLedger::new("ledger/results.jsonl");
let entry = db.seal("theorem_add_comm", "∀ n m, n + m = m + n");
println!("Seal: {}", entry.seal);
println!("Merkle root: {}", db.merkle_root());
```

### Verify an entry
```rust
assert!(db.verify("theorem_add_comm", "∀ n m, n + m = m + n"));
assert!(!db.verify("theorem_add_comm", "tampered data"));
```

### Proof certificate (for external verification)
```rust
pub struct ProofCertificate {
    pub name: String,
    pub data_hash: String,
    pub seal: String,
    pub merkle_root: String,
    pub timestamp: u64,
}
```

## Integration with .agentos

When used inside snapkitty-agentos:
- Ledger files go in project-specific subdirectories (not `.agentos/gitbucket/`)
- Merkle roots can be cross-referenced with GitBucket seals
- WORM entries complement the GitBucket memory system

## When to Use

- Computational search results (Collatz trajectories, TSP solutions)
- Proof assistant theorems (AXIOM sealed proofs)
- P/NP swarm solutions
- Any append-only audit trail requiring tamper evidence

## When NOT to Use

- When you need mutable state (use a database)
- When entries need to reference each other (use a graph)
- When you need real-time queries over the data (use an index)

---

## GitBucket v2 Seal Script (Node.js)

When integrating with the `.agentos/gitbucket/` memory system, use a Node.js `.mjs` seal script that writes GitBucket v2 memory buckets + Ed25519-compatible seals.

### Pattern

```javascript
// seal.mjs — Seal modules to GitBucket v2 WORM ledger
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTOS_ROOT = join(__dirname, '..', '.agentos');
const BUCKETS_DIR = join(AGENTOS_ROOT, 'gitbucket', 'buckets');
const SEALS_DIR = join(AGENTOS_ROOT, 'gitbucket', 'seals');
const MANIFEST_PATH = join(AGENTOS_ROOT, 'gitbucket', 'index', 'manifest.json');

const modules = [
  { id: 'module_name', name: 'Module Display Name', files: ['src/file.rs'] },
  // ... more modules
];

function hashFile(filePath) {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function sealModule(mod, previousSeal) {
  const fileHashes = mod.files
    .filter(f => existsSync(join(__dirname, f)))
    .map(f => hashFile(join(__dirname, f)));

  const payloadHash = createHash('sha256')
    .update(fileHashes.join(':'))
    .digest('hex');

  const bucketId = `mem_${mod.id}`;

  // GitBucket v2 memory bucket
  const bucket = {
    schema: 'memory-bucket-v2',
    id: bucketId,
    gitHash: 'current',
    type: 'skill',
    summary: `Skill: ${mod.name}`,
    files: mod.files,
    entities: ['project-name', mod.id],
    topics: ['skill', mod.id],
    dependencies: [],
    problems: [],
    extractedAt: new Date().toISOString(),
  };

  // Seal: SHA-256 of bucket content, chained to previous seal
  const sealPayload = `MEMORY_BUCKET:${JSON.stringify(bucket)}`;
  const sealHash = createHash('sha256').update(sealPayload).digest('hex');

  const seal = {
    kind: 'MEMORY_BUCKET',
    payloadHash,
    previous: previousSeal,  // Chain link (genesis = '0'.repeat(64))
    seal: sealHash,
    sealedAt: new Date().toISOString(),
  };

  // Write bucket and seal files
  mkdirSync(BUCKETS_DIR, { recursive: true });
  mkdirSync(SEALS_DIR, { recursive: true });
  writeFileSync(join(BUCKETS_DIR, `${bucketId}.json`), JSON.stringify(bucket, null, 2));
  writeFileSync(join(SEALS_DIR, `${bucketId}.seal.json`), JSON.stringify(seal, null, 2));

  return { bucketId, sealHash, payloadHash, fileCount: fileHashes.length };
}

function updateManifest(newBucketIds) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    manifest = { schema: 'gitbucket-v2', buckets: [], indexes: [], initializedAt: new Date().toISOString() };
  }
  for (const id of newBucketIds) {
    if (!manifest.buckets.includes(id)) manifest.buckets.push(id);
  }
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function computeMerkleRoot(seals) {
  let hashes = seals.map(s => s.sealHash);
  while (hashes.length > 1) {
    const next = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;  // Duplicate last if odd
      next.push(createHash('sha256').update(left + right).digest('hex'));
    }
    hashes = next;
  }
  return hashes[0];
}

// --- Main ---
let previousSeal = '0'.repeat(64);  // Genesis
const results = [];

for (const mod of modules) {
  const result = sealModule(mod, previousSeal);
  results.push(result);
  previousSeal = result.sealHash;
  console.log(`  ✓ ${mod.name} → ${result.bucketId} (${result.fileCount} files)`);
}

const merkleRoot = computeMerkleRoot(results);
updateManifest(results.map(r => r.bucketId));

console.log(`  Merkle root: ${merkleRoot}`);
console.log(`  Chain: genesis → ${results.map(r => r.bucketId).join(' → ')}`);
```

### Key Differences from Rust WORM Ledger

| Aspect | Rust Ledger | GitBucket v2 Seal Script |
|--------|-------------|--------------------------|
| **Format** | JSONL (one entry per line) | Individual JSON files per bucket |
| **Location** | Project-specific `ledger/` dir | `.agentos/gitbucket/buckets/` + `seals/` |
| **Schema** | Custom `LedgerEntry` | `memory-bucket-v2` (standardized) |
| **Chain** | Each entry has `seal` hash | Each seal has `previous` hash (linked list) |
| **Manifest** | None | `index/manifest.json` tracks all bucket IDs |
| **Use case** | Computational results audit | Skill/module sealing for Agent OS |

### When to Use GitBucket v2 Seal Script

- Sealing skills/modules into the Agent OS memory system
- When you need standardized `memory-bucket-v2` format
- When integrating with `.agentos/gitbucket/` infrastructure
- When manifests need to track all sealed buckets

### When to Use Rust WORM Ledger

- Standalone computational result auditing
- When you don't need Agent OS integration
- When JSONL streaming is preferred
- When you need the `verify()` method for quick lookups
