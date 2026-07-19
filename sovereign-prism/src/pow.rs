//! Proof of Work

pub struct ProofOfWork {
    pub difficulty: usize,
}

impl ProofOfWork {
    pub fn new(difficulty: usize) -> Self {
        Self { difficulty }
    }

    pub fn mine(&self, data: &str) -> (u64, String) {
        use sha2::{Sha256, Digest};
        let mut nonce = 0;
        loop {
            let raw = format!("{}:{}", data, nonce);
            let hash = format!("{:x}", Sha256::digest(raw.as_bytes()));
            if hash.starts_with(&"0".repeat(self.difficulty)) {
                return (nonce, hash);
            }
            nonce += 1;
        }
    }

    pub fn verify(&self, data: &str, nonce: u64, hash: &str) -> bool {
        use sha2::{Sha256, Digest};
        let raw = format!("{}:{}", data, nonce);
        let expected = format!("{:x}", Sha256::digest(raw.as_bytes()));
        hash == expected && hash.starts_with(&"0".repeat(self.difficulty))
    }
}
