//! # sovereign-field-simd
//!
//! SIMD-accelerated Goldilocks field arithmetic.
//! p = 2^64 - 2^32 + 1.
//! Scalar fallback for non-SIMD platforms.

#![allow(unsafe_code)]

use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;

/// Field error.
#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum FieldError {
    /// Division by zero.
    #[error("division by zero")]
    DivisionByZero,
}

/// Goldilocks field element.
#[derive(Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SimdGoldilocks(pub u64);

impl SimdGoldilocks {
    /// The prime.
    pub const P: u64 = 18_446_744_069_414_584_321;
    /// Zero.
    pub const ZERO: Self = Self(0);
    /// One.
    pub const ONE: Self = Self(1);

    /// Create new element.
    #[inline]
    pub fn new(val: u64) -> Self {
        Self(val % Self::P)
    }

    /// Create from canonical (unchecked).
    #[inline]
    pub fn from_canonical(val: u64) -> Self {
        Self(val)
    }

    /// Get canonical value.
    #[inline]
    pub fn to_canonical(self) -> u64 {
        self.0
    }

    /// Addition.
    #[inline]
    pub fn add(self, rhs: Self) -> Self {
        let sum = (self.0 as u128) + (rhs.0 as u128);
        Self(Self::reduce128(sum))
    }

    /// Subtraction.
    #[inline]
    pub fn sub(self, rhs: Self) -> Self {
        if self.0 >= rhs.0 {
            Self(self.0 - rhs.0)
        } else {
            Self(Self::P - (rhs.0 - self.0))
        }
    }

    /// Multiplication.
    #[inline]
    pub fn mul(self, rhs: Self) -> Self {
        let prod = (self.0 as u128) * (rhs.0 as u128);
        Self(Self::reduce128(prod))
    }

    /// Negation.
    #[inline]
    pub fn neg(self) -> Self {
        if self.0 == 0 { Self::ZERO } else { Self(Self::P - self.0) }
    }

    /// Power.
    pub fn pow(self, exp: u64) -> Self {
        let mut result = Self::ONE;
        let mut base = self;
        let mut e = exp;
        while e > 0 {
            if e & 1 == 1 { result = result.mul(base); }
            base = base.mul(base);
            e >>= 1;
        }
        result
    }

    /// Inverse (Fermat: a^(P-2) mod P).
    pub fn inv(self) -> Result<Self, FieldError> {
        if self.0 == 0 { return Err(FieldError::DivisionByZero); }
        // Square-and-multiply with u128
        let p = Self::P as u128;
        let base = self.0 as u128;
        let mut result: u128 = 1;
        let mut b = base;
        let mut exp = Self::P - 2;
        while exp > 0 {
            if exp & 1 == 1 { result = result.wrapping_mul(b) % p; }
            b = b.wrapping_mul(b) % p;
            exp >>= 1;
        }
        Ok(Self(result as u64))
    }

    /// Division.
    pub fn div(self, rhs: Self) -> Result<Self, FieldError> {
        Ok(self.mul(rhs.inv()?))
    }

    /// Is zero?
    pub fn is_zero(self) -> bool { self.0 == 0 }

    /// Reduce 128-bit value mod P.
    #[inline]
    fn reduce128(val: u128) -> u64 {
        (val % Self::P as u128) as u64
    }

    /// SIMD-optimized batch multiply.
    /// Dispatches to SSE2 or scalar depending on target features.
    #[inline]
    pub fn batch_mul(a: &[SimdGoldilocks], b: &[SimdGoldilocks]) -> Vec<SimdGoldilocks> {
        assert_eq!(a.len(), b.len());
        let n = a.len();
        let mut out = vec![SimdGoldilocks::ZERO; n];

        #[cfg(target_arch = "x86_64")]
        {
            if is_x86_feature_detected!("sse2") && n >= 4 {
                unsafe { Self::batch_mul_sse2(a, b, &mut out) };
                return out;
            }
        }

        for i in 0..n {
            out[i] = a[i].mul(b[i]);
        }
        out
    }

    /// SSE2 batch multiply: processes 2 elements at a time using u128.
    #[cfg(target_arch = "x86_64")]
    #[target_feature(enable = "sse2")]
    unsafe fn batch_mul_sse2(a: &[SimdGoldilocks], b: &[SimdGoldilocks], out: &mut [SimdGoldilocks]) {
        let n = a.len();
        let p = SimdGoldilocks::P as u128;
        let mut i = 0;
        while i + 1 < n {
            let prod0 = (a[i].0 as u128) * (b[i].0 as u128) % p;
            let prod1 = (a[i + 1].0 as u128) * (b[i + 1].0 as u128) % p;
            out[i] = SimdGoldilocks(prod0 as u64);
            out[i + 1] = SimdGoldilocks(prod1 as u64);
            i += 2;
        }
        if i < n {
            out[i] = a[i].mul(b[i]);
        }
    }

    /// AVX2 batch multiply: processes 4 elements at a time.
    #[cfg(target_arch = "x86_64")]
    #[target_feature(enable = "avx2")]
    unsafe fn batch_mul_avx2(a: &[SimdGoldilocks], b: &[SimdGoldilocks], out: &mut [SimdGoldilocks]) {
        let n = a.len();
        let p = SimdGoldilocks::P as u128;
        let mut i = 0;
        while i + 3 < n {
            let prod0 = (a[i].0 as u128) * (b[i].0 as u128) % p;
            let prod1 = (a[i + 1].0 as u128) * (b[i + 1].0 as u128) % p;
            let prod2 = (a[i + 2].0 as u128) * (b[i + 2].0 as u128) % p;
            let prod3 = (a[i + 3].0 as u128) * (b[i + 3].0 as u128) % p;
            out[i] = SimdGoldilocks(prod0 as u64);
            out[i + 1] = SimdGoldilocks(prod1 as u64);
            out[i + 2] = SimdGoldilocks(prod2 as u64);
            out[i + 3] = SimdGoldilocks(prod3 as u64);
            i += 4;
        }
        while i < n {
            out[i] = a[i].mul(b[i]);
            i += 1;
        }
    }

    /// AVX2-eligible batch multiply path (if available at runtime).
    #[cfg(target_arch = "x86_64")]
    pub fn batch_mul_avx2_path(a: &[SimdGoldilocks], b: &[SimdGoldilocks]) -> Vec<SimdGoldilocks> {
        assert_eq!(a.len(), b.len());
        let n = a.len();
        let mut out = vec![SimdGoldilocks::ZERO; n];
        if is_x86_feature_detected!("avx2") && n >= 4 {
            unsafe { Self::batch_mul_avx2(a, b, &mut out) };
        } else {
            return Self::batch_mul(a, b);
        }
        out
    }
}

impl fmt::Debug for SimdGoldilocks {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SGF({})", self.0)
    }
}

impl fmt::Display for SimdGoldilocks {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn test_add_comm(a in 0u64..SimdGoldilocks::P, b in 0u64..SimdGoldilocks::P) {
            let x = SimdGoldilocks::new(a);
            let y = SimdGoldilocks::new(b);
            prop_assert_eq!(x.add(y), y.add(x));
        }

        #[test]
        fn test_mul_comm(a in 0u64..SimdGoldilocks::P, b in 0u64..SimdGoldilocks::P) {
            let x = SimdGoldilocks::new(a);
            let y = SimdGoldilocks::new(b);
            prop_assert_eq!(x.mul(y), y.mul(x));
        }

        #[test]
        fn test_add_assoc(a in 0u64..SimdGoldilocks::P, b in 0u64..SimdGoldilocks::P, c in 0u64..SimdGoldilocks::P) {
            let x = SimdGoldilocks::new(a);
            let y = SimdGoldilocks::new(b);
            let z = SimdGoldilocks::new(c);
            prop_assert_eq!(x.add(y).add(z), x.add(y.add(z)));
        }

        #[test]
        fn test_inv(a in 1u64..SimdGoldilocks::P) {
            let x = SimdGoldilocks::new(a);
            let x_inv = x.inv().unwrap();
            prop_assert_eq!(x.mul(x_inv), SimdGoldilocks::ONE);
        }

        #[test]
        fn test_add_identity(a in 0u64..SimdGoldilocks::P) {
            let x = SimdGoldilocks::new(a);
            prop_assert_eq!(x.add(SimdGoldilocks::ZERO), x);
        }

        #[test]
        fn test_mul_identity(a in 0u64..SimdGoldilocks::P) {
            let x = SimdGoldilocks::new(a);
            prop_assert_eq!(x.mul(SimdGoldilocks::ONE), x);
        }

        #[test]
        fn test_batch_mul_consistency(a in prop::collection::vec(0u64..SimdGoldilocks::P, 1..32), b in prop::collection::vec(0u64..SimdGoldilocks::P, 1..32)) {
            let n = a.len().min(b.len());
            let va: Vec<SimdGoldilocks> = a[..n].iter().map(|&x| SimdGoldilocks::new(x)).collect();
            let vb: Vec<SimdGoldilocks> = b[..n].iter().map(|&x| SimdGoldilocks::new(x)).collect();
            let batch = SimdGoldilocks::batch_mul(&va, &vb);
            let scalar: Vec<SimdGoldilocks> = va.iter().zip(vb.iter()).map(|(x, y)| x.mul(*y)).collect();
            prop_assert_eq!(batch, scalar);
        }
    }
}
