import {
  createAction,
  PublicReasoningTrace,
  ShadowOrchestrator,
} from '../main.js';

test('tick emits ordered public reasoning trace events', () => {
  const orchestrator = new ShadowOrchestrator();
  const result = orchestrator.tick(createAction(101, 'OBSERVE', { input: 'show user why this is allowed' }));

  expect(result.trace.map(event => event.phase)).toEqual([
    'RECEIVED',
    'GOVERNANCE_CHECK',
    'STATE_TRANSITION',
    'WORM_SEAL',
    'COMPLETE',
  ]);
  expect(result.trace.every(event => event.visibleToUser)).toBe(true);
  expect(result.trace[1].summary).toBe('Governance returned ALLOW.');
  expect(result.trace[3].details?.seal).toBe(result.lastSeal);
});

test('subscribers receive live trace events in emission order', () => {
  const trace = new PublicReasoningTrace();
  const phases: string[] = [];
  trace.subscribe(event => phases.push(event.phase));

  const orchestrator = new ShadowOrchestrator({ trace });
  orchestrator.tick(createAction(102, 'PLAN', { objective: 'stream trace to UI' }));

  expect(phases).toEqual([
    'RECEIVED',
    'GOVERNANCE_CHECK',
    'STATE_TRANSITION',
    'WORM_SEAL',
    'COMPLETE',
  ]);
});

test('denied actions emit blocked transition trace', () => {
  const orchestrator = new ShadowOrchestrator();
  const result = orchestrator.tick(createAction(
    103,
    'DESTROY',
    { input: 'denied capability' },
  ));

  expect(result.verdict.kind).toBe('DENY');
  expect(result.trace[2].phase).toBe('STATE_TRANSITION');
  expect(result.trace[2].summary).toBe('State transition blocked by governance.');
});
