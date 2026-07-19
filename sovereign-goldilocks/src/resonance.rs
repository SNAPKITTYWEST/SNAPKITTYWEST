//! Resonance Word
//! 
//! A ResonanceWord packs a class byte and a u64 payload into a single u64.
//! Used for encoding state transitions in the sovereign compute stack.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Resonance Word: class (8 bits) + payload (56 bits)
#[derive(Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ResonanceWord(pub u64);

impl ResonanceWord {
    /// Pack class and payload into a single word
    pub fn pack(class: u8, payload: u64) -> Self {
        // Ensure payload fits in 56 bits
        let masked_payload = payload & 0x00FFFFFFFFFFFFFF;
        Self(((class as u64) << 56) | masked_payload)
    }

    /// Unpack into class and payload
    pub fn unpack(&self) -> (u8, u64) {
        let class = (self.0 >> 56) as u8;
        let payload = self.0 & 0x00FFFFFFFFFFFFFF;
        (class, payload)
    }

    /// Get class
    pub fn class(&self) -> u8 {
        (self.0 >> 56) as u8
    }

    /// Get payload
    pub fn payload(&self) -> u64 {
        self.0 & 0x00FFFFFFFFFFFFFF
    }

    /// Create from raw u64
    pub fn from_raw(raw: u64) -> Self {
        Self(raw)
    }

    /// Get raw u64
    pub fn to_raw(&self) -> u64 {
        self.0
    }

    /// Compute SHA-256 hash of the word
    pub fn hash(&self) -> [u8; 32] {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(self.0.to_le_bytes());
        hasher.finalize().into()
    }
}

impl fmt::Debug for ResonanceWord {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let (class, payload) = self.unpack();
        write!(f, "Resonance(class={}, payload={})", class, payload)
    }
}

impl fmt::Display for ResonanceWord {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let (class, payload) = self.unpack();
        write!(f, "0x{:02x}:{:014x}", class, payload)
    }
}

/// Resonance classes
pub mod classes {
    pub const PRIME: u8 = 0x01;
    pub const LATTICE: u8 = 0x02;
    pub const ORBIT: u8 = 0x03;
    pub const SEAL: u8 = 0x04;
    pub const TRANSITION: u8 = 0x05;
    pub const INVOLUTION: u8 = 0x06;
    pub const ANCHOR: u8 = 0x07;
    pub const CERTIFICATE: u8 = 0x08;
    pub const WORM: u8 = 0x09;
    pub const SOVEREIGN: u8 = 0x0A;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pack_unpack() {
        let word = ResonanceWord::pack(0x0A, 12345);
        assert_eq!(word.class(), 0x0A);
        assert_eq!(word.payload(), 12345);
    }

    #[test]
    fn test_hash() {
        let word = ResonanceWord::pack(0x01, 42);
        let hash = word.hash();
        assert_eq!(hash.len(), 32);
    }
}
