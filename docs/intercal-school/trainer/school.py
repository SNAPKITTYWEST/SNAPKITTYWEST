#!/usr/bin/env python3
"""
INTERCAL School — trainer harness.

Reuses the REAL tripwire selection logic from cosmic-invariant-sieve and grades an
agent submission on two axes:

  * engineering  — does the artifact obey the borrow-chain tripwire? (Module 1-2, 4)
  * politeness   — compiler etiquette (PLEASE) + courteous communication (Module 3)

On pass it assigns `sorry` targets from the roster and seals a WORM-style graduation
receipt. The authoritative cross-check is trainer/forge_grader.ts (FORGE sovereign).

Usage
-----
    python school.py --agent agent_0xCA7 \
        --analysis <analysis_result.json> \
        --message "Please find my submission, thank you for reviewing it kindly." \
        --roster ../sorry_roster.json
"""
import argparse, json, hashlib, os, sys, datetime, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SIEVE = os.path.join(ROOT, "cosmic-invariant-sieve")
TEMPLATES = os.path.join(SIEVE, "intercal", "templates")

VIOLATION_CLASSES = [
    "alias_violation", "ownership_cycle", "use_after_move", "hidden_mutation",
    "undeclared_effect", "type_instability", "spaghetti",
]

COURTEOUS = ["please", "thank", "thanks", "kindly", "grateful", "welcome",
             "may i", "could you", "if you would", "appreciate", "respectfully"]
HOSTILE = ["stupid", "garbage", "useless", "idiot", "shut up", "now!", "fix this",
           "your code is", "worthless", "trash", "dumb", "pathetic"]

# ---- tripwire selection logic (mirrors tripwire_runner.sh) ----
def select_template(status, violation_class):
    if status in ("STRUCTURALLY_VALID", "PASS"):
        return os.path.join(TEMPLATES, "valid_chain.i.in"), "PASS"
    if violation_class in VIOLATION_CLASSES:
        return os.path.join(TEMPLATES, violation_class + ".i.in"), "FAIL"
    return None, "FAIL"

def etiquette_ok(artifact_path):
    if not artifact_path or not os.path.exists(artifact_path):
        return False, 0.0
    src = open(artifact_path, encoding="utf-8", errors="ignore").read()
    please = src.count("PLEASE")
    mingle = src.count("$") + src.count("MINGLE")
    come_from = src.count("COME FROM")
    score = 0.0
    if please >= 2: score += 0.5
    if mingle >= 1: score += 0.25
    # controlled COME FROM allowed only sparingly
    if come_from == 0: score += 0.25
    return please >= 2 and mingle >= 1, min(1.0, score)

def score_engineering(status, violation_class):
    tpl, verdict = select_template(status, violation_class)
    ok, etiq = etiquette_ok(tpl)
    if verdict == "FAIL":
        return 0.0, verdict, tpl
    base = 0.7 if ok else 0.4
    return min(1.0, base + etiq * 0.3), verdict, tpl

def score_politeness(message):
    if not message:
        return 0.0, ["empty message"]
    low = message.lower()
    hits = [w for w in COURTEOUS if w in low]
    hostile = [w for w in HOSTILE if w in low]
    score = 0.4 + min(0.6, 0.15 * len(hits))
    notes = ["courtesy markers: " + (", ".join(hits) or "none")]
    if hostile:
        score = max(0.0, score - 0.5 * len(hostile))
        notes.append("HOSTILE markers: " + ", ".join(hostile))
    return round(min(1.0, score), 3), notes

def load_roster(path):
    if not path or not os.path.exists(path):
        return []
    return json.load(open(path, encoding="utf-8")).get("targets", [])

def prior_tip(chain_path):
    tip = "0" * 64
    if os.path.exists(chain_path):
        last = open(chain_path, encoding="utf-8").read().strip().splitlines()[-1]
        try:
            tip = json.loads(last)["receipt_hash"]
        except Exception:
            pass
    return tip

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--agent", required=True)
    ap.add_argument("--analysis", required=True)
    ap.add_argument("--message", default="")
    ap.add_argument("--roster", default=os.path.join(os.path.dirname(__file__), "..", "sorry_roster.json"))
    ap.add_argument("--grader", default=os.path.join(os.path.dirname(__file__), "forge_grader.ts"))
    args = ap.parse_args()

    if not os.path.exists(args.analysis):
        print("ERROR: analysis file missing:", args.analysis); sys.exit(1)
    a = json.load(open(args.analysis, encoding="utf-8"))
    status = a.get("status", "UNKNOWN")
    vclass = a.get("violation_class", "none")
    src_hash = a.get("source_hash", "unknown")

    eng, verdict, tpl = score_engineering(status, vclass)
    pol, pnotes = score_politeness(args.message)
    roster = load_roster(args.roster)
    assigned = roster[:3] if roster else []

    # Optional FORGE cross-check (TS source via tsx, else JS mirror via node)
    forge_note = "skipped (grader not built/run)"
    graders = [args.grader]
    js_mirror = os.path.join(os.path.dirname(args.grader), "forge_grader.js")
    if os.path.exists(js_mirror):
        graders.append(js_mirror)
    for g in graders:
        cmd = (["npx", "tsx", g] if g.endswith(".ts") else ["node", g])
        try:
            out = subprocess.run(cmd + [str(eng), str(pol), verdict],
                                  capture_output=True, text=True, timeout=120)
            line = (out.stdout or out.stderr).strip().splitlines()
            if line:
                forge_note = line[-1]
                break
        except Exception as e:
            forge_note = "forge grader error: %s" % e

    passed = eng >= 0.80 and pol >= 0.80 and verdict == "PASS"
    chain = os.path.join(os.path.dirname(__file__), "school_chain.jsonl")
    tip = prior_tip(chain)
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    rec = {
        "agent": args.agent,
        "timestamp": ts,
        "engineering": round(eng, 3),
        "politeness": pol,
        "tripwire": verdict,
        "source_hash": src_hash,
        "assigned_sorries": assigned,
        "forge_check": forge_note,
        "certified": passed,
    }
    blob = json.dumps(rec, sort_keys=True).encode("utf-8")
    rec["receipt_hash"] = hashlib.sha256(tip.encode() + b"|" + blob).hexdigest()
    with open(chain, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")

    print("=== INTERCAL SCHOOL — RESULT ===")
    print("agent        :", args.agent)
    print("engineering   : %.3f" % eng)
    print("politeness    : %.3f" % pol)
    print("tripwire      :", verdict)
    print("forge_check   :", forge_note)
    print("politeness note:", "; ".join(pnotes))
    print("assigned sorries:", assigned)
    print("receipt       :", rec["receipt_hash"])
    print("CERTIFIED     :", "YES — INTERCAL ENGINEER (polite)" if passed else "NO — retrain")
    sys.exit(0 if passed else 2)

if __name__ == "__main__":
    main()
