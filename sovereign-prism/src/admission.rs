//! Admission Validation: Fail-Closed Target Verification
//! Verify that a target is in the allowed set
//! Any error terminates processing - no fallback, no default, no silent failure

use serde::{Deserialize, Serialize};

/// Admission error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AdmissionError {
    TargetNotInAllowedSet { target: String, allowed: Vec<String> },
    InvalidTargetFormat { target: String, reason: String },
    EmptyAllowedSet,
}

impl std::fmt::Display for AdmissionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AdmissionError::TargetNotInAllowedSet { target, allowed } => {
                write!(
                    f,
                    "Target '{}' not in allowed set: {:?}",
                    target, allowed
                )
            }
            AdmissionError::InvalidTargetFormat { target, reason } => {
                write!(f, "Invalid target format '{}': {}", target, reason)
            }
            AdmissionError::EmptyAllowedSet => {
                write!(f, "Allowed set is empty")
            }
        }
    }
}

impl std::error::Error for AdmissionError {}

/// Admission validator
/// Fail-closed: any error terminates processing
pub struct AdmissionValidator {
    allowed_targets: Vec<String>,
}

impl AdmissionValidator {
    /// Create new validator with allowed targets
    pub fn new(allowed_targets: Vec<String>) -> Result<Self, AdmissionError> {
        if allowed_targets.is_empty() {
            return Err(AdmissionError::EmptyAllowedSet);
        }
        Ok(Self { allowed_targets })
    }

    /// Validate target against allowed set
    /// Returns Ok(()) if admitted, Err if rejected
    /// Fail-closed: no fallback, no default
    pub fn validate(&self, target: &str) -> Result<(), AdmissionError> {
        // Validate format
        if target.is_empty() {
            return Err(AdmissionError::InvalidTargetFormat {
                target: target.to_string(),
                reason: "Target cannot be empty".to_string(),
            });
        }

        // Check if target is in allowed set
        if !self.allowed_targets.contains(&target.to_string()) {
            return Err(AdmissionError::TargetNotInAllowedSet {
                target: target.to_string(),
                allowed: self.allowed_targets.clone(),
            });
        }

        Ok(())
    }

    /// Check if target is admitted (convenience method)
    pub fn is_admitted(&self, target: &str) -> bool {
        self.validate(target).is_ok()
    }

    /// Get list of allowed targets
    pub fn allowed_targets(&self) -> &[String] {
        &self.allowed_targets
    }
}

/// Prime index admission validator
/// Specialized for verifying prime indices
pub struct PrimeIndexValidator {
    allowed_primes: Vec<u64>,
}

impl PrimeIndexValidator {
    /// Create validator with allowed prime indices
    pub fn new(allowed_primes: Vec<u64>) -> Result<Self, AdmissionError> {
        if allowed_primes.is_empty() {
            return Err(AdmissionError::EmptyAllowedSet);
        }
        Ok(Self { allowed_primes })
    }

    /// Validate prime index
    pub fn validate(&self, index: u64) -> Result<(), AdmissionError> {
        if !self.allowed_primes.contains(&index) {
            return Err(AdmissionError::TargetNotInAllowedSet {
                target: index.to_string(),
                allowed: self.allowed_primes.iter().map(|p| p.to_string()).collect(),
            });
        }
        Ok(())
    }

    /// Check if prime index is admitted
    pub fn is_admitted(&self, index: u64) -> bool {
        self.validate(index).is_ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_admission_validator_creation() {
        let validator = AdmissionValidator::new(vec!["a".to_string(), "b".to_string()]);
        assert!(validator.is_ok());
    }

    #[test]
    fn test_empty_allowed_set() {
        let validator = AdmissionValidator::new(vec![]);
        assert!(matches!(validator, Err(AdmissionError::EmptyAllowedSet)));
    }

    #[test]
    fn test_admitted_target() {
        let validator = AdmissionValidator::new(vec!["target1".to_string(), "target2".to_string()])
            .unwrap();
        assert!(validator.is_admitted("target1"));
        assert!(validator.is_admitted("target2"));
    }

    #[test]
    fn test_rejected_target() {
        let validator = AdmissionValidator::new(vec!["target1".to_string()]).unwrap();
        assert!(!validator.is_admitted("target2"));
    }

    #[test]
    fn test_empty_target() {
        let validator = AdmissionValidator::new(vec!["target1".to_string()]).unwrap();
        let result = validator.validate("");
        assert!(matches!(
            result,
            Err(AdmissionError::InvalidTargetFormat { .. })
        ));
    }

    #[test]
    fn test_prime_index_validator() {
        let validator = PrimeIndexValidator::new(vec![2, 3, 5, 7, 11]).unwrap();
        assert!(validator.is_admitted(2));
        assert!(validator.is_admitted(7));
        assert!(!validator.is_admitted(4)); // 4 is not prime
        assert!(!validator.is_admitted(42)); // 42 is not in set
    }

    #[test]
    fn test_fail_closed_behavior() {
        let validator = AdmissionValidator::new(vec!["allowed".to_string()]).unwrap();
        let result = validator.validate("not_allowed");
        assert!(result.is_err());
        // No fallback, no default - just error
    }
}
