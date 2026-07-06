#!/usr/bin/env python3
"""Add citation block to all sovereign-* repo READMEs via gh api."""
import subprocess
import base64
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

CITATION_BLOCK = """

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

NEW_README = """# SOVEREIGN-LLM

Sovereign Rust workspace for LLM inference -- TinyLlama-compatible architecture with RMSNorm, RoPE, GQA/MQA, SwiGLU activation, and GPT-NeoX weight initialization.

**6 crates, 59 tests, 2,774+ lines**

## Architecture

- `model` -- TinyLlama-compatible model (RMSNorm, RoPE, GQA, SwiGLU)
- `tokenizer` -- BPE tokenizer
- `inference` -- Autoregressive generation
- `config` -- Model configuration
- `weights` -- Weight loading
- `metal` -- Metal GPU backend

## Build

```bash
cargo build --workspace
cargo test --workspace
```

## Citation

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

---

**Sovereign Source License v1.0** -- See LICENSE.
"""


def run(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip(), result.returncode


def get_readme(repo):
    out, rc = run(f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -q .content')
    if rc != 0:
        return None, None
    try:
        content = base64.b64decode(out).decode('utf-8')
        sha_out, _ = run(f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -q .sha')
        return content, sha_out
    except:
        return None, None


def update_readme(repo, content, sha=None):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
        f.write(content)
        tmp = f.name

    # Use --input with proper gh api syntax
    if sha:
        cmd = f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -X PUT -f message="docs: add paper citation and DOI" -f sha={sha} --input "{tmp}"'
    else:
        cmd = f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -X PUT -f message="docs: add paper citation and DOI" --input "{tmp}"'

    out, rc = run(cmd)
    os.unlink(tmp)
    return rc == 0, out


# sovereign-llm - create new README
print("Creating README for sovereign-llm...")
ok, out = update_readme("sovereign-llm", NEW_README)
print(f"  {'[OK]' if ok else '[FAIL]'} {out[:100] if out else ''}")

# Update existing READMEs
for repo in REPOS:
    print(f"Updating {repo}...")
    readme, sha = get_readme(repo)
    if readme is None:
        print(f"  [SKIP] No README")
        continue
    if "10.5281/zenodo" in readme:
        print(f"  [SKIP] Already has DOI")
        continue

    readme += CITATION_BLOCK
    ok, out = update_readme(repo, readme, sha)
    print(f"  {'[OK]' if ok else '[FAIL]'} {out[:100] if out else ''}")
