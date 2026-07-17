//! Query router

use crate::agent::Agent;

#[derive(Debug, Clone)]
pub struct QueryRouter {
    pub agents: Vec<Agent>,
}

impl QueryRouter {
    pub fn new() -> Self {
        Self { agents: Vec::new() }
    }

    pub fn register(&mut self, agent: Agent) {
        self.agents.push(agent);
    }

    pub fn route(&self, query: &str) -> Option<&Agent> {
        self.agents.iter()
            .max_by_key(|a| a.score_query(query))
            .filter(|a| a.score_query(query) > 0)
    }
}

impl Default for QueryRouter {
    fn default() -> Self { Self::new() }
}
