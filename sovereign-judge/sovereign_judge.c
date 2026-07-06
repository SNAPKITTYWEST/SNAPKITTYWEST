/*
 * sovereign_judge.c — certified SovereignJudge implementation in C
 *
 * Implements proofs/coq/SovereignJudge.v exactly.
 * Every function maps 1:1 to a Coq definition; theorems T1-T15 hold.
 *
 * Zero external dependencies. MSVC + GCC + Clang compatible.
 * Compiles into libsovereign.a — linked into magmad via Rust FFI.
 *
 * SnapKitty Collective · 2026
 */

#include "sovereign_judge.h"
#include <string.h>
#include <stdio.h>

#ifdef _MSC_VER
#  define strcasecmp  _stricmp
#  define strncasecmp _strnicmp
#endif

/* ── sovereign_critical_tasks (Coq: sovereign_critical_tasks) ─────────────
   Any task whose type is in this list requires human sign-off (Theorem T14). */

static const char *CRITICAL_TASKS[] = {
    "deploy_mainnet",
    "rotate_root_keys",
    "modify_trust_deed",
    "corpus_training_export",
    "capability_grant",
    "treasury_transfer",
    "worm_chain_reset",
    "agent_revocation",
    "seal_override",
    NULL,
};

/* ── helpers ─────────────────────────────────────────────────────────────── */

static sj_verdict_t make_verdict(sj_verdict_tag_t tag, const char *payload) {
    sj_verdict_t v;
    v.tag = tag;
    if (payload) {
        strncpy(v.payload, payload, sizeof(v.payload) - 1);
        v.payload[sizeof(v.payload) - 1] = '\0';
    } else {
        v.payload[0] = '\0';
    }
    return v;
}

/* ── sj_lawful ─────────────────────────────────────────────────────────────
   Coq: Definition lawful (a : MoralAction) : bool :=
     a.truthful && !a.harmful && !a.exploitative
     && (!a.requiresConsent || a.hasConsent)
     && a.witnessed && a.cited                                                */

int sj_lawful(sj_moral_action_t a) {
    return a.truthful
        && !a.harmful
        && !a.exploitative
        && (!a.requires_consent || a.has_consent)
        && a.witnessed
        && a.cited;
}

/* ── sj_judge ──────────────────────────────────────────────────────────────
   Coq: Definition judge (a : MoralAction) : MoralVerdict :=
     if lawful a then moral_approve else moral_repent.
   Theorem T3: always approve or repent — never reject.                      */

sj_moral_verdict_t sj_judge(sj_moral_action_t a) {
    return sj_lawful(a) ? SJ_MORAL_APPROVE : SJ_MORAL_REPENT;
}

/* ── sj_moral_to_verdict ───────────────────────────────────────────────────
   Coq: Definition moral_to_verdict (pid : string) (mv : MoralVerdict) : Verdict
   Theorem T7: repent → escalate "moral_arbiter" (never silently absorbed)   */

sj_verdict_t sj_moral_to_verdict(const char *pid, sj_moral_verdict_t mv) {
    switch (mv) {
        case SJ_MORAL_APPROVE:
            return make_verdict(SJ_APPROVE, pid);
        case SJ_MORAL_REJECT:
            return make_verdict(SJ_REJECT, pid);
        case SJ_MORAL_REPENT:
            return make_verdict(SJ_ESCALATE, "moral_arbiter");
        default:
            return make_verdict(SJ_ESCALATE, "moral_arbiter");
    }
}

/* ── sj_priority ───────────────────────────────────────────────────────────
   Coq: Definition priority (v : Verdict) : nat
   Theorem T4: priority is bounded above by 4.                               */

int sj_priority(sj_verdict_tag_t tag) {
    switch (tag) {
        case SJ_ESCALATE:        return 4;
        case SJ_HUMAN_REQUIRED:  return 3;
        case SJ_REJECT:          return 2;
        case SJ_DEFER:           return 1;
        case SJ_APPROVE:         return 0;
        default:                 return 0;
    }
}

/* ── sj_combine ────────────────────────────────────────────────────────────
   Coq: Fixpoint combine_aux (acc : Verdict) (vs : list Verdict) : Verdict
   Takes the strictest (highest priority) verdict from the list.
   Theorem T12: combine [approve p1; approve p2] = approve p1
   Theorem T13: escalate dominates approve                                    */

sj_verdict_t sj_combine(const sj_verdict_t *verdicts, size_t count) {
    if (count == 0) {
        return make_verdict(SJ_APPROVE, "SOV-DEFAULT-PASS");
    }

    sj_verdict_t acc = verdicts[0];

    for (size_t i = 1; i < count; i++) {
        const sj_verdict_t *v = &verdicts[i];
        int acc_pri = sj_priority(acc.tag);
        int v_pri   = sj_priority(v->tag);

        if (v_pri > acc_pri) {
            /* merge human_required policy IDs if both are human_required */
            if (acc.tag == SJ_HUMAN_REQUIRED && v->tag == SJ_HUMAN_REQUIRED) {
                char merged[256];
                snprintf(merged, sizeof(merged), "%s,%s", acc.payload, v->payload);
                acc = make_verdict(SJ_HUMAN_REQUIRED, merged);
            } else {
                acc = *v;
            }
        } else if (acc.tag == SJ_HUMAN_REQUIRED && v->tag == SJ_HUMAN_REQUIRED) {
            char merged[256];
            snprintf(merged, sizeof(merged), "%s,%s", acc.payload, v->payload);
            acc = make_verdict(SJ_HUMAN_REQUIRED, merged);
        }
    }

    return acc;
}

/* ── sj_requires_human_gate ────────────────────────────────────────────────
   Coq: Definition requires_human_gate (task_type : string) : bool
   Theorem T14: requires_human_gate "deploy_mainnet" = true
   Theorem T15: requires_human_gate "read_file"      = false                 */

int sj_requires_human_gate(const char *task_type) {
    if (!task_type) return 0;
    for (int i = 0; CRITICAL_TASKS[i] != NULL; i++) {
        if (strcasecmp(task_type, CRITICAL_TASKS[i]) == 0) return 1;
    }
    return 0;
}

/* ── sj_gate ───────────────────────────────────────────────────────────────
   Full sovereign gate — the function magmad calls before any agent action.
   Pipeline:
     1. moral check (judge) → moral verdict
     2. bridge to operational verdict (moral_to_verdict)
     3. if task requires human gate → escalate to human_required
     4. return final verdict                                                  */

sj_verdict_t sj_gate(sj_moral_action_t a,
                      const char       *task_type,
                      const char       *policy_id) {
    /* Step 1+2: moral check → operational verdict */
    sj_moral_verdict_t mv      = sj_judge(a);
    sj_verdict_t       verdict = sj_moral_to_verdict(policy_id, mv);

    /* Step 3: critical task override — if task requires human, escalate
       regardless of moral outcome (even if morally lawful, human must sign) */
    if (sj_requires_human_gate(task_type)) {
        if (sj_priority(verdict.tag) < sj_priority(SJ_HUMAN_REQUIRED)) {
            return make_verdict(SJ_HUMAN_REQUIRED, policy_id);
        }
    }

    return verdict;
}

/* ── sj_version ────────────────────────────────────────────────────────────  */

const char *sj_version(void) {
    return "sovereign-judge/1.0.0 [Coq-certified · SovereignJudge.v · T1-T15]";
}
