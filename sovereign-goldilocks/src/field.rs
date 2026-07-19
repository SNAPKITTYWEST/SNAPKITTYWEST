//! Goldilocks Field arithmetic
//! 
//! The Goldilocks prime: p = 2^64 - 2^32 + 1 = 18446744069414584321
//! This is the field used in PLONK and other ZK-proof systems.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Goldilocks field element (mod p = 2^64 - 2^32 + 1)
#[derive(Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GoldilocksField(pub u64);

impl GoldilocksField {
    pub const P: u64 = 18446744069414584321; // 2^64 - 2^32 + 1
    pub const ZERO: Self = Self(0);
    pub const ONE: Self = Self(1);

    pub fn new(val: u64) -> Self {
        Self(Self::reduce(val))
    }

    fn reduce(val: u64) -> u64 {
        // Barrett reduction for Goldilocks prime
        let (lo, hi) = (val as u128, (val >> 32) as u128);
        let t = hi * (1u128 << 32) - hi;
        let result = lo + t + (hi << 32);
        let result = (result >> 64) + (result & Self::P as u128);
        if result >= Self::P as u128 {
            (result - Self::P as u128) as u64
        } else {
            result as u64
        }
    }

    pub fn add(&self, other: &Self) -> Self {
        let (s, overflow) = self.0.overflowing_add(other.0);
        let mut result = s;
        if overflow || result >= Self::P {
            result = result.wrapping_sub(Self::P);
        }
        Self(result)
    }

    pub fn sub(&self, other: &Self) -> Self {
        let (s, overflow) = self.0.overflowing_sub(other.0);
        let mut result = s;
        if overflow {
            result = result.wrapping_add(Self::P);
        }
        Self(result)
    }

    pub fn mul(&self, other: &Self) -> Self {
        let result = (self.0 as u128) * (other.0 as u128);
        Self(Self::reduce(result as u64))
    }

    pub fn pow(&self, exp: u64) -> Self {
        let mut result = Self::ONE;
        let mut base = *self;
        let mut e = exp;
        while e > 0 {
            if e & 1 == 1 {
                result = result.mul(&base);
            }
            base = base.mul(&base);
            e >>= 1;
        }
        result
    }

    pub fn inv(&self) -> Option<Self> {
        // Fermat's little theorem: a^(p-2) = a^(-1) mod p
        if self.0 == 0 {
            None
        } else {
            Some(self.pow(Self::P - 2))
        }
    }

    pub fn is_zero(&self) -> bool {
        self.0 == 0
    }

    pub fn to_bytes(&self) -> [u8; 8] {
        self.0.to_le_bytes()
    }

    pub fn from_bytes(bytes: &[u8; 8]) -> Self {
        Self::new(u64::from_le_bytes(*bytes))
    }
}

impl fmt::Debug for GoldilocksField {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "GF({})", self.0)
    }
}

impl fmt::Display for GoldilocksField {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        let a = GoldilocksField::new(100);
        let b = GoldilocksField::new(200);
        let c = a.add(&b);
        assert_eq!(c.0, 300);
    }

    #[test]
    fn test_mul() {
        let a = GoldilocksField::new(123);
        let b = GoldilocksField::new(456);
        let c = a.mul(&b);
        assert_eq!(c.0, 123 * 456);
    }

    #[test]
    fn test_inv() {
        let a = GoldilocksField::new(42);
        let a_inv = a.inv().unwrap();
        let product = a.mul(&a_inv);
        assert_eq!(product, GoldilocksField::ONE);
    }
}
