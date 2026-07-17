//! SHA-256d (Double SHA-256) Hashing
//! Prevents length-extension attacks

use sha2::{Sha256, Digest};

/// Compute SHA-256 hash of bytes
pub fn hash_bytes(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    hex::encode(result)
}

/// Compute SHA-256 hash of string
pub fn hash_string(s: &str) -> String {
    hash_bytes(s.as_bytes())
}

/// Compute SHA-256d (double SHA-256)
/// First hash produces hex string, second hash operates on that string
pub fn hash_double(data: &[u8]) -> String {
    let first = hash_bytes(data);
    hash_string(&first)
}

/// SnapSHA256d label format
/// Format: "snapsha256d:<64-char-hex>"
pub fn snapsha256d(data: &[u8]) -> String {
    format!("snapsha256d:{}", hash_double(data))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256_empty() {
        let hash = hash_bytes(b"");
        assert_eq!(hash.len(), 64);
        assert_eq!(
            hash,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn test_sha256d_empty() {
        let hash = hash_double(b"");
        assert_eq!(hash.len(), 64);
        // Double hash of empty string
        assert_ne!(hash, hash_bytes(b""));
    }

    #[test]
    fn test_snapsha256d_format() {
        let label = snapsha256d(b"test");
        assert!(label.starts_with("snapsha256d:"));
        assert_eq!(label.len(), 12 + 64); // "snapsha256d:" + 64 hex chars
    }

    #[test]
    fn test_deterministic() {
        let data = b"hello world";
        let h1 = hash_double(data);
        let h2 = hash_double(data);
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_different_inputs() {
        let h1 = hash_double(b"hello");
        let h2 = hash_double(b"world");
        assert_ne!(h1, h2);
    }
}
