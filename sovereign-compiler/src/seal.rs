//! WORM Seal

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WormSeal {
    pub hash: String,
    pub steps: u64,
    pub artifact: String,
}

impl WormSeal {
    pub fn seal(label: &str, payload: &str, steps: u64) -> Self {
        use sha2::{Sha256, Digest};
        let ts = format!("{:?}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
        let raw = format!("{}:{}:{}:{}", label, payload, steps, ts);
        let hash = format!("{:x}", Sha256::digest(raw.as_bytes()));
        Self { hash, steps, artifact: format!("{}_{}", label, &hash[..8]) }
    }

    pub fn verify(&self) -> bool { self.hash.len() == 64 }
}
