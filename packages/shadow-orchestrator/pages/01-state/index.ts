// Page 01 — State Implementation
// Implements IState_v1. No knowledge of other pages.

import type { IState_v1, IReasoningStep, IAction } from '../../abstract/interfaces/index.js';

export class StateImpl implements IState_v1 {
  readonly id: string;
  readonly tick: number;
  readonly timestamp: string;
  readonly data: Record<string, unknown>;
  readonly parentSeal: string;

  private readonly history: IReasoningStep[];

  constructor(opts: {
    id?: string;
    tick?: number;
    data?: Record<string, unknown>;
    parentSeal?: string;
    history?: IReasoningStep[];
  } = {}) {
    const tick = opts.tick ?? 0;
    const data = opts.data ?? {};
    const parentSeal = opts.parentSeal ?? 'SHADOW_GENESIS';

    this.id = opts.id ?? makeStateId(tick, data, parentSeal);
    this.tick = tick;
    this.timestamp = new Date().toISOString();
    this.data = data;
    this.parentSeal = parentSeal;
    this.history = opts.history ?? [];
  }

  getHistory(): ReadonlyArray<IReasoningStep> {
    return this.history;
  }

  transition(action: IAction): IState_v1 {
    const step: IReasoningStep = {
      stepId: `step-${action.tick}-${action.agentId}-${action.actionId}`,
      tick: action.tick,
      agentId: action.agentId,
      input: action.payload,
      output: null,
      satisfied: true,
    };

    return new StateImpl({
      tick: this.tick + 1,
      data: { ...this.data, lastAction: action.type, lastAgent: action.agentId },
      parentSeal: this.seal(),
      history: [...this.history, step],
    });
  }

  seal(): string {
    const payload = JSON.stringify({
      id: this.id,
      tick: this.tick,
      data: this.data,
      parentSeal: this.parentSeal,
    });
    // Codex: replace with SHA-256 via SubtleCrypto
    let hash = 5381;
    for (let i = 0; i < payload.length; i++) {
      hash = ((hash << 5) + hash) ^ payload.charCodeAt(i);
      hash = hash >>> 0;
    }
    return 'state-' + hash.toString(16).padStart(16, '0');
  }

  static genesis(): StateImpl {
    return new StateImpl({ parentSeal: 'SHADOW_GENESIS', tick: 0 });
  }
}

function makeStateId(tick: number, data: Record<string, unknown>, parentSeal: string): string {
  const payload = JSON.stringify({ tick, data, parentSeal });
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(i);
    hash = hash >>> 0;
  }
  return `state-${tick}-${hash.toString(16).padStart(8, '0')}`;
}
