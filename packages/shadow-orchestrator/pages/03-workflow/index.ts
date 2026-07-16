// Page 03 — Workflow Implementation
// Implements IWorkflow_v1. Shadow of any target DAG orchestrator.

import type {
  IWorkflow_v1, IDAGNode_v1, IState_v1, IWorkflowResult
} from '../../abstract/interfaces/index.js';

export class WorkflowImpl implements IWorkflow_v1 {
  readonly nodes: ReadonlyMap<string, IDAGNode_v1>;

  constructor(nodes: Map<string, IDAGNode_v1> = new Map()) {
    this.nodes = nodes;
  }

  get entryPoints(): ReadonlyArray<string> {
    return Array.from(this.nodes.values())
      .filter(n => n.dependencies.length === 0)
      .map(n => n.nodeId);
  }

  addNode(node: IDAGNode_v1): IWorkflow_v1 {
    const next = new Map(this.nodes);
    next.set(node.nodeId, node);
    return new WorkflowImpl(next);
  }

  topologicalOrder(): ReadonlyArray<string> {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const node = this.nodes.get(id);
      if (!node) return;
      for (const dep of node.dependencies) visit(dep);
      order.push(id);
    };

    for (const id of this.nodes.keys()) visit(id);
    return order;
  }

  async run(state: IState_v1): Promise<IState_v1> {
    const order = this.topologicalOrder();
    let current = state;
    const executed: string[] = [];
    const skipped: string[] = [];

    for (const nodeId of order) {
      const node = this.nodes.get(nodeId)!;
      if (!node.canExecute(current)) {
        skipped.push(nodeId);
        continue;
      }
      const action = await node.execute(current);
      current = current.transition(action);
      executed.push(nodeId);
    }

    return current;
  }
}

// Test page node — mocks LLM entirely, zero API cost
// Use this to prove model-invariant production
export class MockLLMNode implements IDAGNode_v1 {
  constructor(
    readonly nodeId: string,
    readonly name: string,
    readonly dependencies: string[],
    private readonly mockOutput: unknown = { result: 'mock' }
  ) {}

  canExecute(_state: IState_v1): boolean { return true; }

  async execute(state: IState_v1) {
    return {
      actionId: crypto.randomUUID(),
      agentId: this.nodeId,
      type: 'mock_llm_output',
      payload: this.mockOutput,
      tick: state.tick,
    };
  }
}
