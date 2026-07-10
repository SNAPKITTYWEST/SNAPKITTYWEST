# MATHLIB5 — Zenodo Upload

**Title:** MATHLIB5: An Immutable System of Safety Boundaries for Verified Symbolic Compute
**Author:** Ahmad Ali Parr (ORCID 0009-0006-1916-5245) · SnapKitty Collective
**License:** CC-BY-4.0
**Sealed:** SHA-256 `88313c7cea5c462eec80069f12fc28d771465c3aebeec2a79f4661d502a03491`
**Bitcoin anchor:** `MATH5:88313c7cea5c462eec80069f12fc28d771465c3aebeec2a79f4661d502a03491`

## Files

| File | Purpose |
|------|---------|
| `mathlib5_zenodo.pdf` | The technical paper (this document). |
| `.zenodo.json` | Zenodo metadata (authors, license, keywords, related identifiers). |
| `fingerprint.txt` | SHA-256 fingerprint of the source tree / receipt. |
| `pubkey.txt` | Ed25519 public key (Plasma Gate), hex. |
| `signature.txt` | Ed25519 signature over the fingerprint, hex. |
| `opreturn.txt` | Bitcoin `OP_RETURN` anchor payload (`MATH5:<sha256>`, 70 bytes). |
| `anchor_meta.json` | Machine-readable anchor record. |
| `verify_anchors.py` | Standalone verifier — checks fingerprint, signature, and OP_RETURN. |

## Independent verification

```bash
python verify_anchors.py
# -> Fingerprint : 88313c7c...a03491
# -> Ed25519 pub : 18d81669...d02141
# -> OP_RETURN   : MATH5:88313c7c...a03491 (70 bytes)
# -> VERIFIED
```

All four conditions (fingerprint match, Ed25519 validity, OP_RETURN prefix
`MATH5:`, hash agreement) must hold for the record to be accepted as the
anchored release.

## Related

- Software repository: https://github.com/SNAPKITTYWEST/mathlib5
- Full architecture monograph (125 pp.): `paper/mathlib5/full/mathlib5_full.pdf`
- Simplified edition (glitch cover): `paper/mathlib5/simple/mathlib5_simple.pdf`
