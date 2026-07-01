//! PH-DAE structural axioms.
//!
//! ## Prolog Axioms (Rust Implementation)
//!
//! These are the deterministic guardrails for Port-Hamiltonian systems:
//!
//! 1. **Power Balance**: dH/dt = P_port - P_diss
//! 2. **Skew-Symmetry**: J = -J^T
//! 3. **PSD Dissipation**: R = R^T >= 0
//! 4. **Index Reduction**: Pantelides algorithm witness

use serde::{Deserialize, Serialize};

/// PH-DAE axiom.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PhdaeAxiom {
    /// Power balance: dH/dt = P_port - P_diss.
    PowerBalance {
        /// Time derivative of Hamiltonian.
        dhdt: f64,
        /// Port power input.
        p_port: f64,
        /// Dissipation power.
        p_diss: f64,
        /// Error bound.
        tolerance: f64,
    },

    /// Skew-symmetry: J = -J^T.
    SkewSymmetric {
        /// Max deviation from skew-symmetry.
        max_deviation: f64,
    },

    /// PSD dissipation: R = R^T >= 0.
    PositiveSemiDefinite {
        /// Minimum eigenvalue (should be >= 0).
        min_eigenvalue: f64,
        /// Cholesky witness exists.
        cholesky_valid: bool,
    },

    /// Index reduction witness.
    IndexReduced {
        /// Pantelides index.
        pantelides_index: usize,
        /// Projector chain idempotent: Pi^2 = Pi.
        projector_idempotent: bool,
    },
}

impl PhdaeAxiom {
    /// Verify axiom holds.
    pub fn verify(&self) -> bool {
        match self {
            Self::PowerBalance { dhdt, p_port, p_diss, tolerance } => {
                (dhdt - (p_port - p_diss)).abs() <= *tolerance
            }
            Self::SkewSymmetric { max_deviation } => *max_deviation <= 1e-12,
            Self::PositiveSemiDefinite { min_eigenvalue, cholesky_valid } => {
                *min_eigenvalue >= -1e-12 && *cholesky_valid
            }
            Self::IndexReduced { projector_idempotent, .. } => *projector_idempotent,
        }
    }
}

/// Power balance verification result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerBalance {
    /// Time derivative of Hamiltonian.
    pub dhdt: f64,
    /// Port power.
    pub p_port: f64,
    /// Dissipation power.
    pub p_diss: f64,
    /// Error.
    pub error: f64,
    /// Whether balance holds.
    pub holds: bool,
}

impl PowerBalance {
    /// Compute power balance from system quantities.
    pub fn compute(h_new: f64, h_old: f64, dt: f64, p_port: f64, p_diss: f64, tol: f64) -> Self {
        let dhdt = (h_new - h_old) / dt;
        let error = (dhdt - (p_port - p_diss)).abs();
        Self {
            dhdt,
            p_port,
            p_diss,
            error,
            holds: error <= tol,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_power_balance_holds() {
        let pb = PowerBalance::compute(0.5, 0.4, 0.1, 1.0, 0.0, 1e-10);
        // dhdt = (0.5 - 0.4) / 0.1 = 1.0
        // p_port - p_diss = 1.0 - 0.0 = 1.0
        assert!(pb.holds);
        assert!(pb.error < 1e-10);
    }

    #[test]
    fn test_power_balance_violated() {
        let pb = PowerBalance::compute(0.5, 0.4, 0.1, 2.0, 0.0, 1e-10);
        // dhdt = 1.0, p_port - p_diss = 2.0
        assert!(!pb.holds);
    }

    #[test]
    fn test_axiom_power_balance() {
        let axiom = PhdaeAxiom::PowerBalance {
            dhdt: 1.0,
            p_port: 1.0,
            p_diss: 0.0,
            tolerance: 1e-10,
        };
        assert!(axiom.verify());
    }

    #[test]
    fn test_axiom_skew_symmetric() {
        let axiom = PhdaeAxiom::SkewSymmetric { max_deviation: 1e-15 };
        assert!(axiom.verify());

        let axiom_bad = PhdaeAxiom::SkewSymmetric { max_deviation: 0.1 };
        assert!(!axiom_bad.verify());
    }

    #[test]
    fn test_axiom_psd() {
        let axiom = PhdaeAxiom::PositiveSemiDefinite {
            min_eigenvalue: 0.1,
            cholesky_valid: true,
        };
        assert!(axiom.verify());

        let axiom_bad = PhdaeAxiom::PositiveSemiDefinite {
            min_eigenvalue: -0.1,
            cholesky_valid: true,
        };
        assert!(!axiom_bad.verify());
    }
}
