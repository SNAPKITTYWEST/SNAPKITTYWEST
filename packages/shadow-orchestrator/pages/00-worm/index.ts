// Page 00 — WORM Chain
// THE GOVERNANCE OVERLAY. Always first. Cannot be bypassed.
// This is the page they never wrote. We add it.

import type { IAction, IState_v1 } from '../../abstract/interfaces/index.js';

export interface WormEvent {
  index: number;
  tick: number;
  timestamp: string;
  agentId: string;
  actionType: string;
  actionId: string;
  stateId: string;
  verdict: string;
  seal: string;
  parentSeal: string;
}

export interface WormChain {
  events: WormEvent[];
  genesis: string;
}

const GENESIS = 'SHADOW_GENESIS:WORM_CHAIN_INIT';

// In-memory chain (Pages use localStorage for persistence — see index.html)
let chain: WormChain = {
  events: [],
  genesis: hashString(GENESIS),
};

export function getChain(): Readonly<WormChain> {
  return chain;
}

export function appendEvent(
  action: IAction,
  state: IState_v1,
  verdict: string
): WormEvent {
  const parentSeal = chain.events.length === 0
    ? chain.genesis
    : chain.events[chain.events.length - 1].seal;

  const event: WormEvent = {
    index: chain.events.length,
    tick: action.tick,
    timestamp: new Date().toISOString(),
    agentId: action.agentId,
    actionType: action.type,
    actionId: action.actionId,
    stateId: state.id,
    verdict,
    parentSeal,
    seal: '', // computed below
  };

  event.seal = computeSeal(event, parentSeal);
  chain.events.push(event);
  return event;
}

export function verifyChain(): { valid: boolean; brokenAt?: number; reason?: string } {
  let prev = chain.genesis;
  for (const event of chain.events) {
    const expected = computeSeal(event, prev);
    if (expected !== event.seal) {
      return { valid: false, brokenAt: event.index, reason: 'seal mismatch' };
    }
    prev = event.seal;
  }
  return { valid: true };
}

export function getLastSeal(): string {
  if (chain.events.length === 0) return chain.genesis;
  return chain.events[chain.events.length - 1].seal;
}

function computeSeal(event: Omit<WormEvent, 'seal'>, parentSeal: string): string {
  const payload = JSON.stringify({
    index: event.index,
    tick: event.tick,
    agentId: event.agentId,
    actionType: event.actionType,
    actionId: event.actionId,
    stateId: event.stateId,
    verdict: event.verdict,
    parentSeal,
  });
  return hashString(payload);
}

// SHA-256 via Web Crypto (browser) or crypto (Node)
function hashString(input: string): string {
  // Browser-safe sync approximation using djb2 for scaffold
  // Codex: replace with SubtleCrypto SHA-256 in final implementation
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16).padStart(8, '0') + '-worm-' + input.length.toString(16);
}
