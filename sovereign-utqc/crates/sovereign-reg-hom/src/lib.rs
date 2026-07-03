//! # sovereign-reg-hom
//!
//! RegHom Registry: Registry of Regular Homomorphisms between Banach spaces.
//!
//! ## Mathematical Structure
//!
//! A regular homomorphism φ: X → Y between Banach spaces satisfies:
//! ```text
//! ‖φ(x)‖_Y ≤ C · ‖x‖_X         (bounded)
//! ‖φ(x) - φ(y)‖_Y ≤ L · ‖x - y‖_X  (Lipschitz)
//! Dφ(x) exists and is trace-class    (Fréchet differentiable)
//! ```
//!
//! The registry stores:
//! - Domain and codomain identifiers
//! - Lipschitz constant L
//! - Jacobian witness (trace-class operator)
//! - Composition law: φ ∘ ψ is registered when domains match
//!
//! ## Non-Recursive Composition
//!
//! Composition is verified at registration time, not at query time.
//! The registry is append-only (WORM).

use serde::{Deserialize, Serialize};
use thiserror::Error;
use sha2::{Sha256, Digest};

/// RegHom error.
#[derive(Error, Debug, Clone, PartialEq)]
pub enum RegHomError {
    /// Domain/codomain mismatch in composition.
    #[error("composition mismatch: codomain {0} ≠ domain {1}")]
    CompositionMismatch(String, String),

    /// Duplicate registration.
    #[error("homomorphism {0} already registered")]
    Duplicate(String),

    /// Invalid Lipschitz constant.
    #[error("Lipschitz constant must be positive, got {0}")]
    InvalidLipschitz(f64),

    /// Space not found.
    #[error("space {0} not found in registry")]
    SpaceNotFound(String),
}

/// Identifier for a Banach space.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SpaceId(pub String);

impl SpaceId {
    /// Create a new space identifier.
    pub fn new(name: &str) -> Self {
        Self(name.to_string())
    }
}

/// A registered Banach space.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BanachSpace {
    /// Unique identifier.
    pub id: SpaceId,
    /// Dimension (None for infinite-dimensional).
    pub dimension: Option<usize>,
    /// Norm type identifier.
    pub norm_type: String,
    /// WORM seal hash.
    pub seal: String,
}

impl BanachSpace {
    /// Create a new Banach space descriptor.
    pub fn new(id: SpaceId, dimension: Option<usize>, norm_type: &str) -> Self {
        let seal = Self::compute_seal(&id, dimension, norm_type);
        Self { id, dimension, norm_type: norm_type.to_string(), seal }
    }

    fn compute_seal(id: &SpaceId, dimension: Option<usize>, norm_type: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(id.0.as_bytes());
        hasher.update(dimension.unwrap_or(0).to_le_bytes());
        hasher.update(norm_type.as_bytes());
        hex::encode(hasher.finalize())
    }
}

/// Jacobian witness: a simplified representation of the Fréchet derivative.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JacobianWitness {
    /// Trace norm ‖Dφ‖_1 (should be finite for trace-class).
    pub trace_norm: f64,
    /// Operator norm ‖Dφ‖_op.
    pub operator_norm: f64,
    /// Hash of the Jacobian matrix (for WORM sealing).
    pub matrix_hash: String,
}

/// A registered regular homomorphism.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegHom {
    /// Unique identifier.
    pub id: String,
    /// Domain space.
    pub domain: SpaceId,
    /// Codomain space.
    pub codomain: SpaceId,
    /// Lipschitz constant L > 0.
    pub lipschitz: f64,
    /// Bounded constant C > 0.
    pub bounded_constant: f64,
    /// Jacobian witness.
    pub jacobian: JacobianWitness,
    /// WORM seal hash.
    pub seal: String,
}

impl RegHom {
    /// Create a new regular homomorphism.
    pub fn new(
        id: &str,
        domain: SpaceId,
        codomain: SpaceId,
        lipschitz: f64,
        bounded_constant: f64,
        jacobian: JacobianWitness,
    ) -> Result<Self, RegHomError> {
        if lipschitz <= 0.0 {
            return Err(RegHomError::InvalidLipschitz(lipschitz));
        }
        if bounded_constant <= 0.0 {
            return Err(RegHomError::InvalidLipschitz(bounded_constant));
        }

        let seal = Self::compute_seal(id, &domain, &codomain, lipschitz, bounded_constant, &jacobian);

        Ok(Self {
            id: id.to_string(),
            domain,
            codomain,
            lipschitz,
            bounded_constant,
            jacobian,
            seal,
        })
    }

    fn compute_seal(
        id: &str,
        domain: &SpaceId,
        codomain: &SpaceId,
        lipschitz: f64,
        bounded_constant: f64,
        jacobian: &JacobianWitness,
    ) -> String {
        let mut hasher = Sha256::new();
        hasher.update(id.as_bytes());
        hasher.update(domain.0.as_bytes());
        hasher.update(codomain.0.as_bytes());
        hasher.update(lipschitz.to_le_bytes());
        hasher.update(bounded_constant.to_le_bytes());
        hasher.update(jacobian.matrix_hash.as_bytes());
        hex::encode(hasher.finalize())
    }

    /// Verify φ: X → Y is well-formed.
    pub fn verify(&self) -> Result<(), RegHomError> {
        if self.lipschitz <= 0.0 {
            return Err(RegHomError::InvalidLipschitz(self.lipschitz));
        }
        if self.bounded_constant <= 0.0 {
            return Err(RegHomError::InvalidLipschitz(self.bounded_constant));
        }
        Ok(())
    }

    /// Compute Lipschitz bound: ‖φ(x) - φ(y)‖ ≤ L · ‖x - y‖.
    pub fn lipschitz_bound(&self, distance: f64) -> f64 {
        self.lipschitz * distance
    }

    /// Compute bounded norm: ‖φ(x)‖ ≤ C · ‖x‖.
    pub fn bounded_norm(&self, input_norm: f64) -> f64 {
        self.bounded_constant * input_norm
    }
}

/// The RegHom Registry: append-only store of spaces and homomorphisms.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegHomRegistry {
    /// Registered Banach spaces.
    pub spaces: Vec<BanachSpace>,
    /// Registered homomorphisms.
    pub homomorphisms: Vec<RegHom>,
    /// Chain of WORM seals (each entry includes previous seal).
    pub seal_chain: Vec<String>,
}

impl RegHomRegistry {
    /// Create empty registry.
    pub fn new() -> Self {
        Self {
            spaces: Vec::new(),
            homomorphisms: Vec::new(),
            seal_chain: Vec::new(),
        }
    }

    /// Register a Banach space.
    pub fn register_space(&mut self, space: BanachSpace) -> Result<(), RegHomError> {
        if self.spaces.iter().any(|s| s.id == space.id) {
            return Err(RegHomError::Duplicate(space.id.0));
        }

        let prev_seal = self.seal_chain.last().cloned().unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(prev_seal.as_bytes());
        hasher.update(space.seal.as_bytes());
        let new_seal = hex::encode(hasher.finalize());

        self.spaces.push(space);
        self.seal_chain.push(new_seal);
        Ok(())
    }

    /// Register a regular homomorphism.
    pub fn register_homomorphism(&mut self, hom: RegHom) -> Result<(), RegHomError> {
        hom.verify()?;

        if !self.spaces.iter().any(|s| s.id == hom.domain) {
            return Err(RegHomError::SpaceNotFound(hom.domain.0));
        }
        if !self.spaces.iter().any(|s| s.id == hom.codomain) {
            return Err(RegHomError::SpaceNotFound(hom.codomain.0));
        }

        let prev_seal = self.seal_chain.last().cloned().unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(prev_seal.as_bytes());
        hasher.update(hom.seal.as_bytes());
        let new_seal = hex::encode(hasher.finalize());

        self.homomorphisms.push(hom);
        self.seal_chain.push(new_seal);
        Ok(())
    }

    /// Compose two homomorphisms: if φ: X → Y and ψ: Y → Z, register ψ ∘ φ: X → Z.
    pub fn compose(
        &mut self,
        phi_id: &str,
        psi_id: &str,
        composed_id: &str,
    ) -> Result<RegHom, RegHomError> {
        let phi = self.homomorphisms.iter()
            .find(|h| h.id == phi_id)
            .ok_or_else(|| RegHomError::SpaceNotFound(phi_id.to_string()))?
            .clone();

        let psi = self.homomorphisms.iter()
            .find(|h| h.id == psi_id)
            .ok_or_else(|| RegHomError::SpaceNotFound(psi_id.to_string()))?
            .clone();

        if phi.codomain != psi.domain {
            return Err(RegHomError::CompositionMismatch(
                phi.codomain.0, psi.domain.0,
            ));
        }

        let composed_lipschitz = phi.lipschitz * psi.lipschitz;
        let composed_bounded = phi.bounded_constant * psi.bounded_constant;

        let jacobian = JacobianWitness {
            trace_norm: phi.jacobian.trace_norm * psi.jacobian.trace_norm,
            operator_norm: phi.jacobian.operator_norm * psi.jacobian.operator_norm,
            matrix_hash: {
                let mut hasher = Sha256::new();
                hasher.update(phi.jacobian.matrix_hash.as_bytes());
                hasher.update(psi.jacobian.matrix_hash.as_bytes());
                hex::encode(hasher.finalize())
            },
        };

        let composed = RegHom::new(
            composed_id,
            phi.domain.clone(),
            psi.codomain.clone(),
            composed_lipschitz,
            composed_bounded,
            jacobian,
        )?;

        self.register_homomorphism(composed.clone())?;
        Ok(composed)
    }

    /// Look up homomorphism by domain and codomain.
    pub fn lookup(&self, domain: &SpaceId, codomain: &SpaceId) -> Option<&RegHom> {
        self.homomorphisms.iter()
            .find(|h| h.domain == *domain && h.codomain == *codomain)
    }

    /// WORM-sealed hash of entire registry.
    pub fn seal_hash(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update((self.spaces.len() as u64).to_le_bytes());
        hasher.update((self.homomorphisms.len() as u64).to_le_bytes());
        for seal in &self.seal_chain {
            hasher.update(seal.as_bytes());
        }
        hex::encode(hasher.finalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    fn make_test_space(name: &str) -> BanachSpace {
        BanachSpace::new(SpaceId::new(name), Some(8), "L2")
    }

    fn make_test_jacobian(hash: &str) -> JacobianWitness {
        JacobianWitness {
            trace_norm: 1.0,
            operator_norm: 0.5,
            matrix_hash: hash.to_string(),
        }
    }

    #[test]
    fn test_register_space() {
        let mut reg = RegHomRegistry::new();
        let space = make_test_space("X");
        reg.register_space(space).unwrap();
        assert_eq!(reg.spaces.len(), 1);
    }

    #[test]
    fn test_duplicate_space_rejected() {
        let mut reg = RegHomRegistry::new();
        reg.register_space(make_test_space("X")).unwrap();
        assert!(reg.register_space(make_test_space("X")).is_err());
    }

    #[test]
    fn test_register_homomorphism() {
        let mut reg = RegHomRegistry::new();
        reg.register_space(make_test_space("X")).unwrap();
        reg.register_space(make_test_space("Y")).unwrap();

        let hom = RegHom::new(
            "phi",
            SpaceId::new("X"),
            SpaceId::new("Y"),
            1.0,
            2.0,
            make_test_jacobian("hash1"),
        ).unwrap();

        reg.register_homomorphism(hom).unwrap();
        assert_eq!(reg.homomorphisms.len(), 1);
    }

    #[test]
    fn test_compose() {
        let mut reg = RegHomRegistry::new();
        reg.register_space(make_test_space("X")).unwrap();
        reg.register_space(make_test_space("Y")).unwrap();
        reg.register_space(make_test_space("Z")).unwrap();

        let phi = RegHom::new(
            "phi", SpaceId::new("X"), SpaceId::new("Y"),
            2.0, 3.0, make_test_jacobian("h1"),
        ).unwrap();
        reg.register_homomorphism(phi).unwrap();

        let psi = RegHom::new(
            "psi", SpaceId::new("Y"), SpaceId::new("Z"),
            1.5, 2.5, make_test_jacobian("h2"),
        ).unwrap();
        reg.register_homomorphism(psi).unwrap();

        let composed = reg.compose("phi", "psi", "psi_phi").unwrap();
        assert_eq!(composed.lipschitz, 3.0); // 2.0 * 1.5
        assert_eq!(composed.bounded_constant, 7.5); // 3.0 * 2.5
    }

    #[test]
    fn test_compose_mismatch() {
        let mut reg = RegHomRegistry::new();
        reg.register_space(make_test_space("X")).unwrap();
        reg.register_space(make_test_space("Y")).unwrap();
        reg.register_space(make_test_space("Z")).unwrap();

        let phi = RegHom::new(
            "phi", SpaceId::new("X"), SpaceId::new("Y"),
            1.0, 1.0, make_test_jacobian("h1"),
        ).unwrap();
        reg.register_homomorphism(phi).unwrap();

        let psi = RegHom::new(
            "psi", SpaceId::new("Z"), SpaceId::new("W"),
            1.0, 1.0, make_test_jacobian("h2"),
        ).unwrap();
        reg.register_homomorphism(psi).unwrap_err(); // W doesn't exist
    }

    #[test]
    fn test_lookup() {
        let mut reg = RegHomRegistry::new();
        reg.register_space(make_test_space("X")).unwrap();
        reg.register_space(make_test_space("Y")).unwrap();

        let phi = RegHom::new(
            "phi", SpaceId::new("X"), SpaceId::new("Y"),
            1.0, 1.0, make_test_jacobian("h1"),
        ).unwrap();
        reg.register_homomorphism(phi).unwrap();

        let found = reg.lookup(&SpaceId::new("X"), &SpaceId::new("Y"));
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, "phi");
    }

    #[test]
    fn test_seal_chain_deterministic() {
        let mut reg1 = RegHomRegistry::new();
        let mut reg2 = RegHomRegistry::new();

        reg1.register_space(make_test_space("X")).unwrap();
        reg2.register_space(make_test_space("X")).unwrap();

        assert_eq!(reg1.seal_chain, reg2.seal_chain);
    }

    #[test]
    fn test_lipschitz_bound() {
        let hom = RegHom::new(
            "phi", SpaceId::new("X"), SpaceId::new("Y"),
            2.5, 1.0, make_test_jacobian("h"),
        ).unwrap();
        assert_eq!(hom.lipschitz_bound(4.0), 10.0);
    }

    #[test]
    fn test_bounded_norm() {
        let hom = RegHom::new(
            "phi", SpaceId::new("X"), SpaceId::new("Y"),
            1.0, 3.0, make_test_jacobian("h"),
        ).unwrap();
        assert_eq!(hom.bounded_norm(5.0), 15.0);
    }

    proptest! {
        #[test]
        fn prop_composition_lipschitz_multiplicative(
            l1 in 0.1f64..10.0,
            l2 in 0.1f64..10.0
        ) {
            let mut reg = RegHomRegistry::new();
            reg.register_space(make_test_space("X")).unwrap();
            reg.register_space(make_test_space("Y")).unwrap();
            reg.register_space(make_test_space("Z")).unwrap();

            let phi = RegHom::new(
                "phi", SpaceId::new("X"), SpaceId::new("Y"),
                l1, 1.0, make_test_jacobian("h1"),
            ).unwrap();
            reg.register_homomorphism(phi).unwrap();

            let psi = RegHom::new(
                "psi", SpaceId::new("Y"), SpaceId::new("Z"),
                l2, 1.0, make_test_jacobian("h2"),
            ).unwrap();
            reg.register_homomorphism(psi).unwrap();

            let composed = reg.compose("phi", "psi", "composed").unwrap();
            prop_assert!((composed.lipschitz - l1 * l2).abs() < 1e-10);
        }
    }
}
