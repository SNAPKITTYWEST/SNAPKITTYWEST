/*
 * sovereign_judge.h — C implementation of the certified SovereignJudge
 *
 * Faithful translation of proofs/coq/SovereignJudge.v
 * Every function here has a corresponding Coq theorem proving it correct.
 * The proof is the spec; this is the certified implementation.
 *
 * Theorems preserved (see SovereignJudge.v for full proofs):
 *   T1  approved_is_lawful        — approve ↔ lawful
 *   T2  repent_implies_not_lawful — repent ↔ ¬lawful
 *   T3  verdict_exhaustive        — judge always returns approve or repent
 *   T7  repent_escalates          — repent → escalate "moral_arbiter"
 *   T14 deploy_mainnet_requires_human — critical task gate
 *
 * SnapKitty Collective · 2026
 */

#ifndef SOVEREIGN_JUDGE_H
#define SOVEREIGN_JUDGE_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ── MoralAction — 7 boolean predicates (Coq: Record MoralAction) ───────── */

typedef struct {
    int truthful;          /* action is truthful                        */
    int harmful;           /* action causes harm                        */
    int exploitative;      /* action is exploitative                    */
    int requires_consent;  /* action requires consent to proceed        */
    int has_consent;       /* consent has been obtained                 */
    int witnessed;         /* action is witnessed (provable)            */
    int cited;             /* action cites evidence                     */
} sj_moral_action_t;

/* ── MoralVerdict — 3 cases (Coq: Inductive MoralVerdict) ──────────────── */

typedef enum {
    SJ_MORAL_APPROVE = 0,  /* judge returned moral_approve              */
    SJ_MORAL_REJECT  = 1,  /* explicit moral rejection (unused by judge)*/
    SJ_MORAL_REPENT  = 2,  /* action fails lawful — escalate required   */
} sj_moral_verdict_t;

/* ── Operational Verdict — 5 cases (Coq: Inductive Verdict) ─────────────── */
/* Priority order (strict): escalate > human_required > reject > defer > approve */

typedef enum {
    SJ_APPROVE        = 0,  /* priority 0 — pass                        */
    SJ_DEFER          = 1,  /* priority 1 — hold for later              */
    SJ_REJECT         = 2,  /* priority 2 — deny                        */
    SJ_HUMAN_REQUIRED = 3,  /* priority 3 — must have human sign-off    */
    SJ_ESCALATE       = 4,  /* priority 4 — escalate to arbiter         */
} sj_verdict_tag_t;

typedef struct {
    sj_verdict_tag_t tag;
    char             payload[256];  /* policy_id / reason / target / ids */
} sj_verdict_t;

/* ── lawful — Coq: Definition lawful (a : MoralAction) : bool ───────────── */
/*   truthful && !harmful && !exploitative
 *   && (!requiresConsent || hasConsent)
 *   && witnessed && cited                                                     */

int sj_lawful(sj_moral_action_t a);

/* ── judge — Coq: Definition judge (a : MoralAction) : MoralVerdict ─────── */
/*   if lawful(a) → moral_approve  else → moral_repent
 *   Theorem T3: always returns approve or repent, never reject                */

sj_moral_verdict_t sj_judge(sj_moral_action_t a);

/* ── moral_to_verdict — bridge from moral to operational verdict ──────────── */
/*   moral_approve → approve(pid)
 *   moral_reject  → reject(pid)
 *   moral_repent  → escalate("moral_arbiter")   [Theorem T7]                 */

sj_verdict_t sj_moral_to_verdict(const char *pid, sj_moral_verdict_t mv);

/* ── priority — Coq: Definition priority (v : Verdict) : nat ────────────── */

int sj_priority(sj_verdict_tag_t tag);

/* ── combine — fold over verdicts, taking the strictest ─────────────────── */
/*   Empty list → approve("SOV-DEFAULT-PASS")   [Coq: combine [] = approve]
 *   Theorem T13: escalate dominates approve in combine                        */

sj_verdict_t sj_combine(const sj_verdict_t *verdicts, size_t count);

/* ── requires_human_gate — Coq: Definition requires_human_gate ──────────── */
/*   Returns 1 if task_type is in sovereign_critical_tasks list
 *   Theorem T14: "deploy_mainnet" → 1
 *   Theorem T15: "read_file"      → 0                                        */

int sj_requires_human_gate(const char *task_type);

/* ── Full gate — combines moral check + human gate check ─────────────────── */
/*   Returns the final operational verdict for (action, task_type, policy_id).
 *   This is the function magmad calls before executing any agent action.      */

sj_verdict_t sj_gate(sj_moral_action_t a,
                      const char       *task_type,
                      const char       *policy_id);

/* ── Version ─────────────────────────────────────────────────────────────── */

const char *sj_version(void);

#ifdef __cplusplus
}
#endif

#endif /* SOVEREIGN_JUDGE_H */
