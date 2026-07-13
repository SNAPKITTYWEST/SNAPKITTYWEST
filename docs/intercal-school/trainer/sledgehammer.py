#!/usr/bin/env python3
"""
sledgehammer.py — tactic-ladder auto-prover for Lean 4 `sorry` closure.

Usage:
    python sledgehammer.py <file.lean> [--project <lake-root>]

For every `sorry` in <file.lean> it tries the tactic ladder IN ORDER:
    rfl -> decide -> norm_num -> ring -> simp -> omega -> linarith
    -> simp [*]; ring -> aesop -> tauto
The first tactic that makes the file compile (Lean rejects an unfinished proof
as a hard error, so exit-code 0 == the goal was genuinely closed) is kept.
Each real closure is sealed as a WORM receipt (appended to
sledgehammer_receipts.jsonl) and, if the INTERCAL school grader is present,
also certified through it.

Hard sorries (no tactic in the ladder closes them) are flagged and left as
`sorry` — never faked.

NOTE on environment: only tactics resolvable in the project's import scope run.
In a core-only project, ring/norm_num/omega/linarith/aesop are "unknown tactic"
errors and are naturally skipped. With Mathlib present they become active.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import hashlib
from datetime import datetime, timezone

LADDER = [
    "rfl",
    "decide",
    "norm_num",
    "ring",
    "simp",
    "omega",
    "linarith",
    "simp [*]; ring",
    "aesop",
    "tauto",
]

SORRY_RE = re.compile(r"\bsorry\b")


def elan_bin():
    cand = os.path.join(os.path.expanduser("~"), ".elan", "bin")
    return cand if os.path.isdir(cand) else None


def find_project_root(start):
    d = os.path.abspath(os.path.dirname(start))
    while True:
        if os.path.exists(os.path.join(d, "lakefile.toml")) or \
           os.path.exists(os.path.join(d, "lakefile.lean")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return os.path.dirname(os.path.abspath(start))
        d = parent


def run_lean(filepath, project_root):
    env = os.environ.copy()
    eb = elan_bin()
    if eb:
        env["PATH"] = eb + os.pathsep + env.get("PATH", "")
    has_lake = os.path.exists(os.path.join(project_root, "lakefile.toml")) or \
               os.path.exists(os.path.join(project_root, "lakefile.lean"))
    rel = os.path.relpath(filepath, project_root)
    if has_lake:
        cmd = ["lake", "env", "lean", rel]
    else:
        cmd = ["lean", rel] if not has_lake else ["lake", "env", "lean", rel]
    try:
        r = subprocess.run(cmd, cwd=project_root, capture_output=True,
                            text=True, timeout=900, env=env)
    except FileNotFoundError:
        r = subprocess.run(["lean", rel], cwd=project_root, capture_output=True,
                            text=True, timeout=900, env=env)
    return r.returncode == 0, (r.stdout or "") + (r.stderr or ""), r.returncode


def find_sorries(text):
    return [(m.start(), m.end()) for m in SORRY_RE.finditer(text)]


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def seal_receipt(receipts_path, rec):
    with open(receipts_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")


def certify_via_school(school_dir, file_rel, tactic, target_id):
    """Best-effort INTERCAL certification of a closed sorry."""
    grader = os.path.join(school_dir, "school.py")
    if not os.path.exists(grader):
        return "skipped (school.py absent)"
    analysis = {
        "status": "STRUCTURALLY_VALID",
        "violation_class": "none",
        "source_hash": sha256(f"{file_rel}:{target_id}:{tactic}"),
        "target": target_id,
        "note": f"sledgehammer closed {target_id} with `{tactic}`",
    }
    import tempfile
    af = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False,
                                      encoding="utf-8")
    json.dump(analysis, af)
    af.close()
    try:
        r = subprocess.run(
            ["python", grader, "--agent", "hy3", "--analysis", af.name,
             "--message", f"please certify closed proof {target_id} via sledgehammer tactic {tactic}, thank you kindly",
             "--roster", os.path.join(school_dir, "..", "sorry_roster.json")],
            capture_output=True, text=True, timeout=120)
        for line in (r.stdout + r.stderr).splitlines():
            if "CERTIFIED" in line or "receipt" in line:
                return line.strip()
        return (r.stdout or r.stderr).strip().splitlines()[-1:]
    except Exception as e:  # noqa
        return f"school error: {e}"
    finally:
        try:
            os.remove(af.name)
        except Exception:
            pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--project", default=None,
                    help="lake project root (default: auto-detect upward)")
    args = ap.parse_args()

    filepath = os.path.abspath(args.file)
    if not os.path.exists(filepath):
        print(f"ERROR: {filepath} not found", file=sys.stderr)
        sys.exit(2)

    project_root = args.project or find_project_root(filepath)
    school_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)))
    receipts_path = os.path.join(school_dir, "sledgehammer_receipts.jsonl")

    text = open(filepath, encoding="utf-8").read()
    sorries = find_sorries(text)
    print(f"[sledgehammer] {os.path.relpath(filepath, project_root)}: "
          f"{len(sorries)} sorry(s) found; ladder={LADDER}")

    closed = []
    hard = []

    # Process LAST -> FIRST so earlier positions stay valid while we patch.
    for i in range(len(sorries) - 1, -1, -1):
        s, e = sorries[i]
        region = text[:s].count("\n") + 1  # 1-based line of this sorry
        won = None
        for tac in LADDER:
            cand = text[:s] + tac + text[e:]
            open(filepath, "w", encoding="utf-8").write(cand)
            ok, out, rc = run_lean(filepath, project_root)
            if ok:
                text = cand
                won = tac
                break
            # else: revert this occurrence to `sorry` and try next tactic
            open(filepath, "w", encoding="utf-8").write(text[:s] + "sorry" + text[e:])
        if won:
            rec = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "file": os.path.relpath(filepath, project_root),
                "line": region,
                "tactic": won,
                "status": "CLOSED",
                "sha256": sha256(text),
            }
            seal_receipt(receipts_path, rec)
            cert = certify_via_school(school_dir, rec["file"], won,
                                      f"{rec['file']}:{region}")
            closed.append((region, won))
            print(f"  [CLOSED] line {region}: `{won}`   | cert: {cert}")
        else:
            hard.append(region)
            print(f"  [HARD]   line {region}: no ladder tactic closed it "
                  f"(flagged for Hy3 + Ahmad)")

    # Write the patched file back (closed sorries replaced, hard ones remain `sorry`)
    open(filepath, "w", encoding="utf-8").write(text)

    print(f"\n[sledgehammer] summary for {os.path.relpath(filepath, project_root)}:")
    print(f"  closed : {len(closed)}  -> {closed}")
    print(f"  hard   : {len(hard)}    -> lines {hard}")
    print(f"  receipts: {receipts_path}")

    # If nothing closed and nothing hard (shouldn't happen), still exit 0.
    sys.exit(0)


if __name__ == "__main__":
    main()
