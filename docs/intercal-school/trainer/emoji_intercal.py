"""
emoji_intercal.py — Emoji INTERCAL parser + politeness ratio enforcer.

Grammar:
  statement  := [PLEASE] opcode [operand]
  PLEASE     := 🙏
  opcodes:
    ➡️🔙     COME FROM <label>   (reverse goto — line pulls control)
    🎲        probabilistic exec  (DO %50 — runs ~half the time)
    🔄        interleave-assign   (INTERCAL's weird non-assignment =)
    😤 / 🙄   rudeness marker     (poisons local politeness window)
    💀        ABSTAIN             (disable a statement)
    📣        REINSTATE           (re-enable a disabled statement)
    🔢        READ OUT            (output)
    📥        WRITE IN            (input)
    🏁        GIVE UP             (terminate)

Politeness ratio rule (load-bearing):
  - Count statements in a sliding window of W (default: all statements)
  - PLEASE-prefixed fraction must be in [LO, HI] = [1/5, 1/3]
  - Below LO  → NOT_POLITE_ENOUGH
  - Above HI  → EXCESSIVE_GROVELING
  - A 😤 or 🙄 in any statement counts as -1 politeness (can push below LO)

Returns a ParseResult with:
  - statements: list of parsed Statement objects
  - politeness_ratio: float
  - verdict: "PASS" | "NOT_POLITE_ENOUGH" | "EXCESSIVE_GROVELING" | "PARSE_ERROR"
  - details: human-readable breakdown
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional

# ── emoji constants ──────────────────────────────────────────────────────────
PLEASE       = "🙏"
COME_FROM    = "➡️🔙"   # two codepoints: ➡️ + 🔙
PROB_EXEC    = "🎲"
INTERLEAVE   = "🔄"
RUDE_1       = "😤"
RUDE_2       = "🙄"
ABSTAIN      = "💀"
REINSTATE    = "📣"
READ_OUT     = "🔢"
WRITE_IN     = "📥"
GIVE_UP      = "🏁"

OPCODES = {COME_FROM, PROB_EXEC, INTERLEAVE, RUDE_1, RUDE_2,
           ABSTAIN, REINSTATE, READ_OUT, WRITE_IN, GIVE_UP}

RUDE_MARKERS = {RUDE_1, RUDE_2}

POLITENESS_LO = 1 / 5   # below → NOT_POLITE_ENOUGH
POLITENESS_HI = 1 / 3   # above → EXCESSIVE_GROVELING

# ── data model ───────────────────────────────────────────────────────────────
@dataclass
class Statement:
    line_no: int
    please: bool          # prefixed with 🙏?
    opcode: Optional[str]
    operand: str          # everything after the opcode on that line
    rude: bool            # contains 😤 or 🙄
    raw: str

@dataclass
class ParseResult:
    statements: List[Statement] = field(default_factory=list)
    politeness_ratio: float = 0.0
    effective_politeness: float = 0.0  # after rude-marker penalty
    verdict: str = "PASS"
    details: str = ""
    errors: List[str] = field(default_factory=list)

# ── tokenizer ────────────────────────────────────────────────────────────────
def _split_emoji_line(line: str):
    """
    Tokenize a line by splitting on grapheme clusters that match our emoji set.
    Returns list of tokens (emoji strings or plain text chunks).
    """
    # We match known multi-codepoint sequences first, then single emoji
    pattern = (
        r'(?:➡️🔙'          # COME_FROM (two codepoints)
        r'|🙏|🎲|🔄|😤|🙄|💀|📣|🔢|📥|🏁'
        r')'
    )
    tokens = []
    pos = 0
    for m in re.finditer(pattern, line):
        if m.start() > pos:
            chunk = line[pos:m.start()].strip()
            if chunk:
                tokens.append(chunk)
        tokens.append(m.group())
        pos = m.end()
    if pos < len(line):
        chunk = line[pos:].strip()
        if chunk:
            tokens.append(chunk)
    return [t for t in tokens if t]

# ── parser ────────────────────────────────────────────────────────────────────
def parse(source: str) -> ParseResult:
    result = ParseResult()
    lines = source.splitlines()

    for lineno, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            continue  # blank / comment

        tokens = _split_emoji_line(stripped)
        if not tokens:
            continue

        please = False
        rude = False
        opcode = None
        operand_parts = []

        i = 0
        # optional PLEASE prefix
        if tokens[i] == PLEASE:
            please = True
            i += 1

        # opcode
        if i < len(tokens) and tokens[i] in OPCODES:
            opcode = tokens[i]
            i += 1
        elif i < len(tokens):
            # no recognised opcode — plain text statement (allowed, treated as NOP)
            opcode = None

        # rest is operand
        while i < len(tokens):
            operand_parts.append(tokens[i])
            if tokens[i] in RUDE_MARKERS:
                rude = True
            i += 1

        # rude markers anywhere on line
        if any(r in stripped for r in (RUDE_1, RUDE_2)):
            rude = True

        stmt = Statement(
            line_no=lineno,
            please=please,
            opcode=opcode,
            operand=" ".join(operand_parts),
            rude=rude,
            raw=raw,
        )
        result.statements.append(stmt)

    if not result.statements:
        result.verdict = "PARSE_ERROR"
        result.details = "No parseable statements found."
        return result

    # ── politeness ratio calculation ─────────────────────────────────────────
    n = len(result.statements)
    please_count = sum(1 for s in result.statements if s.please)
    rude_count   = sum(1 for s in result.statements if s.rude)

    raw_ratio = please_count / n
    # Each rude marker subtracts 1 from effective please count (floor 0)
    effective_please = max(0, please_count - rude_count)
    effective_ratio  = effective_please / n

    result.politeness_ratio    = round(raw_ratio, 4)
    result.effective_politeness = round(effective_ratio, 4)

    # ── verdict ───────────────────────────────────────────────────────────────
    if effective_ratio < POLITENESS_LO:
        result.verdict = "NOT_POLITE_ENOUGH"
        result.details = (
            f"{please_count}/{n} statements have 🙏 "
            f"(effective after {rude_count} rude markers: {effective_please}/{n} = "
            f"{effective_ratio:.1%}). "
            f"Minimum is {POLITENESS_LO:.0%}. "
            "PROGRAM UNCOMPILABLE: NOT POLITE ENOUGH"
        )
    elif effective_ratio > POLITENESS_HI:
        result.verdict = "EXCESSIVE_GROVELING"
        result.details = (
            f"{please_count}/{n} statements have 🙏 "
            f"({raw_ratio:.1%} > max {POLITENESS_HI:.0%}). "
            "PROGRAM UNCOMPILABLE: EXCESSIVE GROVELING"
        )
    else:
        result.verdict = "PASS"
        result.details = (
            f"{please_count}/{n} statements have 🙏 "
            f"(effective {effective_ratio:.1%}, within [{POLITENESS_LO:.0%}, {POLITENESS_HI:.0%}]). "
            "Politeness ratio: ACCEPTED"
        )

    return result

# ── scoring helper for school.py ─────────────────────────────────────────────
def score_emoji_politeness(source: str) -> tuple[float, str, str]:
    """
    Returns (score 0.0–1.0, verdict string, detail string).
    Used by school.py as a drop-in alongside score_politeness().
    """
    r = parse(source)
    if r.verdict == "PASS":
        # Scale within the valid band: 0.0 at LO, 1.0 at midpoint, taper to 0.8 at HI
        mid = (POLITENESS_LO + POLITENESS_HI) / 2
        ratio = r.effective_politeness
        if ratio <= mid:
            score = 0.6 + 0.4 * ((ratio - POLITENESS_LO) / (mid - POLITENESS_LO))
        else:
            score = 1.0 - 0.2 * ((ratio - mid) / (POLITENESS_HI - mid))
        return round(score, 3), "PASS", r.details
    elif r.verdict == "NOT_POLITE_ENOUGH":
        # Partial credit proportional to how close they got
        frac = r.effective_politeness / POLITENESS_LO
        return round(min(0.4, 0.4 * frac), 3), "NOT_POLITE_ENOUGH", r.details
    elif r.verdict == "EXCESSIVE_GROVELING":
        return 0.2, "EXCESSIVE_GROVELING", r.details
    else:
        return 0.0, "PARSE_ERROR", r.details

# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys, json
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if len(sys.argv) < 2:
        print("Usage: python emoji_intercal.py <source_file_or_string>")
        sys.exit(1)

    arg = sys.argv[1]
    if arg == "--stdin":
        src = sys.stdin.read()
    elif len(arg) > 200 or "\n" in arg:
        src = arg
    else:
        try:
            src = open(arg, encoding="utf-8").read()
        except FileNotFoundError:
            src = arg  # treat as inline source

    r = parse(src)
    out = {
        "verdict": r.verdict,
        "politeness_ratio": r.politeness_ratio,
        "effective_politeness": r.effective_politeness,
        "statement_count": len(r.statements),
        "details": r.details,
        "statements": [
            {"line": s.line_no, "please": s.please, "opcode": s.opcode,
             "rude": s.rude, "operand": s.operand}
            for s in r.statements
        ],
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))
    sys.exit(0 if r.verdict == "PASS" else 1)
