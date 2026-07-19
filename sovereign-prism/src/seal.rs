//! WORM Seal: Write-Once-Read-Many Cryptographic Witnesses
//! Seals are immutable once created and can be verified by anyone

use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};

/// WORM Seal structure
/// Write-once: Seal cannot be modified after creation
/// Read-many: Seal can be verified by anyone
/// Timestamped: Unix timestamp for temporal ordering
/// Content-addressed: Hash of label + payload + timestamp
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WormSeal {
    pub label: String,
    pub payload: String,
    pub steps: u64,
    pub timestamp: u64,
    pub seal_hash: String,
    pub artifact: String,
}

impl WormSeal {
    /// Generate a new WORM seal
    /// Format: WORM:<label>:<payload>:<steps>:<timestamp>
    pub fn seal(label: &str, payload: &str, steps: u64) -> Self {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let content = format!("WORM:{}:{}:{}:{}", label, payload, steps, timestamp);
        let seal_hash = format!("{:x}", Sha256::digest(content.as_bytes()));
        let artifact = format!("{}_{}", label, &seal_hash[..8]);

        Self {
            label: label.to_string(),
            payload: payload.to_string(),
            steps,
            timestamp,
            seal_hash,
            artifact,
        }
    }

    /// Verify seal integrity
    /// Recompute seal_hash and compare to stored value
    pub fn verify(&self) -> bool {
        let content = format!(
            "WORM:{}:{}:{}:{}",
            self.label, self.payload, self.steps, self.timestamp
        );
        let expected_hash = format!("{:x}", Sha256::digest(content.as_bytes()));
        self.seal_hash == expected_hash
    }

    /// Get content hash (hash of label + payload, independent of timestamp)
    pub fn content_hash(&self) -> String {
        let content = format!("{}:{}", self.label, self.payload);
        format!("{:x}", Sha256::digest(content.as_bytes()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_seal_creation() {
        let seal = WormSeal::seal("test", "payload", 42);
        assert_eq!(seal.label, "test");
        assert_eq!(seal.payload, "payload");
        assert_eq!(seal.steps, 42);
        assert_eq!(seal.seal_hash.len(), 64);
        assert!(seal.artifact.starts_with("test_"));
    }

    #[test]
    fn test_seal_verification() {
        let seal = WormSeal::seal("test", "payload", 42);
        assert!(seal.verify());
    }

    #[test]
    fn test_seal_tamper_detection() {
        let mut seal = WormSeal::seal("test", "payload", 42);
        seal.payload = "tampered".to_string();
        assert!(!seal.verify()); // Verification should fail
    }

    #[test]
    fn test_content_hash_deterministic() {
        let seal1 = WormSeal::seal("test", "payload", 42);
        let seal2 = WormSeal::seal("test", "payload", 42);
        // Content hash should be same (label + payload)
        assert_eq!(seal1.content_hash(), seal2.content_hash());
        // But seal_hash differs (includes timestamp)
        // Note: timestamps might be same if tests run fast, so we don't assert inequality
    }

    #[test]
    fn test_content_hash_different_payloads() {
        let seal1 = WormSeal::seal("test", "payload1", 42);
        let seal2 = WormSeal::seal("test", "payload2", 42);
        assert_ne!(seal1.content_hash(), seal2.content_hash());
    }
}
