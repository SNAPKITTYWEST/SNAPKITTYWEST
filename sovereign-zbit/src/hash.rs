//! Hash utilities

use sha2::{Sha256, Digest};

pub fn sha256(data: &[u8]) -> String {
    format!("{:x}", Sha256::digest(data))
}

pub fn double_sha256(data: &[u8]) -> String {
    let first = Sha256::digest(data);
    format!("{:x}", Sha256::digest(&first))
}
