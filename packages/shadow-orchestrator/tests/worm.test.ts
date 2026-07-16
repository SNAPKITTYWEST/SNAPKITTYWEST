import { appendEvent, getChain, getLastSeal, verifyChain, type WormChain, type WormEvent } from '../pages/00-worm/index.js';
import { GovernanceImpl, crisisLanguageDeny } from '../pages/02-governance/index.js';
import type { IAction, IReasoningStep, IState_v1 } from '../abstract/interfaces/index.js';

const EXPECTED_GENESIS_SEAL = 'b1ada656-worm-1e';

function resetWormChain(): void {
  const chain = getChain() as WormChain;
  chain.events.splice(0, chain.events.length);
}

function makeState(tick = 0): IState_v1 {
  return {
    id: `state-${tick}`,
    tick,
    timestamp: '2026-06-18T00:00:00.000Z',
    data: { tick },
    parentSeal: tick === 0 ? 'SHADOW_GENESIS' : `state-${tick - 1}`,
    getHistory(): ReadonlyArray<IReasoningStep> {
      return [];
    },
    transition(action: IAction): IState_v1 {
      return makeState(action.tick + 1);
    },
    seal(): string {
      return `state-seal-${tick}`;
    },
  };
}

function makeAction(tick: number, payload: unknown = { step: tick }, type = 'OBSERVE'): IAction {
  return {
    actionId: `action-${tick}`,
    agentId: 'agent-test',
    type,
    payload,
    tick,
  };
}

beforeEach(() => {
  resetWormChain();
});

test('chain is valid after 10 append operations', () => {
  for (let tick = 1; tick <= 10; tick++) {
    appendEvent(makeAction(tick), makeState(tick), 'ALLOW');
  }

  expect(getChain().events).toHaveLength(10);
  expect(verifyChain()).toEqual({ valid: true });
});

test('tampering with event 5 breaks verification from event 5 onward', () => {
  for (let tick = 1; tick <= 10; tick++) {
    appendEvent(makeAction(tick), makeState(tick), 'ALLOW');
  }

  const tamperedEvent = getChain().events[5] as WormEvent;
  Object.assign(tamperedEvent, { actionType: 'TAMPERED_ACTION' });

  expect(verifyChain()).toEqual({
    valid: false,
    brokenAt: 5,
    reason: 'seal mismatch',
  });
});

test('hard deny fires correctly on crisis language', () => {
  const governance = new GovernanceImpl([], [crisisLanguageDeny]);
  const verdict = governance.evaluate(
    makeAction(1, { message: 'I want to end my life' }),
    makeState(),
  );

  expect(verdict.kind).toBe('DENY');
  expect(verdict.reason).toBe('hard_deny: capability not granted');
});

test('genesis seal matches expected value', () => {
  expect(getLastSeal()).toBe(EXPECTED_GENESIS_SEAL);
});
