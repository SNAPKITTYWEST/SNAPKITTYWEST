// Page 02 — Governance Implementation
// Implements IGovernance_v1. This is the Plasma Filter layer.
// No knowledge of other pages except through interfaces.

import type {
  IGovernance_v1, IValidator_v1, IVerdict, IAction, IState_v1, ICapabilityGrant
} from '../../abstract/interfaces/index.js';

export class GovernanceImpl implements IGovernance_v1 {
  readonly validators: ReadonlyArray<IValidator_v1>;
  readonly hardDenies: ReadonlyArray<(action: IAction) => boolean>;

  constructor(
    validators: IValidator_v1[] = [],
    hardDenies: Array<(action: IAction) => boolean> = []
  ) {
    this.validators = validators;
    this.hardDenies = hardDenies;
  }

  register(validator: IValidator_v1): IGovernance_v1 {
    return new GovernanceImpl(
      [...this.validators, validator],
      [...this.hardDenies]
    );
  }

  evaluate(action: IAction, state: IState_v1): IVerdict {
    // Hard denies first — cannot be overridden
    for (const deny of this.hardDenies) {
      if (deny(action)) {
        return {
          kind: 'DENY',
          reason: 'hard_deny: capability not granted',
          tick: action.tick,
          agentId: action.agentId,
          actionId: action.actionId,
        };
      }
    }

    // Run validators in order — first non-ALLOW short-circuits
    for (const validator of this.validators) {
      const verdict = validator.validate(action, state);
      if (verdict.kind !== 'ALLOW') return verdict;
    }

    return {
      kind: 'ALLOW',
      reason: 'all_validators_passed',
      tick: action.tick,
      agentId: action.agentId,
      actionId: action.actionId,
    };
  }
}

// Built-in validator: capability grant checker
export class CapabilityValidator implements IValidator_v1 {
  readonly validatorId = 'capability-grant-validator';
  readonly name = 'Capability Grant Validator';

  constructor(private readonly grants: ICapabilityGrant[]) {}

  validate(action: IAction, _state: IState_v1): IVerdict {
    const grant = this.grants.find(g => g.agentId === action.agentId);
    if (!grant) {
      return {
        kind: 'DENY',
        reason: `no_capability_grant: agent ${action.agentId} has no grant`,
        tick: action.tick,
        agentId: action.agentId,
        actionId: action.actionId,
      };
    }
    if (grant.deniedActionTypes.includes(action.type)) {
      return {
        kind: 'DENY',
        reason: `capability_denied: action ${action.type} is explicitly denied`,
        tick: action.tick,
        agentId: action.agentId,
        actionId: action.actionId,
      };
    }
    if (!grant.allowedActionTypes.includes('*') &&
        !grant.allowedActionTypes.includes(action.type)) {
      return {
        kind: 'DENY',
        reason: `capability_not_granted: action ${action.type} not in allowed list`,
        tick: action.tick,
        agentId: action.agentId,
        actionId: action.actionId,
      };
    }
    return {
      kind: 'ALLOW',
      reason: 'capability_granted',
      tick: action.tick,
      agentId: action.agentId,
      actionId: action.actionId,
    };
  }
}

// Built-in hard deny: crisis language routing for mental health AI
// (QMAI use case — Silverback capability constraint)
export const crisisLanguageDeny = (action: IAction): boolean => {
  const payload = JSON.stringify(action.payload).toLowerCase();
  const crisisTerms = ['suicide', 'self-harm', 'end my life', 'kill myself'];
  return crisisTerms.some(term => payload.includes(term));
};
