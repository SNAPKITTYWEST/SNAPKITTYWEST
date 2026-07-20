#!/usr/bin/env python3
"""
Sovereign autonomous agent — runs inside GitHub Actions.
Reads the repo, finds work, calls DeepSeek-R1, writes fixes back.
Self-modifying loop. No Claude. No GPU. Free tier OpenRouter.

U-MATRIX:
  Scan → Think → Write → Commit (handled by workflow)

Ahmad Ali Parr · SnapKitty Collective · 2026
"""
import os, sys, json, re, glob, requests
from pathlib import Path

KEY   = os.environ.get("OPENROUTER_API_KEY", "")
ROOT  = Path(os.environ.get("GITHUB_WORKSPACE", "."))
TASK  = os.environ.get("OVERRIDE_TASK", "")
MODEL = "qwen/qwen-2.5-coder-32b-instruct"  # fast + free quota

SCAN_PATTERNS = {
    "sorry":   (["*.lean"], r'\bsorry\b'),
    "todo":    (["*.py", "*.rs", "*.hs", "*.ml"], r'#\s*TODO|--\s*TODO|//\s*TODO'),
    "stub":    (["*.py"], r'raise NotImplementedError|pass\s*$'),
    "fixme":   (["*.py", "*.rs", "*.lean"], r'FIXME|HACK|XXX'),
}


def or_call(prompt: str, model: str = MODEL) -> str:
    if not KEY:
        print("No OPENROUTER_API_KEY set"); sys.exit(1)
    resp = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {KEY}", "HTTP-Referer": "https://snapkittywest.io", "X-Title": "SNAPKITTY-AGENT"},
        json={"model": model, "messages": [{"role": "user", "content": prompt}],
              "temperature": 0.1, "max_tokens": 8192},
        timeout=300)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def scan_repo() -> list[dict]:
    """Find all actionable items in the repo."""
    findings = []
    for tag, (globs, pattern) in SCAN_PATTERNS.items():
        for g in globs:
            for path in ROOT.rglob(g):
                # skip .github, node_modules, .git
                if any(p in str(path) for p in [".github", "node_modules", ".git", "__pycache__", ".sovlm_model"]):
                    continue
                try:
                    text = path.read_text(encoding="utf-8", errors="ignore")
                    lines = text.split("\n")
                    for i, line in enumerate(lines):
                        if re.search(pattern, line):
                            findings.append({
                                "tag": tag,
                                "file": str(path.relative_to(ROOT)),
                                "line": i + 1,
                                "content": line.strip(),
                                "context": "\n".join(lines[max(0,i-3):i+4]),
                            })
                except Exception:
                    pass
    return findings


def build_task(findings: list[dict]) -> str:
    if TASK:
        return TASK

    if not findings:
        # No open items — generate next feature
        return (
            "The sovlm repo is clean. Generate the next most valuable feature: "
            "a FastAPI `/generate` endpoint in `src/sovlm/api.py` that exposes the Generator. "
            "Output ONLY the complete Python file."
        )

    # Pick highest-value finding
    # Priority: sorry > stub > todo > fixme
    priority = {"sorry": 0, "stub": 1, "todo": 2, "fixme": 3}
    findings.sort(key=lambda f: priority.get(f["tag"], 9))
    top = findings[:5]  # batch up to 5

    items = "\n".join(
        f"[{f['tag'].upper()}] {f['file']}:{f['line']}\n{f['context']}\n"
        for f in top
    )

    # Read full file for first finding
    first = top[0]
    try:
        full_file = (ROOT / first["file"]).read_text(encoding="utf-8", errors="ignore")
    except Exception:
        full_file = first["context"]

    return f"""You are a sovereign coding agent for SnapKitty Collective.
Fix the following issues in {first['file']}.
Output ONLY the complete corrected file. No markdown. No explanation.

ISSUES FOUND:
{items}

CURRENT FILE CONTENT:
{full_file}
"""


def apply_result(task: str, result: str) -> None:
    # Extract code block if present
    m = re.search(r'```[\w]*\n(.*?)```', result, re.DOTALL)
    if m:
        result = m.group(1).strip()
    else:
        # Strip leading prose
        m2 = re.search(r'^(import |from |#!|namespace |theorem |def |class |pub )', result, re.MULTILINE)
        if m2:
            result = result[m2.start():]

    if not result.strip() or len(result) < 50:
        print(f"Agent returned too little ({len(result)} chars), skipping write.")
        return

    # If task mentions a specific file, write there
    file_match = re.search(r'\b(src/[\w/]+\.py|[\w/]+\.lean|[\w/]+\.rs|[\w/]+\.hs)\b', task)
    if file_match:
        target = ROOT / file_match.group(1)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(result, encoding="utf-8")
        print(f"Written: {target} ({len(result)} chars)")
        return

    # Otherwise detect from result content
    if result.strip().startswith("import Mathlib") or "namespace " in result[:200]:
        # Lean file — find which one was being fixed
        lean_match = re.search(r'([\w/]+\.lean)', task)
        if lean_match:
            target = ROOT / lean_match.group(1)
            target.write_text(result, encoding="utf-8")
            print(f"Written (lean): {target}")
    elif result.strip().startswith("from __future__") or result.strip().startswith("import "):
        # Python — find which file
        py_match = re.search(r'(src/[\w/]+\.py|[\w/]+\.py)', task)
        if py_match:
            target = ROOT / py_match.group(1)
            target.write_text(result, encoding="utf-8")
            print(f"Written (py): {target}")
        else:
            # Default: write new api.py
            target = ROOT / "src/sovlm/api.py"
            target.write_text(result, encoding="utf-8")
            print(f"Written (new): {target}")
    else:
        print("Could not determine target file. Dumping to agent_output.txt")
        (ROOT / "agent_output.txt").write_text(result, encoding="utf-8")


def main():
    print("=" * 60)
    print("SNAPKITTY AUTONOMOUS AGENT")
    print(f"Model: {MODEL}")
    print(f"Root: {ROOT}")
    print("=" * 60)

    findings = scan_repo()
    print(f"Found {len(findings)} open items: {[f['tag'] for f in findings[:10]]}")

    task = build_task(findings)
    print(f"\nTask (first 200 chars): {task[:200]}...")

    print("\nCalling agent...")
    result = or_call(task)
    print(f"Got {len(result)} chars")

    apply_result(task, result)
    print("\nDone. Workflow will commit any changes.")


if __name__ == "__main__":
    main()
