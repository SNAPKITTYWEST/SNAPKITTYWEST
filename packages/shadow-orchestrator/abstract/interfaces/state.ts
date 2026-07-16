// Shadow Orchestrator — State Interface v1
// CONSTITUTION: No implementation here. Contracts only.

export interface IState_v1 {
  /** Unique ID for this state snapshot */
  readonly id: string;

  /** Tick index — monotonically increasing, never resets */
  readonly tick: number;

  /** ISO timestamp of this state */
  readonly timestamp: string;

  /** The actual state payload — shape defined by the target system */
  readonly data: Record<string, unknown>;

  /** SHA-256 of previous state (genesis = "SHADOW_GENESIS") */
  readonly parentSeal: string;

  /** History of reasoning steps attached to this state */
  getHistory(): ReadonlyArray<IReasoningStep>;

  /** Produce next state from an action — does not mutate */
  transition(action: IAction): IState_v1;

  /** Compute SHA-256 seal of this state for WORM chain */
  seal(): string;
}

export interface IReasoningStep {
  readonly stepId: string;
  readonly tick: number;
  readonly agentId: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly proofObligation?: string;
  readonly satisfied: boolean;
}

export interface IAction {
  readonly actionId: string;
  readonly agentId: string;
  readonly type: string;
  readonly payload: unknown;
  readonly tick: number;
}
