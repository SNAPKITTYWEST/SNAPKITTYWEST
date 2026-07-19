//! Verifier

use crate::theorem::Theorem;
use crate::proof::Proof;

pub struct Verifier;

impl Verifier {
    pub fn verify(theorem: &Theorem, proof: &Proof) -> bool {
        theorem.proven && proof.valid && proof.theorem == theorem.name
    }
}
