"""
Generate cryptographic anchors for the MATHLIB5 monograph.

Computes:
  - SHA-256 fingerprint over the LaTeX source tree
  - Ed25519 keypair + signature over the fingerprint
  - Bitcoin OP_RETURN anchor message

Outputs (into full/anchors/):
  fingerprint.txt  - SHA-256 hex of the concatenated sources
  pubkey.txt       - Ed25519 public key (hex)
  signature.txt    - Ed25519 signature (hex) over the fingerprint
  opreturn.txt     - Bitcoin OP_RETURN anchor message (ASCII, <80 bytes)
  anchor_meta.json - machine-readable record
  verify_anchors.py - standalone verifier
"""
import os, hashlib, json, datetime
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

ANCHORS = os.path.dirname(os.path.abspath(__file__))       # .../paper/mathlib5/full/anchors
FULL = os.path.dirname(ANCHORS)                             # .../paper/mathlib5/full
os.makedirs(ANCHORS, exist_ok=True)

# Deterministic order of source files to fingerprint
ORDER = [
    "mathlib5_full.tex",
    "front/title.tex", "front/abstract.tex", "front/preface.tex",
    "chapters/ch01_introduction.tex", "chapters/ch02_related_work.tex",
    "chapters/ch03_preliminaries.tex", "chapters/ch04_coherence.tex",
    "chapters/ch05_vscp_overview.tex", "chapters/ch06_layer1_apl.tex",
    "chapters/ch07_layer2_ir.tex", "chapters/ch08_layer3_liquid.tex",
    "chapters/ch09_layer4_lean.tex", "chapters/ch10_layer5_cmm.tex",
    "chapters/ch11_layer6_static.tex", "chapters/ch12_layer7_policy.tex",
    "chapters/ch13_layer8_pnp.tex", "chapters/ch14_layer9_worm.tex",
    "chapters/ch15_layer10_completeness.tex", "chapters/ch16_kernel_primitives.tex",
    "chapters/ch17_ffi_bridge.tex", "chapters/ch18_build_ci.tex",
    "chapters/ch19_security.tex", "chapters/ch20_constellation.tex",
    "chapters/ch25_formal.tex", "chapters/ch30_apl.tex",
    "chapters/ch26_bifrost.tex", "chapters/ch29_threat.tex",
    "chapters/ch31_workcmm.tex", "chapters/ch32_leanmeta.tex",
    "chapters/ch33_supply.tex", "chapters/ch34_irgrammar.tex",
    "chapters/ch35_perf.tex", "chapters/ch36_anchors.tex",
    "chapters/ch21_evaluation.tex", "chapters/ch22_case_study.tex",
    "chapters/ch23_limitations.tex", "chapters/ch24_conclusion.tex",
    "chapters/appA_kernel_source.tex", "chapters/appB_ffi_source.tex",
    "chapters/appC_metadata_schema.tex", "chapters/appD_glossary.tex",
    "chapters/appE_bibliography.tex",
]

h = hashlib.sha256()
for rel in ORDER:
    p = os.path.join(FULL, rel)
    if not os.path.exists(p):
        raise SystemExit(f"Missing source for fingerprint: {rel}")
    with open(p, "rb") as f:
        h.update(f.read())
fingerprint = h.hexdigest()

# Ed25519 keypair (fresh per seal; published pubkey + signature)
priv = Ed25519PrivateKey.generate()
pub = priv.public_key()
pub_bytes = pub.public_bytes(
    encoding=serialization.Encoding.Raw,
    format=serialization.PublicFormat.Raw
)
signature = priv.sign(fingerprint.encode("utf-8"))

# Bitcoin OP_RETURN anchor: prefix + 32-byte fingerprint (ASCII, <80 bytes)
opreturn = "MATH5:" + fingerprint

date = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

with open(os.path.join(ANCHORS, "fingerprint.txt"), "w") as f:
    f.write(fingerprint)
with open(os.path.join(ANCHORS, "pubkey.txt"), "w") as f:
    f.write(pub_bytes.hex())
with open(os.path.join(ANCHORS, "signature.txt"), "w") as f:
    f.write(signature.hex())
with open(os.path.join(ANCHORS, "opreturn.txt"), "w") as f:
    f.write(opreturn)

meta = {
    "title": "MATHLIB5: An Immutable System of Safety Boundaries for Verified Symbolic Compute",
    "author": "Ahmad Ali Parr",
    "sealed_utc": date,
    "fingerprint_sha256": fingerprint,
    "ed25519_public_key": pub_bytes.hex(),
    "ed25519_signature": signature.hex(),
    "bitcoin_opreturn": opreturn,
    "opreturn_bytes": len(opreturn.encode("utf-8")),
    "source_files": len(ORDER),
}
with open(os.path.join(ANCHORS, "anchor_meta.json"), "w") as f:
    json.dump(meta, f, indent=2)

# Standalone verifier
verifier = '''import os, hashlib, sys
import json
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature

HERE = os.path.dirname(os.path.abspath(__file__))
meta = json.load(open(os.path.join(HERE, "anchor_meta.json")))
fp = open(os.path.join(HERE, "fingerprint.txt")).read().strip()
pub = bytes.fromhex(meta["ed25519_public_key"])
sig = bytes.fromhex(meta["ed25519_signature"])
opret = open(os.path.join(HERE, "opreturn.txt")).read().strip()

ok = True
ok &= (fp == meta["fingerprint_sha256"])
try:
    Ed25519PublicKey.from_public_bytes(pub).verify(sig, fp.encode("utf-8"))
except InvalidSignature:
    ok = False
ok &= (opret == meta["bitcoin_opreturn"])
print("Fingerprint :", fp)
print("Ed25519 pub :", pub.hex())
print("OP_RETURN   :", opret, f"({len(opret)} bytes)")
print("VERIFIED" if ok else "FAILED")
sys.exit(0 if ok else 1)
'''
with open(os.path.join(ANCHORS, "verify_anchors.py"), "w") as f:
    f.write(verifier)

print("fingerprint :", fingerprint)
print("pubkey      :", pub_bytes.hex())
print("op_return   :", opreturn, f"({len(opreturn)} bytes)")
print("written to  :", ANCHORS)
