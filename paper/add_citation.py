#!/usr/bin/env python3
"""Add citation block to all sovereign-* repo READMEs via GitHub API."""
import subprocess
import json
import base64
import sys

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

Sovereign Rust workspace for LLM inference — TinyLlama-compatible architecture with RMSNorm, RoPE, GQA/MQA, SwiGLU activation, and GPT-NeoX weight initialization.

**22 crates · 59 tests · 2,774+ lines**

## Architecture

- `model` — TinyLlama-compatible model (RMSNorm, RoPE, GQA, SwiGLU)
- `tokenizer` — BPE tokenizer
- `inference` — Autoregressive generation
- `config` — Model configuration
- `weights` — Weight loading
- `metal` — Metal GPU backend

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

**Sovereign Source License v1.0** — See LICENSE.
"""


def gh_api(endpoint, method="GET", data=None):
    """Run gh api command."""
    cmd = ["gh", "api", endpoint, "-q", ".content"]
    if method == "PUT" and data:
        cmd = ["gh", "api", endpoint, "-X", "PUT", "-f", f"title={data.get('title','')}", "-f", f"content={data.get('content','')}"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip(), result.returncode


def get_readme(repo):
    """Get README content."""
    cmd = f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -q .content'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        return None
    try:
        return base64.b64decode(result.stdout.strip()).decode('utf-8')
    except:
        return None


def get_sha(repo):
    """Get README SHA."""
    cmd = f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -q .sha'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else None


def update_readme(repo, content, sha=None):
    """Update README via GitHub API."""
    # Write content to temp file to avoid shell escaping issues
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
        f.write(content)
        tmp_path = f.name

    if sha:
        cmd = f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -X PUT -f message="docs: add paper citation and DOI" -f sha="{sha}" --input "{tmp_path}"'
    else:
        cmd = f'gh api repos/SNAPKITTYWEST/{repo}/contents/README.md -X PUT -f message="docs: add paper citation and DOI" --input "{tmp_path}"'

    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    import os
    os.unlink(tmp_path)
    return result.returncode == 0, result.stderr


# Handle sovereign-llm separately (needs new README)
print("Creating README for sovereign-llm...")
ok, err = update_readme("sovereign-llm", NEW_README)
if ok:
    print(f"  [OK] sovereign-llm - new README created")
else:
    print(f"  [FAIL] sovereign-llm: {err}")

# Update repos with existing READMEs
for repo in REPOS:
    print(f"Updating {repo}...")
    readme = get_readme(repo)
    if readme is None:
        print(f"  [SKIP] No README found")
        continue

    if "zenodo.org/record/XXXXXXX" in readme or "10.5281/zenodo" not in readme:
        # Has placeholder or no DOI - replace publication section
        if "### 📄 Publication" in readme:
            # Find and replace the publication section
            lines = readme.split("\n")
            new_lines = []
            skip = False
            for line in lines:
                if "### 📄 Publication" in line:
                    skip = True
                    new_lines.append(line)
                    continue
                if skip and line.startswith("### "):
                    skip = False
                if not skip:
                    new_lines.append(line)
            readme = "\n".join(new_lines)

        readme += CITATION_BLOCK
    else:
        print(f"  [SKIP] Already has DOI")
        continue

    sha = get_sha(repo)
    ok, err = update_readme(repo, readme, sha)
    if ok:
        print(f"  [OK] Updated")
    else:
        print(f"  [FAIL] {err}")
