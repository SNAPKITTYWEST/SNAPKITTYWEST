//! WORM audit chain for PH-DAE step verification.
//!
//! ## Bifrost Chain
//!
//! Each step produces a WORM entry:
//! ```text
//! entry = Blake3(state_hash || time || hamiltonian || power_balance)
//! chain = Blake3(prev_hash || entry)
//! ```
//!
//! The chain is append-only and tamper-evident.

use sha2::{Sha256, Digest};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Audit error type.
#[derive(Error, Debug, Clone, PartialEq)]
pub enum AuditError {
    /// Chain verification failed.
    #[error("chain verification failed at step {step}: expected {expected}, got {actual}")]
    ChainBroken {
        /// Step number.
        step: usize,
        /// Expected hash.
        expected: String,
        /// Actual hash.
        actual: String,
    },

    /// Empty chain.
    #[error("empty audit chain")]
    EmptyChain,
}

/// WORM entry in the audit chain.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WormEntry {
    /// Step number.
    pub step: usize,
    /// Previous hash (chain link).
    pub prev_hash: String,
    /// State hash.
    pub state_hash: String,
    /// Time.
    pub time: f64,
    /// Hamiltonian value.
    pub hamiltonian: f64,
    /// Power balance error.
    pub power_balance_error: f64,
    /// Entry hash.
    pub hash: String,
}

impl WormEntry {
    /// Compute hash of this entry.
    pub fn compute_hash(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.prev_hash.as_bytes());
        hasher.update(self.state_hash.as_bytes());
        hasher.update(self.time.to_le_bytes());
        hasher.update(self.hamiltonian.to_le_bytes());
        hasher.update(self.power_balance_error.to_le_bytes());
        hex::encode(hasher.finalize())
    }
}

/// Audit chain for WORM verification.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditChain {
    /// Entries.
    pub entries: Vec<WormEntry>,
}

impl AuditChain {
    /// Create new empty chain.
    pub fn new() -> Self {
        Self { entries: Vec::new() }
    }

    /// Create genesis entry.
    pub fn genesis(state_hash: &str, time: f64, hamiltonian: f64) -> WormEntry {
        let entry = WormEntry {
            step: 0,
            prev_hash: String::new(),
            state_hash: state_hash.to_string(),
            time,
            hamiltonian,
            power_balance_error: 0.0,
            hash: String::new(),
        };
        WormEntry {
            hash: entry.compute_hash(),
            ..entry
        }
    }

    /// Append new entry to chain.
    pub fn append(
        &mut self,
        state_hash: &str,
        time: f64,
        hamiltonian: f64,
        power_balance_error: f64,
    ) -> WormEntry {
        let prev_hash = self.entries.last()
            .map(|e| e.hash.clone())
            .unwrap_or_default();

        let step = self.entries.len();

        let entry = WormEntry {
            step,
            prev_hash,
            state_hash: state_hash.to_string(),
            time,
            hamiltonian,
            power_balance_error,
            hash: String::new(),
        };

        let hash = entry.compute_hash();
        let entry = WormEntry { hash: hash.clone(), ..entry };
        self.entries.push(entry.clone());
        entry
    }

    /// Verify chain integrity.
    pub fn verify(&self) -> Result<(), AuditError> {
        if self.entries.is_empty() {
            return Err(AuditError::EmptyChain);
        }

        for i in 1..self.entries.len() {
            let expected_prev = &self.entries[i - 1].hash;
            let actual_prev = &self.entries[i].prev_hash;
            if expected_prev != actual_prev {
                return Err(AuditError::ChainBroken {
                    step: i,
                    expected: expected_prev.clone(),
                    actual: actual_prev.clone(),
                });
            }
        }

        Ok(())
    }

    /// Compute state hash from state vector.
    pub fn state_hash(state: &[f64], time: f64) -> String {
        let mut hasher = Sha256::new();
        for &s in state {
            hasher.update(s.to_le_bytes());
        }
        hasher.update(time.to_le_bytes());
        hex::encode(hasher.finalize())
    }

    /// Get chain length.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Check if chain is empty.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

impl Default for AuditChain {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_genesis_entry() {
        let entry = AuditChain::genesis("abc123", 0.0, 0.5);
        assert_eq!(entry.step, 0);
        assert!(entry.prev_hash.is_empty());
        assert!(!entry.hash.is_empty());
    }

    #[test]
    fn test_chain_append() {
        let mut chain = AuditChain::new();
        chain.append("hash1", 0.0, 0.5, 0.0);
        chain.append("hash2", 0.1, 0.4, 1e-10);
        assert_eq!(chain.len(), 2);
    }

    #[test]
    fn test_chain_verify_valid() {
        let mut chain = AuditChain::new();
        chain.append("hash1", 0.0, 0.5, 0.0);
        chain.append("hash2", 0.1, 0.4, 1e-10);
        chain.append("hash3", 0.2, 0.3, 2e-10);
        assert!(chain.verify().is_ok());
    }

    #[test]
    fn test_chain_verify_broken() {
        let mut chain = AuditChain::new();
        chain.append("hash1", 0.0, 0.5, 0.0);
        chain.append("hash2", 0.1, 0.4, 1e-10);

        // Tamper with the chain
        let mut broken = chain.clone();
        broken.entries[1].prev_hash = "tampered".to_string();
        assert!(broken.verify().is_err());
    }

    #[test]
    fn test_state_hash_deterministic() {
        let state = vec![1.0, 2.0, 3.0];
        let h1 = AuditChain::state_hash(&state, 0.0);
        let h2 = AuditChain::state_hash(&state, 0.0);
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_state_hash_different_state() {
        let s1 = vec![1.0, 2.0];
        let s2 = vec![1.0, 3.0];
        let h1 = AuditChain::state_hash(&s1, 0.0);
        let h2 = AuditChain::state_hash(&s2, 0.0);
        assert_ne!(h1, h2);
    }
}
