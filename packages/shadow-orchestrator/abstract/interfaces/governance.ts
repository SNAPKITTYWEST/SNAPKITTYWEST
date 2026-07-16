// Shadow Orchestrator — Governance Interface v1
// CONSTITUTION: No implementation here. Contracts only.

import type { IState_v1, IAction } from './state.js';

export type VerdictKind = 'ALLOW' | 'DENY' | 'ROUTE_TO_HUMAN' | 'REQUIRE_PROOF';

export interface IVerdict {
  readonly kind: VerdictKind;
  readonly reason: string;
  readonly tick: number;
  readonly agentId: string;
  readonly actionId: string;
  readonly proofRequired?: string;
}

export interface IValidator_v1 {
  /** Unique ID for this validator */
  readonly validatorId: string;

  /** Human name */
  readonly name: string;

  /** Validate an action against current state — synchronous */
  validate(action: IAction, state: IState_v1): IVerdict;
}

export interface IGovernance_v1 {
  /** All registered validators */
  readonly validators: ReadonlyArray<IValidator_v1>;

  /** Register a new validator — returns new governance (immutable) */
  register(validator: IValidator_v1): IGovernance_v1;

  /**
   * Run all validators. Returns ALLOW only if ALL pass.
   * First DENY or ROUTE_TO_HUMAN short-circuits.
   */
  evaluate(action: IAction, state: IState_v1): IVerdict;

  /** Hard capability constraints — these cannot be overridden by any validator */
  readonly hardDenies: ReadonlyArray<(action: IAction) => boolean>;
}

export interface ICapabilityGrant {
  readonly grantId: string;
  readonly agentId: string;
  readonly allowedActionTypes: ReadonlyArray<string>;
  readonly deniedActionTypes: ReadonlyArray<string>;
  readonly expiresAtTick?: number;
  readonly seal: string;
}
