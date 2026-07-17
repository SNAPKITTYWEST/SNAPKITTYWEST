//! Boundary Lattice G = P x B
//! 
//! |G| = 12,288 = 48 * 256
//! P = Z/48Z (prime index)
//! B = Z/256Z (byte index)

use serde::{Deserialize, Serialize};
use std::fmt;

/// Element in the Boundary Lattice
#[derive(Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct LatticeElement {
    pub p: u8, // 0..47 (prime index)
    pub b: u8, // 0..255 (byte index)
}

impl LatticeElement {
    pub const SIZE: usize = 12288; // 48 * 256
    pub const P_MOD: usize = 48;
    pub const B_MOD: usize = 256;

    pub fn new(p: u8, b: u8) -> Self {
        assert!(p < 48, "p must be < 48");
        // b is u8, always < 256
        Self { p, b }
    }

    /// Convert to flat index (0..12287)
    pub fn to_index(&self) -> usize {
        (self.p as usize * 256) + self.b as usize
    }

    /// Convert from flat index
    pub fn from_index(index: usize) -> Self {
        assert!(index < Self::SIZE, "index out of bounds");
        Self {
            p: (index / 256) as u8,
            b: (index % 256) as u8,
        }
    }

    /// Apply XOR mask (involution action)
    pub fn apply_mask(&self, mask: u16) -> Self {
        let mut index = self.to_index();
        index ^= mask as usize;
        Self::from_index(index % Self::SIZE)
    }

    /// Get all 6 anchors
    pub fn anchors() -> [Self; 6] {
        [
            Self::new(0, 0),
            Self::new(8, 0),
            Self::new(16, 0),
            Self::new(24, 0),
            Self::new(32, 0),
            Self::new(40, 0),
        ]
    }
}

impl fmt::Debug for LatticeElement {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "L({},{}) [{}]", self.p, self.b, self.to_index())
    }
}

/// Orbit certificate
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrbitCertificate {
    pub anchor: LatticeElement,
    pub size: usize,
    pub representatives: Vec<LatticeElement>,
}

/// Lattice certificate
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatticeCertificate {
    pub total_elements: usize,
    pub orbit_sizes: [usize; 6],
    pub is_free_action: bool,
    pub orbits: Vec<OrbitCertificate>,
}

impl LatticeCertificate {
    /// Verify the lattice structure
    pub fn verify() -> Self {
        use std::collections::HashSet;
        
        let anchors = LatticeElement::anchors();
        let mut seen = HashSet::new();
        let mut orbit_sizes = [0; 6];
        let mut is_free_action = true;
        let mut orbits = Vec::new();

        for (i, &anchor) in anchors.iter().enumerate() {
            let mut orbit_reps = Vec::new();
            let mut orbit_set = HashSet::new();
            
            for mask in 0..2048u16 {
                let transformed = anchor.apply_mask(mask);
                if !orbit_set.insert(transformed) {
                    is_free_action = false;
                }
                if !seen.insert(transformed) {
                    is_free_action = false;
                }
                orbit_reps.push(transformed);
            }
            
            orbit_sizes[i] = orbit_set.len();
            orbits.push(OrbitCertificate {
                anchor,
                size: orbit_set.len(),
                representatives: orbit_reps.into_iter().take(16).collect(),
            });
        }

        Self {
            total_elements: seen.len(),
            orbit_sizes,
            is_free_action,
            orbits,
        }
    }

    /// Check if element is in lattice
    pub fn contains(&self, elem: &LatticeElement) -> bool {
        elem.to_index() < LatticeElement::SIZE
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lattice_element() {
        let elem = LatticeElement::new(5, 100);
        assert_eq!(elem.p, 5);
        assert_eq!(elem.b, 100);
        assert_eq!(elem.to_index(), 5 * 256 + 100);
    }

    #[test]
    fn test_roundtrip() {
        for i in 0..12288 {
            let elem = LatticeElement::from_index(i);
            assert_eq!(elem.to_index(), i);
        }
    }

    #[test]
    fn test_anchors() {
        let anchors = LatticeElement::anchors();
        assert_eq!(anchors.len(), 6);
        assert_eq!(anchors[0], LatticeElement::new(0, 0));
        assert_eq!(anchors[5], LatticeElement::new(40, 0));
    }
}
