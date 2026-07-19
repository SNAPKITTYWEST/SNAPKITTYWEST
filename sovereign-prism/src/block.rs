//! Block

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub height: u64,
    pub hash: String,
    pub prev_hash: String,
    pub data: String,
    pub nonce: u64,
}

impl Block {
    pub fn genesis() -> Self {
        use sha2::{Sha256, Digest};
        let hash = format!("{:x}", Sha256::digest(b"GENESIS"));
        Self { height: 0, hash: hash.clone(), prev_hash: hash, data: String::new(), nonce: 0 }
    }
}
