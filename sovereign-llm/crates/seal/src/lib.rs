use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WormSeal {
    pub hash: String,
    pub artifact: String,
    pub timestamp: u64,
    pub weight_count: usize,
    pub param_count: usize,
    pub checksum: String,
}

impl WormSeal {
    pub fn seal(artifact: &str, weights: &[f32], timestamp: u64) -> Self {
        let mut hasher = Sha256::new();

        // Hash all weights
        for &w in weights {
            hasher.update(w.to_le_bytes());
        }

        // Hash the artifact name
        hasher.update(artifact.as_bytes());

        // Hash the timestamp
        hasher.update(timestamp.to_le_bytes());

        let hash = format!("{:x}", hasher.finalize());
        let weight_count = weights.len();

        // Compute checksum over weight chunks
        let chunk_size = 1024;
        let mut checksum_hasher = Sha256::new();
        for chunk in weights.chunks(chunk_size) {
            let chunk_sum: f32 = chunk.iter().sum();
            checksum_hasher.update(chunk_sum.to_le_bytes());
        }
        let checksum = format!("{:x}", checksum_hasher.finalize());

        Self {
            hash,
            artifact: artifact.to_string(),
            timestamp,
            weight_count,
            param_count: weight_count,
            checksum,
        }
    }

    pub fn verify(&self, weights: &[f32]) -> bool {
        // Recompute hash
        let mut hasher = Sha256::new();
        for &w in weights {
            hasher.update(w.to_le_bytes());
        }
        hasher.update(self.artifact.as_bytes());
        hasher.update(self.timestamp.to_le_bytes());
        let recomputed = format!("{:x}", hasher.finalize());

        // Verify checksum
        let chunk_size = 1024;
        let mut checksum_hasher = Sha256::new();
        for chunk in weights.chunks(chunk_size) {
            let chunk_sum: f32 = chunk.iter().sum();
            checksum_hasher.update(chunk_sum.to_le_bytes());
        }
        let recomputed_checksum = format!("{:x}", checksum_hasher.finalize());

        self.hash == recomputed && self.checksum == recomputed_checksum
    }

    pub fn save(&self, path: &str) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(path, json)
    }

    pub fn load(path: &str) -> std::io::Result<Self> {
        let json = std::fs::read_to_string(path)?;
        serde_json::from_str(&json).map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
    }
}

pub fn seal_model(weights: &[f32], artifact_name: &str) -> WormSeal {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    WormSeal::seal(artifact_name, weights, timestamp)
}

pub fn verify_model(seal: &WormSeal, weights: &[f32]) -> bool {
    seal.verify(weights)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_seal_basic() {
        let weights = vec![0.1, 0.2, 0.3, 0.4];
        let seal = WormSeal::seal("test-model", &weights, 1000);
        assert_eq!(seal.weight_count, 4);
        assert!(seal.verify(&weights));
    }

    #[test]
    fn test_seal_verification_fails_tampered() {
        let weights = vec![0.1, 0.2, 0.3, 0.4];
        let seal = WormSeal::seal("test-model", &weights, 1000);
        let tampered = vec![0.1, 0.2, 0.3, 0.5];
        assert!(!seal.verify(&tampered));
    }

    #[test]
    fn test_seal_verification_fails_different_name() {
        let weights = vec![0.1, 0.2];
        let seal = WormSeal::seal("model-a", &weights, 1000);
        let mut seal2 = seal.clone();
        seal2.artifact = "model-b".to_string();
        assert!(!seal2.verify(&weights));
    }

    #[test]
    fn test_seal_save_load() {
        let weights = vec![0.1, 0.2, 0.3];
        let seal = WormSeal::seal("test", &weights, 1000);
        let path = "test_seal.json";
        seal.save(path).unwrap();
        let loaded = WormSeal::load(path).unwrap();
        assert_eq!(loaded.hash, seal.hash);
        assert!(loaded.verify(&weights));
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn test_seal_model() {
        let weights = vec![0.0; 1000];
        let seal = seal_model(&weights, "sovereign-tiny");
        assert_eq!(seal.weight_count, 1000);
        assert!(verify_model(&seal, &weights));
    }

    #[test]
    fn test_seal_hash_length() {
        let weights = vec![1.0, 2.0, 3.0];
        let seal = WormSeal::seal("test", &weights, 0);
        assert_eq!(seal.hash.len(), 64); // SHA-256 hex
        assert_eq!(seal.checksum.len(), 64);
    }

    #[test]
    fn test_seal_empty_weights() {
        let weights = vec![];
        let seal = WormSeal::seal("empty", &weights, 0);
        assert_eq!(seal.weight_count, 0);
        assert!(seal.verify(&weights));
    }

    #[test]
    fn test_seal_large_weights() {
        let weights: Vec<f32> = (0..10000).map(|i| i as f32 * 0.001).collect();
        let seal = WormSeal::seal("large", &weights, 1234567890);
        assert!(seal.verify(&weights));
    }

    #[test]
    fn test_seal_deterministic() {
        let weights = vec![0.1, 0.2, 0.3];
        let seal1 = WormSeal::seal("test", &weights, 1000);
        let seal2 = WormSeal::seal("test", &weights, 1000);
        assert_eq!(seal1.hash, seal2.hash);
        assert_eq!(seal1.checksum, seal2.checksum);
    }

    #[test]
    fn test_seal_clone() {
        let weights = vec![0.1, 0.2];
        let seal = WormSeal::seal("test", &weights, 1000);
        let seal2 = seal.clone();
        assert_eq!(seal.hash, seal2.hash);
    }
}
