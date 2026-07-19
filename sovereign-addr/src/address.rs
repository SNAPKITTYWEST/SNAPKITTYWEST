//! Content address

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentAddress {
    pub hash: String,
    pub chain: String,
    pub content_type: String,
    pub size: usize,
}

impl ContentAddress {
    pub fn new(data: &[u8], chain: &str, content_type: &str) -> Self {
        use sha2::{Sha256, Digest};
        let hash = format!("{:x}", Sha256::digest(data));
        Self { hash, chain: chain.to_string(), content_type: content_type.to_string(), size: data.len() }
    }

    pub fn verify(&self, data: &[u8]) -> bool {
        use sha2::{Sha256, Digest};
        let expected = format!("{:x}", Sha256::digest(data));
        self.hash == expected
    }
}
