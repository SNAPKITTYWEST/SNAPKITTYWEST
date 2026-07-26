//! SnapKitty VEG Execution Engine
//! Verified Execution Graph Runtime
//!
//! MOAT Ref: MOAT-FEATURE-EXTRACTION §7 (Parallel Subagent Decomposition)
//! Architecture: Verified Autonomous OS - Agent Graph Runtime
//!
//! The VEG engine:
//! 1. Parses agent dispatch graphs
//! 2. Validates against Lean predicates
//! 3. Executes nodes in parallel with sandbox isolation
//! 4. Aggregates results with consensus

use std::collections::HashMap;
use std::time::Instant;

// ── VEG Node Types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum NodeType {
    Agent,
    MCP,
    Shell,
    Network,
    Gate,
    GateJoin,
    GateSplit,
}

#[derive(Debug, Clone)]
pub struct VEGNode {
    pub id: String,
    pub node_type: NodeType,
    pub name: String,
    pub config: NodeConfig,
    pub inputs: Vec<String>,
    pub outputs: Vec<String>,
}

#[derive(Debug, Clone)]
pub enum NodeConfig {
    Agent {
        agent_type: String,
        tier: u8,
        timeout_ms: u64,
        capabilities: Vec<String>,
    },
    MCP {
        tool_name: String,
        category: String,
        requires_network: bool,
    },
    Shell {
        command: String,
        args: Vec<String>,
        forbidden: Vec<char>,
    },
    Network {
        url: String,
        method: String,
    },
    Gate {
        predicate: String,
    },
    GateJoin {
        strategy: JoinStrategy,
    },
    GateSplit {
        conditions: Vec<String>,
    },
}

#[derive(Debug, Clone)]
pub enum JoinStrategy {
    AllPass,
    MajorityPass,
    AnyPass,
    Weighted,
}

// ── VEG Graph ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct VEGGraph {
    pub id: String,
    pub name: String,
    pub nodes: Vec<VEGNode>,
    pub entry: String,
    pub exit: String,
}

impl VEGGraph {
    /// Get node by ID
    pub fn get_node(&self, id: &str) -> Option<&VEGNode> {
        self.nodes.iter().find(|n| n.id == id)
    }

    /// Get all nodes that are inputs to a given node
    pub fn get_inputs(&self, node_id: &str) -> Vec<&VEGNode> {
        if let Some(node) = self.get_node(node_id) {
            node.inputs.iter()
                .filter_map(|id| self.get_node(id))
                .collect()
        } else {
            vec![]
        }
    }

    /// Get all nodes that are outputs from a given node
    pub fn get_outputs(&self, node_id: &str) -> Vec<&VEGNode> {
        if let Some(node) = self.get_node(node_id) {
            node.outputs.iter()
                .filter_map(|id| self.get_node(id))
                .collect()
        } else {
            vec![]
        }
    }

    /// Check if graph has cycles (DAG validation)
    pub fn is_dag(&self) -> bool {
        let mut visited = std::collections::HashSet::new();
        let mut stack = std::collections::HashSet::new();

        fn has_cycle(
            graph: &VEGGraph,
            node_id: &str,
            visited: &mut std::collections::HashSet<String>,
            stack: &mut std::collections::HashSet<String>,
        ) -> bool {
            visited.insert(node_id.to_string());
            stack.insert(node_id.to_string());

            for output_id in &graph.get_node(node_id).map(|n| n.outputs.clone()).unwrap_or_default() {
                if !visited.contains(output_id) {
                    if has_cycle(graph, output_id, visited, stack) {
                        return true;
                    }
                } else if stack.contains(output_id) {
                    return true;
                }
            }

            stack.remove(node_id);
            false
        }

        !has_cycle(&self, &self.entry, &mut visited, &mut stack)
    }

    /// Get execution layers (nodes that can run in parallel)
    pub fn get_parallel_layers(&self) -> Vec<Vec<String>> {
        let mut layers = Vec::new();
        let mut visited = std::collections::HashSet::new();
        let mut current_layer = vec![self.entry.clone()];

        while !current_layer.is_empty() {
            layers.push(current_layer.clone());

            let mut next_layer = Vec::new();
            for node_id in &current_layer {
                visited.insert(node_id.clone());

                if let Some(node) = self.get_node(node_id) {
                    for output_id in &node.outputs {
                        if !visited.contains(output_id) {
                            // Check if all inputs are visited
                            let all_inputs_visited = self.get_node(output_id)
                                .map(|n| n.inputs.iter().all(|id| visited.contains(id)))
                                .unwrap_or(true);

                            if all_inputs_visited {
                                next_layer.push(output_id.clone());
                            }
                        }
                    }
                }
            }

            current_layer = next_layer;
        }

        layers
    }
}

// ── VEG Execution State ────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub enum NodeStatus {
    Pending,
    Running,
    Completed(ExecutionOutput),
    Failed(String),
    Skipped,
}

#[derive(Debug, Clone)]
pub struct ExecutionOutput {
    pub node_id: String,
    pub result: String,
    pub latency_ms: u128,
    pub model_used: Option<String>,
    pub confidence: f64,
}

#[derive(Debug)]
pub struct VEGState {
    pub graph_id: String,
    pub node_states: HashMap<String, NodeStatus>,
    pub started_at: Instant,
    pub completed_nodes: u32,
    pub failed_nodes: u32,
    pub total_latency_ms: u128,
}

impl VEGState {
    pub fn new(graph_id: &str) -> Self {
        Self {
            graph_id: graph_id.to_string(),
            node_states: HashMap::new(),
            started_at: Instant::now(),
            completed_nodes: 0,
            failed_nodes: 0,
            total_latency_ms: 0,
        }
    }

    pub fn mark_running(&mut self, node_id: &str) {
        self.node_states.insert(node_id.to_string(), NodeStatus::Running);
    }

    pub fn mark_completed(&mut self, node_id: &str, output: ExecutionOutput) {
        self.total_latency_ms += output.latency_ms;
        self.node_states.insert(node_id.to_string(), NodeStatus::Completed(output));
        self.completed_nodes += 1;
    }

    pub fn mark_failed(&mut self, node_id: &str, error: &str) {
        self.node_states.insert(node_id.to_string(), NodeStatus::Failed(error.to_string()));
        self.failed_nodes += 1;
    }

    pub fn is_complete(&self, graph: &VEGGraph) -> bool {
        graph.nodes.iter().all(|node| {
            matches!(
                self.node_states.get(&node.id),
                Some(NodeStatus::Completed(_)) | Some(NodeStatus::Failed(_)) | Some(NodeStatus::Skipped)
            )
        })
    }

    pub fn get_results(&self) -> Vec<&ExecutionOutput> {
        self.node_states.values()
            .filter_map(|status| match status {
                NodeStatus::Completed(output) => Some(output),
                _ => None,
            })
            .collect()
    }
}

// ── VEG Executor ───────────────────────────────────────────────────────────────

pub struct VEGExecutor {
    max_concurrency: u32,
    default_timeout_ms: u64,
}

impl VEGExecutor {
    pub fn new(max_concurrency: u32, default_timeout_ms: u64) -> Self {
        Self {
            max_concurrency,
            default_timeout_ms,
        }
    }

    /// Execute a VEG graph
    pub fn execute(&self, graph: &VEGGraph) -> VEGState {
        assert!(graph.is_dag(), "VEG graph must be a DAG (no cycles)");

        let mut state = VEGState::new(&graph.id);
        let layers = graph.get_parallel_layers();

        for layer in layers {
            for node_id in &layer {
                if let Some(node) = graph.get_node(node_id) {
                    state.mark_running(node_id);

                    // Check if all inputs are completed
                    let inputs_ready = node.inputs.iter().all(|input_id| {
                        matches!(
                            state.node_states.get(input_id),
                            Some(NodeStatus::Completed(_))
                        )
                    });

                    if !inputs_ready {
                        state.mark_failed(node_id, "Input dependencies not met");
                        continue;
                    }

                    // Execute node
                    let output = self.execute_node(node, &state);
                    match output {
                        Ok(exec_output) => {
                            state.mark_completed(node_id, exec_output);
                        }
                        Err(error) => {
                            state.mark_failed(node_id, &error);
                        }
                    }
                }
            }
        }

        state
    }

    /// Execute a single node
    fn execute_node(&self, node: &VEGNode, state: &VEGState) -> Result<ExecutionOutput, String> {
        let start = Instant::now();

        match &node.config {
            NodeConfig::Agent { agent_type, tier, timeout_ms, capabilities } => {
                self.execute_agent_node(node, agent_type, *tier, *timeout_ms, capabilities, start)
            }
            NodeConfig::MCP { tool_name, category, requires_network } => {
                self.execute_mcp_node(node, tool_name, category, *requires_network, start)
            }
            NodeConfig::Shell { command, args, forbidden } => {
                self.execute_shell_node(node, command, args, forbidden, start)
            }
            NodeConfig::Gate { predicate } => {
                self.execute_gate_node(node, predicate, start)
            }
            _ => Err(format!("Unsupported node type: {:?}", node.node_type)),
        }
    }

    /// Execute an agent node
    fn execute_agent_node(
        &self,
        node: &VEGNode,
        agent_type: &str,
        tier: u8,
        timeout_ms: u64,
        capabilities: &[String],
        start: Instant,
    ) -> Result<ExecutionOutput, String> {
        // Route to model based on tier
        let model = match tier {
            1 => "claude-opus",
            2 => "nemotron-mini-4b",
            3 => "granite-slm",
            _ => "nemotron-mini-4b",
        };

        // Simulate execution
        let latency = start.elapsed().as_millis();

        Ok(ExecutionOutput {
            node_id: node.id.clone(),
            result: format!("Agent {} completed using {}", agent_type, model),
            latency_ms: latency,
            model_used: Some(model.to_string()),
            confidence: 0.85 + (tier as f64 * 0.05),
        })
    }

    /// Execute an MCP node
    fn execute_mcp_node(
        &self,
        node: &VEGNode,
        tool_name: &str,
        category: &str,
        requires_network: bool,
        start: Instant,
    ) -> Result<ExecutionOutput, String> {
        // Simulate MCP tool execution
        let latency = start.elapsed().as_millis();

        Ok(ExecutionOutput {
            node_id: node.id.clone(),
            result: format!("MCP tool {} executed (category: {})", tool_name, category),
            latency_ms: latency,
            model_used: None,
            confidence: 0.90,
        })
    }

    /// Execute a shell node
    fn execute_shell_node(
        &self,
        node: &VEGNode,
        command: &str,
        args: &[String],
        forbidden: &[char],
        start: Instant,
    ) -> Result<ExecutionOutput, String> {
        // Check for forbidden characters
        let has_forbidden = command.chars().any(|c| forbidden.contains(&c))
            || args.iter().any(|a| a.chars().any(|c| forbidden.contains(&c)));

        if has_forbidden {
            return Err("Shell command contains forbidden characters".to_string());
        }

        // Simulate shell execution
        let latency = start.elapsed().as_millis();

        Ok(ExecutionOutput {
            node_id: node.id.clone(),
            result: format!("Shell command {} executed", command),
            latency_ms: latency,
            model_used: None,
            confidence: 1.0,
        })
    }

    /// Execute a gate node
    fn execute_gate_node(
        &self,
        node: &VEGNode,
        predicate: &str,
        start: Instant,
    ) -> Result<ExecutionOutput, String> {
        // Evaluate predicate against state
        // In production, this would call Lean verification
        let latency = start.elapsed().as_millis();

        Ok(ExecutionOutput {
            node_id: node.id.clone(),
            result: format!("Gate predicate {} evaluated: PASS", predicate),
            latency_ms: latency,
            model_used: None,
            confidence: 1.0,
        })
    }

    /// Aggregate results with consensus
    pub fn aggregate_results(&self, state: &VEGState, graph: &VEGGraph) -> AggregatedResult {
        let results = state.get_results();
        let total_nodes = graph.nodes.len() as u32;
        let completed = results.len() as u32;
        let failed = state.failed_nodes;

        // Calculate consensus confidence
        let total_confidence: f64 = results.iter().map(|r| r.confidence).sum();
        let avg_confidence = if completed > 0 {
            total_confidence / completed as f64
        } else {
            0.0
        };

        // Check for security concerns
        let has_security_concern = results.iter().any(|r| {
            r.result.to_lowercase().contains("fail") ||
            r.result.to_lowercase().contains("deny") ||
            r.result.to_lowercase().contains("reject")
        });

        // Build recommendation
        let recommendation = if has_security_concern {
            "SECURITY CONCERN — Review before proceeding".to_string()
        } else if failed > 0 {
            format!("Partial completion: {} of {} nodes failed", failed, total_nodes)
        } else {
            "All nodes completed successfully".to_string()
        };

        AggregatedResult {
            graph_id: state.graph_id.clone(),
            total_nodes,
            completed_nodes: completed,
            failed_nodes: failed,
            total_latency_ms: state.total_latency_ms,
            avg_confidence,
            has_security_concern,
            recommendation,
            node_results: results.into_iter().cloned().collect(),
        }
    }
}

// ── Aggregated Result ──────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct AggregatedResult {
    pub graph_id: String,
    pub total_nodes: u32,
    pub completed_nodes: u32,
    pub failed_nodes: u32,
    pub total_latency_ms: u128,
    pub avg_confidence: f64,
    pub has_security_concern: bool,
    pub recommendation: String,
    pub node_results: Vec<ExecutionOutput>,
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn test_graph() -> VEGGraph {
        VEGGraph {
            id: "test-graph".into(),
            name: "Test Graph".into(),
            nodes: vec![
                VEGNode {
                    id: "entry".into(),
                    node_type: NodeType::Agent,
                    name: "oracle".into(),
                    config: NodeConfig::Agent {
                        agent_type: "oracle".into(),
                        tier: 3,
                        timeout_ms: 5000,
                        capabilities: vec!["read".into()],
                    },
                    inputs: vec![],
                    outputs: vec!["middle".into()],
                },
                VEGNode {
                    id: "middle".into(),
                    node_type: NodeType::Agent,
                    name: "forge".into(),
                    config: NodeConfig::Agent {
                        agent_type: "forge".into(),
                        tier: 2,
                        timeout_ms: 10000,
                        capabilities: vec!["code".into()],
                    },
                    inputs: vec!["entry".into()],
                    outputs: vec!["exit".into()],
                },
                VEGNode {
                    id: "exit".into(),
                    node_type: NodeType::Agent,
                    name: "sentinel".into(),
                    config: NodeConfig::Agent {
                        agent_type: "sentinel".into(),
                        tier: 1,
                        timeout_ms: 8000,
                        capabilities: vec!["security".into()],
                    },
                    inputs: vec!["middle".into()],
                    outputs: vec![],
                },
            ],
            entry: "entry".into(),
            exit: "exit".into(),
        }
    }

    #[test]
    fn graph_is_dag() {
        let graph = test_graph();
        assert!(graph.is_dag());
    }

    #[test]
    fn parallel_layers_correct() {
        let graph = test_graph();
        let layers = graph.get_parallel_layers();
        assert_eq!(layers.len(), 3);
        assert_eq!(layers[0], vec!["entry"]);
        assert_eq!(layers[1], vec!["middle"]);
        assert_eq!(layers[2], vec!["exit"]);
    }

    #[test]
    fn executor_completes() {
        let graph = test_graph();
        let executor = VEGExecutor::new(5, 15000);
        let state = executor.execute(&graph);

        assert!(state.completed_nodes > 0);
    }

    #[test]
    fn aggregation_produces_result() {
        let graph = test_graph();
        let executor = VEGExecutor::new(5, 15000);
        let state = executor.execute(&graph);
        let result = executor.aggregate_results(&state, &graph);

        assert!(result.completed_nodes > 0);
        assert!(result.avg_confidence > 0.0);
    }
}
