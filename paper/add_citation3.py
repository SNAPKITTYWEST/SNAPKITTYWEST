#!/usr/bin/env python3
"""Add citation block to all sovereign-* repo READMEs."""
import subprocess
import base64
import json
import tempfile
import os

REPOS = [
    "sovereign-covenant",
    "sovereign-utqc",
    "sovereign-addr",
    "sovereign-pirtm",
    "sovereign-agt",
    "sovereign-compiler",
    "sovereign-multiplicity",
    "sovereign-adr",
]

CITATION = """

---

## Citation

If you use this work, please cite:

```bibtex
@misc{snapkittywest2026sovereigncompute,
  title = {SNAPKITTYWEST: Sovereign Compute Architecture with Linear Types, WORM Seals, and Goldilocks Field Arithmetic},
  author = {SnapKitty Collective},
  year = {2026},
  doi = {10.5281/zenodo.21132094},
  url = {https://doi.org/10.5281/zenodo.21132094}
}
```

**Paper:** https://doi.org/10.5281/zenodo.21132094
**ORCID:** https://orcid.org/0009-0006-1916-5245
"""


def run(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.stdout.strip(), r.returncode


def get_readme(repo):
    out, rc = run(f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -q .content')
    if rc != 0:
        return None, None
    content = base64.b64decode(out).decode('utf-8')
    sha_out, _ = run(f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -q .sha')
    return content, sha_out


def push_readme(repo, content, sha=None):
    b64 = base64.b64encode(content.encode('utf-8')).decode('ascii')

    payload = {
        "message": "docs: add paper citation and DOI",
        "content": b64,
    }
    if sha:
        payload["sha"] = sha

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(payload, f)
        tmp = f.name

    out, rc = run(f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -X PUT --input "{tmp}"')
    os.unlink(tmp)
    return rc == 0, out


# sovereign-llm
NEW_README = """# SOVEREIGN-LLM

Sovereign Rust workspace for LLM inference -- TinyLlama-compatible architecture with RMSNorm, RoPE, GQA/MQA, SwiGLU activation, and GPT-NeoX weight initialization.

## Build

```bash
cargo build --workspace
cargo test --workspace
```

## Citation

```bibtex
@misc{snapkittywest2026sovereigncompute,
  title = {SNAPKITTYWEST: Sovereign Compute Architecture},
  author = {SnapKitty Collective},
  year = {2026},
  doi = {10.5281/zenodo.21132094},
  url = {https://doi.org/10.5281/zenodo.21132094}
}
```

**Paper:** https://doi.org/10.5281/zenodo.21132094
**ORCID:** https://orcid.org/0009-0006-1916-5245
"""

print("Creating sovereign-llm README...")
ok, out = push_readme("sovereign-llm", NEW_README)
print(f"  {'OK' if ok else 'FAIL'}: {out[:120] if out else ''}")

for repo in REPOS:
    print(f"{repo}...")
    readme, sha = get_readme(repo)
    if not readme:
        print(f"  SKIP - no README")
        continue
    if "10.5281/zenodo" in readme:
        print(f"  SKIP - already has DOI")
        continue
    readme += CITATION
    ok, out = push_readme(repo, readme, sha)
    print(f"  {'OK' if ok else 'FAIL'}: {out[:120] if out else ''}")
