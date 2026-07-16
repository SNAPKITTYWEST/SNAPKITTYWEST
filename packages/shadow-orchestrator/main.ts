import { fileURLToPath } from 'node:url';

import { appendEvent, verifyChain, getLastSeal, type WormEvent } from './pages/00-worm/index.js';
import { StateImpl } from './pages/01-state/index.js';
import { GovernanceImpl, CapabilityValidator, crisisLanguageDeny } from './pages/02-governance/index.js';
import { WorkflowImpl, MockLLMNode } from './pages/03-workflow/index.js';
import type { IAction, IState_v1, IVerdict, IWorkflow_v1 } from './abstract/interfaces/index.js';

export interface TickResult {
  readonly action: IAction;
  readonly verdict: IVerdict;
  readonly state: IState_v1;
  readonly wormEvent: WormEvent;
  readonly chainValid: boolean;
  readonly lastSeal: string;
  readonly trace: ReadonlyArray<PublicReasoningTraceEvent>;
}

export type PublicReasoningTracePhase =
  | 'RECEIVED'
  | 'GOVERNANCE_CHECK'
  | 'STATE_TRANSITION'
  | 'WORM_SEAL'
  | 'COMPLETE';

export interface PublicReasoningTraceEvent {
  readonly traceId: string;
  readonly phase: PublicReasoningTracePhase;
  readonly tick: number;
  readonly agentId: string;
  readonly actionId: string;
  readonly summary: string;
  readonly visibleToUser: true;
  readonly timestamp: string;
  readonly details?: Record<string, unknown>;
}

export type PublicReasoningTraceListener = (event: PublicReasoningTraceEvent) => void;

export class PublicReasoningTrace {
  private readonly events: PublicReasoningTraceEvent[] = [];
  private readonly listeners = new Set<PublicReasoningTraceListener>();

  subscribe(listener: PublicReasoningTraceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(
    phase: PublicReasoningTracePhase,
    action: IAction,
    summary: string,
    details: Record<string, unknown> = {},
  ): PublicReasoningTraceEvent {
    const event: PublicReasoningTraceEvent = {
      traceId: `${action.actionId}:${phase}:${this.events.length}`,
      phase,
      tick: action.tick,
      agentId: action.agentId,
      actionId: action.actionId,
      summary,
      visibleToUser: true,
      timestamp: new Date().toISOString(),
      details,
    };

    this.events.push(event);
    for (const listener of this.listeners) listener(event);
    return event;
  }

  snapshot(): ReadonlyArray<PublicReasoningTraceEvent> {
    return [...this.events];
  }

  clear(): void {
    this.events.splice(0, this.events.length);
  }
}

export class ShadowOrchestrator {
  private currentState: IState_v1;

  readonly governance: GovernanceImpl;
  readonly workflow: IWorkflow_v1;
  readonly trace: PublicReasoningTrace;

  constructor(opts: {
    state?: StateImpl;
    governance?: GovernanceImpl;
    workflow?: IWorkflow_v1;
    trace?: PublicReasoningTrace;
  } = {}) {
    this.currentState = opts.state ?? StateImpl.genesis();
    this.governance = opts.governance ?? new GovernanceImpl(
      [
        new CapabilityValidator([
          {
            grantId: 'grant-demo-agent',
            agentId: 'demo-agent',
            allowedActionTypes: ['OBSERVE', 'PLAN', 'EXECUTE', 'REFLECT', 'mock_llm_output'],
            deniedActionTypes: ['DESTROY'],
            seal: 'capability-grant-demo-agent',
          },
        ]),
      ],
      [crisisLanguageDeny],
    );
    this.workflow = opts.workflow ?? new WorkflowImpl(new Map([
      ['mock-llm', new MockLLMNode('mock-llm', 'Mock LLM', [], { result: 'model-invariant mock output' })],
    ]));
    this.trace = opts.trace ?? new PublicReasoningTrace();
  }

  get state(): IState_v1 {
    return this.currentState;
  }

  tick(action: IAction): TickResult {
    const traceStart = this.trace.snapshot().length;

    this.trace.emit('RECEIVED', action, 'Action received by Shadow Orchestrator.', {
      actionType: action.type,
    });

    const verdict = this.governance.evaluate(action, this.currentState);

    this.trace.emit('GOVERNANCE_CHECK', action, `Governance returned ${verdict.kind}.`, {
      verdict: verdict.kind,
      reason: verdict.reason,
    });

    if (verdict.kind === 'ALLOW') {
      this.currentState = this.currentState.transition(action);
      this.trace.emit('STATE_TRANSITION', action, 'State transition applied.', {
        stateId:        this.currentState.id,
        stateTick:      this.currentState.tick,
      });
    } else {
      this.trace.emit('STATE_TRANSITION', action, 'State transition blocked by governance.', {
        stateId: this.currentState.id,
        verdict: verdict.kind,
      });
    }

    const wormEvent = appendEvent(action, this.currentState, verdict.kind);
    const chainCheck = verifyChain();
    const lastSeal = getLastSeal();

    this.trace.emit('WORM_SEAL', action, 'Action verdict sealed to WORM chain.', {
      eventIndex: wormEvent.index,
      seal: lastSeal,
      chainValid: chainCheck.valid,
    });

    this.trace.emit('COMPLETE', action, 'Public reasoning trace complete.', {
      finalVerdict: verdict.kind,
      chainValid: chainCheck.valid,
    });

    return {
      action,
      verdict,
      state: this.currentState,
      wormEvent,
      chainValid: chainCheck.valid,
      lastSeal,
      trace: this.trace.snapshot().slice(traceStart),
    };
  }
}

export function createAction(
  tick: number,
  type: string,
  payload: unknown,
  agentId = 'demo-agent',
): IAction {
  return {
    actionId: `demo-action-${tick}-${type.toLowerCase()}`,
    agentId,
    type,
    payload,
    tick,
  };
}

export async function runDemo(): Promise<TickResult[]> {
  const orchestrator = new ShadowOrchestrator();
  const actions = [
    createAction(1, 'OBSERVE', { input: 'load shadow state' }),
    createAction(2, 'PLAN', { objective: 'compose pages through main.ts' }),
    createAction(3, 'EXECUTE', { step: 'append WORM event' }),
    createAction(4, 'REFLECT', { check: 'verify chain' }),
    createAction(5, 'EXECUTE', { step: 'complete demo run' }),
  ];

  const results = actions.map(action => orchestrator.tick(action));

  for (const result of results) {
    console.log(JSON.stringify({
      tick: result.action.tick,
      actionType: result.action.type,
      verdict: result.verdict.kind,
      stateId: result.state.id,
      wormSeal: result.lastSeal,
      chainValid: result.chainValid,
      trace: result.trace.map(event => ({
        phase: event.phase,
        summary: event.summary,
      })),
    }));
  }

  return results;
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  await runDemo();
}
