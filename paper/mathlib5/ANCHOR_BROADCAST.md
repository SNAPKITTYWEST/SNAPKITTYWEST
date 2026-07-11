# MATHLIB5 — On-Chain Anchor Broadcast Guide

This document records the exact data needed to anchor MATHLIB5 to a public
ledger, and the free alternatives already in place.

## Seals (fixed for this release)

| Artifact | Value |
|----------|-------|
| SHA-256 fingerprint | `88313c7cea5c462eec80069f12fc28d771465c3aebeec2a79f4661d502a03491` |
| Ed25519 public key (Plasma Gate) | `18d816694de0deae621e913177bdfa3547e5d4cc2f9d91dfdcc3a16d03d02141` |
| Bitcoin OP_RETURN payload | `MATH5:88313c7cea5c462eec80069f12fc28d771465c3aebeec2a79f4661d502a03491` |

## 1. Bitcoin OP_RETURN (the on-chain anchor)

Payload is 70 bytes (6-byte `MATH5:` prefix + 32-byte hash), within the
80-byte standard `OP_RETURN` limit.

**OP_RETURN output script (hex)** — paste this as a bare output script in a
wallet/tool that supports custom `OP_RETURN` outputs:

```
6a464d415448353a38383331336337636561356334363265656338303036396631326663323864373731343635633361656265656332613739663436363164353032613033343931
```

Breakdown: `6a` = OP_RETURN, `46` = push 70 bytes, then the 70 ASCII bytes
of `MATH5:88313c7c...a03491`.

**How to broadcast (you need a funded Bitcoin wallet — this cannot be done
without your own key/funds):**

- **Electrum:** use the "Pay to many" dialog and add an output with the
  script above (some Electrum builds accept `op_return:` style outputs), or
  use a plugin that supports OP_RETURN.
- **bitcoin-cli:** build a raw transaction with one output
  `scriptPubKey=6a46<...>` and a normal fee-paying output, sign with your
  wallet, then `bitcoin-cli sendrawtransaction <hex>`.
- **Web tool:** https://opreturn.net — paste `MATH5:88313c7c...a03491` and
  broadcast (follow the site's signing steps with your wallet).
- **mempool.space:** build the raw tx with the scriptPubKey above and use the
  "Broadcast" page to push the signed hex.

After broadcast, the transaction id is the public, timestamped anchor.

## 2. ICP (Internet Computer) — NOT free

Anchoring to ICP requires a canister plus **cycles** (ICP's gas token); there
is no free on-chain ICP option. Skip unless you fund a canister.

## 3. Free, Bitcoin-backed alternative: OpenTimestamps

OpenTimestamps stamps your hash into a real Bitcoin transaction for **free**
(a calendar server batches many hashes into one transaction). Run this on any
machine with the client installed (it failed on the build Windows box due to
a missing native `libsecp256k1`):

```bash
pip install opentimestamps-client
ots stamp paper/mathlib5/full/anchors/fingerprint.txt
# later, once the calendar includes it in Bitcoin:
ots upgrade paper/mathlib5/full/anchors/fingerprint.txt.ots
ots verify paper/mathlib5/full/anchors/fingerprint.txt.ots
```

## 4. Free anchors already in place

- **GitHub commit** `e7575a6` on `SNAPKITTYWEST/main` publishes the
  fingerprint, public key, signature, and OP_RETURN payload, timestamped by
  GitHub infrastructure. Retrieve:
  https://github.com/SNAPKITTYWEST/SNAPKITTYWEST/tree/main/paper/mathlib5
- **Public GitHub Gist** (independent timestamped mirror of the same seals):
  https://gist.github.com/SNAPKITTYWEST/ead1c121ccab4b1fedc28ae016e84db8
- `verify_anchors.py` in the repo re-checks all three seals and prints
  `VERIFIED`.

## 5. Free anchors attempted from the build sandbox (blocked here)

These are free and recommended; they just could not be completed from this
Windows sandbox, so run them on a normal machine:

- **OpenTimestamps** (free, real Bitcoin inclusion): the `opentimestamps-client`
  fails here on a missing native `libsecp256k1` (no Windows wheel for py3.12).
  On a working machine:
  ```bash
  pip install opentimestamps-client
  ots stamp paper/mathlib5/full/anchors/fingerprint.txt
  ots upgrade paper/mathlib5/full/anchors/fingerprint.txt.ots   # once included
  ```
- **Software Heritage** (free public code archive): the save API is behind an
  Anubis proof-of-work challenge that blocks non-browser clients. Submit the
  repo URL manually at https://archive.softwareheritage.org/save/#/github
  (URL: `https://github.com/SNAPKITTYWEST/SNAPKITTYWEST`).
- **Wayback Machine**: the save endpoint dropped the connection from here;
  submit `https://raw.githubusercontent.com/SNAPKITTYWEST/SNAPKITTYWEST/main/paper/mathlib5/full/anchors/fingerprint.txt` at https://web.archive.org/save .

## 6. ICP (Internet Computer)

Not free — requires a canister plus **cycles** (ICP gas). Skip unless you fund
a canister and store the payload there.

## Verify locally

```bash
python paper/mathlib5/full/anchors/verify_anchors.py
```
