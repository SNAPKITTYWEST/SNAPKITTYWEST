import os, hashlib, sys
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
