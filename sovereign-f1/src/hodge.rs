//! Hodge index

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HodgeIndex {
    pub signature: (usize, usize),
    pub positive: usize,
    pub negative: usize,
}

impl HodgeIndex {
    pub fn compute(dim: usize) -> Self {
        Self { signature: (dim, 0), positive: dim, negative: 0 }
    }

    pub fn is_positive_definite(&self) -> bool {
        self.negative == 0
    }
}
