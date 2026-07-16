import base64, json, subprocess, tempfile, os

nasa_pushes = [
    ("SNAPKITTYWEST/ogma", "docs/TWIN_MODEL_VERIFICATION.md", "edaulc-docs",
     "docs: twin-model verification pattern for generated monitors",
     "# Twin-Model Verification for Ogma Monitors\n\nOgma generates runtime monitors from temporal logic specifications.\nThis doc describes a dual-model verification pattern.\n\n## Pattern\n\n```\nGenerator model  ->  CoCoSpec/Lustre spec draft\n     down\nGate model (local) ->  verifies temporal operators,\n    guarantees have assume scopes, state machines complete\n     down\nogma  ->  generates Rust/C/Lustre monitor\n```\n\n## Key Invariants\n\n- Every `guarantee` has a corresponding `assume` scope\n- Temporal operators used correctly (always, eventually, until)\n- State machine transitions are complete (no dead states)\n- Output monitor covers the stated property\n\n## Connection to Formal Verification\n\nThis pattern mirrors the sorry gate in Lean 4:\na model can declare correctness while producing an incorrect artifact.\nAn external gate with the spec loaded catches the contradiction cheaply\nbefore full formal verification runs.\n"),

    ("SNAPKITTYWEST/spacewasm", "docs/ADVERSARIAL_TESTING.md", "edaulc-docs",
     "docs: adversarial testing pattern for flight-compliant WASM modules",
     "# Adversarial Testing for SpaceWasm Modules\n\nSpaceWasm is a flight-compliant WebAssembly interpreter.\nThis doc describes dual-model adversarial test generation.\n\n## Threat Model\n\nFlight WASM modules may receive malformed sensor inputs,\nout-of-bounds indices from corrupted telemetry,\nor unexpected state transitions from concurrent systems.\n\n## Dual-Model Gate Pattern\n\n```\nGenerator model  ->  happy-path test cases\n     down\nAdversarial gate  ->  boundary values, type confusion,\n    sequence attacks, resource exhaustion\n     down\nSpaceWasm  ->  runs all cases under fuel limit\n```\n\n## Key Invariants\n\n1. Fuel-bounded execution -- no unbounded runs\n2. Memory-safe -- no access outside declared pages\n3. Deterministic -- same inputs, same outputs\n4. No host imports outside whitelist\n"),

    ("SNAPKITTYWEST/cFS", "CONTRIBUTING_AI.md", "edaulc-docs",
     "docs: AI-assisted contribution guide for cFS formal verification",
     "# AI-Assisted Contributions to cFS\n\nThe Core Flight System (cFS) requires strict safety review.\nThis guide covers responsible AI model use for contributions.\n\n## What AI Can Help With\n\n- Unit test scaffolding for new apps\n- Documentation for existing interfaces\n- Code patterns consistent with cFS conventions\n\n## Dual-Model Review Pattern\n\nFor safety-critical changes, use a two-model review:\n\n1. Generator model -- proposes the change\n2. Gate model (loaded with cFS architecture docs) -- reviews for\n   message bus compatibility, bounded execution, app isolation\n\nThe gate model PASS is a pre-condition for human review, not a replacement.\n\n## Key Principle\n\nA model can declare correctness while producing an incorrect artifact.\nThe gate model with the cFS spec loaded catches the contradiction\nbefore it reaches human review.\n"),

    ("SNAPKITTYWEST/fprime", "docs/ai-contribution-guide.md", "edaulc-docs",
     "docs: responsible AI-assisted contribution guide for F Prime",
     "# Responsible AI-Assisted Development for F Prime\n\nF Prime (F\') is a flight software framework used on multiple NASA missions.\n\n## Gate Model for Port Contract Verification\n\nBefore running fprime-util generate, verify with a gate model:\n\n1. Every input port has a matching handler implementation\n2. Every command has a matching cmdHandler case\n3. Every telemetry channel has a defined update point\n4. No blocking calls in port handlers (real-time constraint)\n5. State transitions complete -- no undefined states\n\n## The Key Principle\n\nSame as formal proof verification: a model can declare correctness\nwhile producing an incorrect artifact. The gate model with the\nF Prime spec loaded catches the contradiction before it reaches hardware.\n"),
]

for repo, path, branch, msg, content in nasa_pushes:
    encoded = base64.b64encode(content.encode()).decode()
    payload = {"message": msg, "content": encoded, "branch": branch}
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(payload, f)
        fname = f.name
    result = subprocess.run(
        ['gh', 'api', f'repos/{repo}/contents/{path}', '-X', 'PUT', '--input', fname],
        capture_output=True, text=True
    )
    os.unlink(fname)
    print(f'{repo}:', 'OK' if result.returncode == 0 else result.stderr[:200])
