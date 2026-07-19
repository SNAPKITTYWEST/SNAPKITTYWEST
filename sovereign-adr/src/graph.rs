//! Rule graph with NF-style stratification

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleNode {
    pub id: usize,
    pub label: String,
    pub stratification_level: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleEdge {
    pub from: usize,
    pub to: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleGraph {
    pub nodes: Vec<RuleNode>,
    pub edges: Vec<RuleEdge>,
}

impl RuleGraph {
    pub fn new() -> Self {
        Self { nodes: Vec::new(), edges: Vec::new() }
    }

    pub fn add_node(&mut self, label: &str, level: u8) -> usize {
        let id = self.nodes.len();
        self.nodes.push(RuleNode { id, label: label.to_string(), stratification_level: level });
        id
    }

    pub fn add_edge(&mut self, from: usize, to: usize) {
        self.edges.push(RuleEdge { from, to });
    }

    pub fn is_stratified(&self) -> bool {
        for edge in &self.edges {
            let from_node = &self.nodes[edge.from];
            let to_node = &self.nodes[edge.to];
            if from_node.stratification_level >= to_node.stratification_level {
                return false;
            }
        }
        true
    }
}

impl Default for RuleGraph {
    fn default() -> Self { Self::new() }
}
