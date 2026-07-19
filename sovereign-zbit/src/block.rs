//! Block and transaction structures

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub inputs: Vec<String>,
    pub outputs: Vec<String>,
    pub amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub height: u64,
    pub hash: String,
    pub prev_hash: String,
    pub transactions: Vec<Transaction>,
    pub nonce: u64,
    pub timestamp: u64,
}

impl Block {
    pub fn genesis() -> Self {
        use sha2::{Sha256, Digest};
        let hash = format!("{:x}", Sha256::digest(b"GENESIS"));
        Self {
            height: 0, hash: hash.clone(), prev_hash: hash,
            transactions: Vec::new(), nonce: 0, timestamp: 0,
        }
    }

    pub fn mine(prev: &Block, transactions: Vec<Transaction>, difficulty: usize) -> Self {
        use sha2::{Sha256, Digest};
        let mut nonce = 0;
        loop {
            let raw = format!("{}:{}:{:?}", prev.height + 1, prev.hash, nonce);
            let hash = format!("{:x}", Sha256::digest(raw.as_bytes()));
            if hash.starts_with(&"0".repeat(difficulty)) {
                return Self {
                    height: prev.height + 1, hash, prev_hash: prev.hash.clone(),
                    transactions, nonce, timestamp: 0,
                };
            }
            nonce += 1;
        }
    }
}
