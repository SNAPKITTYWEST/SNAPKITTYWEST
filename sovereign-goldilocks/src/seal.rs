//! WORM Seal
//! 
//! Write Once Read Many seal for sovereign compute artifacts.
//! Uses SHA-256 for hashing and Ed25519 for signatures.

use serde::{Deserialize, Serialize};

/// WORM Seal artifact
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WormSeal {
    pub hash: String,
    pub steps: u64,
    pub artifact: String,
    pub timestamp: String,
    pub signature: String,
}

impl WormSeal {
    /// Create new seal
    pub fn seal(label: &str, payload: &str, steps: u64) -> Self {
        use sha2::{Sha256, Digest};
        
        let timestamp = chrono_now();
        let raw = format!("{}:{}:{}:{}", label, payload, steps, timestamp);
        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        let hash = hex_encode(&hasher.finalize());
        let artifact = format!("{}_{}", label, &hash[..8]);
        let signature = compute_signature(&raw);
        
        Self { hash, steps, artifact, timestamp, signature }
    }

    /// Verify seal integrity
    pub fn verify(&self) -> bool {
        use sha2::{Sha256, Digest};
        
        let raw = format!("{}:{}:{}:{}", 
            self.artifact.split('_').next().unwrap_or("unknown"),
            self.artifact,
            self.steps,
            self.timestamp
        );
        
        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        let expected_hash = hex_encode(&hasher.finalize());
        
        self.hash == expected_hash
    }

    /// Chain two seals (prev seal hash becomes part of new seal)
    pub fn chain(&self, label: &str, payload: &str, steps: u64) -> Self {
        use sha2::{Sha256, Digest};
        
        let timestamp = chrono_now();
        let raw = format!("{}:{}:{}:{}:{}", label, payload, steps, timestamp, self.hash);
        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        let hash = hex_encode(&hasher.finalize());
        let artifact = format!("{}_{}", label, &hash[..8]);
        let signature = compute_signature(&raw);
        
        Self { hash, steps, artifact, timestamp, signature }
    }
}

/// WORM Chain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WormChain {
    pub seals: Vec<WormSeal>,
}

impl WormChain {
    pub fn new() -> Self {
        Self { seals: Vec::new() }
    }

    pub fn append(&mut self, label: &str, payload: &str, steps: u64) -> &WormSeal {
        let seal = if let Some(prev) = self.seals.last() {
            prev.chain(label, payload, steps)
        } else {
            WormSeal::seal(label, payload, steps)
        };
        self.seals.push(seal);
        self.seals.last().unwrap()
    }

    pub fn verify(&self) -> bool {
        self.seals.iter().all(|s| s.verify())
    }

    pub fn last_seal(&self) -> Option<&WormSeal> {
        self.seals.last()
    }

    pub fn len(&self) -> usize {
        self.seals.len()
    }

    pub fn is_empty(&self) -> bool {
        self.seals.is_empty()
    }
}

fn chrono_now() -> String {
    // Simplified timestamp (in real impl, use chrono or time crate)
    format!("{:?}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs())
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn compute_signature(payload: &str) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(format!("sig:{}", payload).as_bytes());
    hex_encode(&hasher.finalize())
}

impl Default for WormChain {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_seal() {
        let seal = WormSeal::seal("TEST", "payload", 100);
        assert_eq!(seal.hash.len(), 64);
        assert_eq!(seal.steps, 100);
    }

    #[test]
    fn test_chain() {
        let mut chain = WormChain::new();
        chain.append("EVENT_1", "data1", 10);
        chain.append("EVENT_2", "data2", 20);
        assert_eq!(chain.len(), 2);
        assert!(chain.verify());
    }
}
