// Shadow Orchestrator — Workflow Interface v1
// CONSTITUTION: No implementation here. Contracts only.

import type { IState_v1, IAction } from './state.js';

export interface IDAGNode_v1 {
  /** Unique node identifier */
  readonly nodeId: string;

  /** Human-readable name */
  readonly name: string;

  /** IDs of nodes that must complete before this one runs */
  readonly dependencies: ReadonlyArray<string>;

  /** Execute this node given current state — returns action to apply */
  execute(state: IState_v1): Promise<IAction>;

  /** Can this node run given current state? */
  canExecute(state: IState_v1): boolean;
}

export interface IWorkflow_v1 {
  /** All nodes in this workflow */
  readonly nodes: ReadonlyMap<string, IDAGNode_v1>;

  /** Entry point node IDs (no dependencies) */
  readonly entryPoints: ReadonlyArray<string>;

  /** Add a node — returns new workflow (immutable) */
  addNode(node: IDAGNode_v1): IWorkflow_v1;

  /** Get execution order respecting dependencies */
  topologicalOrder(): ReadonlyArray<string>;

  /** Run the full workflow from current state */
  run(state: IState_v1): Promise<IState_v1>;
}

export interface IWorkflowResult {
  readonly finalState: IState_v1;
  readonly executedNodes: ReadonlyArray<string>;
  readonly skippedNodes: ReadonlyArray<string>;
  readonly ticks: number;
  readonly wormSeal: string;
}
