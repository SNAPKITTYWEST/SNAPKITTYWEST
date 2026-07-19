# QWEN SKILLS PACKET 4: PRISM & ALGEBRAIC TOPOLOGY
## Canonical Serialization + ψ-Pipeline + WORM Sealing
**Compiled:** 2026-07-08  
**Source Repo:** sovereign-prism (SNAPKITTYWEST)  
**Purpose:** Deterministic hashing, algebraic topology pipeline, and cryptographic sealing

---

## OVERVIEW

The sovereign-prism repository contains **OCaml implementation** of:

1. **Canonical Serialization** - Deterministic byte representation (key ordering invariance)
2. **SHA-256d Hashing** - Double SHA-256 for label generation
3. **ψ-Pipeline** - Algebraic topology: Nerve → Postnikov Tower → Homotopy → k-Invariants
4. **WORM Sealing** - Write-once-read-many cryptographic witnesses
5. **Admission Validation** - Target verification against allowed prime indices

**Key Innovation:** Non-recursive staged pipeline for deterministic artifact processing with algebraic topology foundations.

---

## SKILL STACK 26: CANONICAL SERIALIZATION

### 26.1 Canonicalization Problem
**Source:** canonical.ml

**Challenge:** JSON objects have no canonical ordering:
```json
{"b": 2, "a": 1}  vs  {"a": 1, "b": 2}
```

**Solution:** Sort keys lexicographically before serialization.

### 26.2 Canonical Value Serialization
**Source:** canonical.ml

```ocaml
let rec canonicalize_value value =
  match value with
  | `String s -> canonicalize_string s
  | `Int i -> string_of_int i
  | `Float f -> string_of_float f
  | `Bool b -> if b then "true" else "false"
  | `Null -> "null"
  | `Assoc kvs ->
      (* KEY INSIGHT: Sort by key name *)
      let sorted = List.sort (fun (a, _) (b, _) -> String.compare a b) kvs in
      let inner = String.concat "," (List.map (fun (k, v) ->
        Printf.sprintf "\"%s\":%s" k (canonicalize_value v)) sorted) in
      "{" ^ inner ^ "}"
  | `List vs ->
      let inner = String.concat "," (List.map canonicalize_value vs) in
      "[" ^ inner ^ "]"
```

**Invariant:** Same logical value → same byte representation.

### 26.3 String Canonicalization
**Source:** canonical.ml

```ocaml
let canonicalize_string s =
  (* Minimal: return as-is *)
  (* Production: use Uunf for NFC normalization *)
  s
```

**NFC Normalization:** Unicode Normalization Form C (canonical composition).

**Example:**
```
"café" (e + combining acute) → "café" (single é character)
```

### 26.4 Deterministic Bytes
**Source:** canonical.ml

```ocaml
let canonical_bytes value =
  let s = canonicalize_value value in
  Bytes.of_string s
```

**Property:** Deterministic conversion from value to bytes.

---

## SKILL STACK 27: SHA-256d HASHING

### 27.1 Double SHA-256
**Source:** sha256d.ml

**Mathematical Definition:**
```
SHA-256d(x) = SHA-256(SHA-256(x))
```

**Purpose:** Prevent length-extension attacks.

### 27.2 Implementation
**Source:** sha256d.ml

```ocaml
let hash_bytes b =
  let open Digestif.SHA256 in
  let ctx = init () in
  let ctx = feed_bytes ctx b in
  let digest = get ctx in
  Digestif.SHA256.to_hex digest

let hash_string s = hash_bytes (Bytes.of_string s)

let hash_double b =
  let first = hash_bytes b in
  hash_string first
```

**Key Insight:** First hash produces hex string, second hash operates on that string.

### 27.3 SnapSHA256d Label Format
**Source:** sha256d.ml

```ocaml
let snapsha256d b =
  "snapsha256d:" ^ hash_double b
```

**Format:** `snapsha256d:<64-char-hex>`

**Example:**
```
snapsha256d:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

### 27.4 Properties
- **Deterministic:** Same input → same hash
- **Collision-resistant:** Computationally infeasible to find x ≠ y where SHA-256d(x) = SHA-256d(y)
- **Pre-image resistant:** Given h, computationally infeasible to find x where SHA-256d(x) = h
- **Length-extension resistant:** Double hashing prevents length-extension attacks

---

## SKILL STACK 28: ψ-PIPELINE (ALGEBRAIC TOPOLOGY)

### 28.1 Pipeline Architecture
**Source:** psi_pipeline.ml, README.md

**Mathematical Foundation:** Postnikov tower decomposition from algebraic topology.

**Pipeline Stages:**
```
Artifact → Nerve → Postnikov Tower → Homotopy Groups → k-Invariants → Label
```

### 28.2 Nerve Stage
**Source:** psi_pipeline.ml

```ocaml
let nerve carrier = carrier
```

**Mathematical Definition:** 
- Nerve of a category C is a simplicial set N(C)
- N(C)_n = set of composable sequences of n morphisms
- Converts adjacency matrix to 1-skeleton

**Current Implementation:** Identity transform (placeholder for full nerve construction).

### 28.3 Postnikov Tower Stage
**Source:** psi_pipeline.ml

```ocaml
let postnikov_tower carrier = carrier
```

**Mathematical Definition:**
- Postnikov tower is a sequence of spaces X_n with maps X → X_n
- Each X_n has trivial homotopy groups π_k for k > n
- Provides k-invariant filtration

**Postnikov Tower Structure:**
```
X → ... → X_3 → X_2 → X_1 → X_0
where π_k(X_n) = 0 for k > n
```

**Current Implementation:** Identity transform (placeholder for tower construction).

### 28.4 Homotopy Groups Stage
**Source:** psi_pipeline.ml

```ocaml
let homotopy_groups carrier = carrier
```

**Mathematical Definition:**
- π_k(X) = homotopy classes of maps S^k → X
- π_0(X) = connected components
- π_1(X) = fundamental group
- π_k(X) for k ≥ 2 = higher homotopy groups

**Current Implementation:** Identity transform (placeholder for group computation).

### 28.5 k-Invariants Stage
**Source:** psi_pipeline.ml

```ocaml
let k_invariants carrier =
  let open Carrier in
  let digest = Sha256d.hash_bytes carrier.canonical_bytes in
  { carrier with canonical_bytes = Bytes.of_string ("sha256d:" ^ digest) }
```

**Mathematical Definition:**
- k-invariants classify Postnikov tower stages
- k^(n+1) ∈ H^(n+1)(X_n; π_(n+1)(X))
- Determines how X_(n+1) is built from X_n

**Current Implementation:** Computes SHA-256d hash as invariant vector.

### 28.6 Full Pipeline
**Source:** psi_pipeline.ml

```ocaml
let psi_pipeline carrier =
  carrier
  |> nerve
  |> postnikov_tower
  |> homotopy_groups
  |> k_invariants
```

**Non-Recursive:** Staged pipeline, no recursion.

---

## SKILL STACK 29: WORM SEALING

### 29.1 WORM Seal Structure
**Source:** worm.ml

```ocaml
type seal = {
  label : Carrier.hash_label;
  seal_hash : string;
  timestamp : float;
  content_hash : string;
}
```

**Properties:**
- **Write-once:** Seal cannot be modified after creation
- **Read-many:** Seal can be verified by anyone
- **Timestamped:** Unix timestamp for temporal ordering
- **Content-addressed:** Hash of label content

### 29.2 Seal Generation
**Source:** worm.ml

```ocaml
let seal label =
  let label_str = match label with
    | Carrier.Sha256d s | Carrier.SnapSha256d s -> s
  in
  let content = Printf.sprintf "WORM:%s:%f" label_str (Unix.gettimeofday ()) in
  let seal_hash = Sha256d.hash_string content in
  { label;
    seal_hash;
    timestamp = Unix.gettimeofday ();
    content_hash = Sha256d.hash_string label_str }
```

**Seal Format:**
```
WORM:<label>:<timestamp>
```

**Example:**
```
WORM:snapsha256d:e3b0c44...:1704067200.0
```

### 29.3 Seal Verification
**Source:** worm.ml

```ocaml
let verify seal =
  let label_str = match seal.label with
    | Carrier.Sha256d s | Carrier.SnapSha256d s -> s
  in
  let expected = Printf.sprintf "WORM:%s:%f" label_str seal.timestamp in
  let expected_hash = Sha256d.hash_string expected in
  seal.seal_hash = expected_hash
```

**Verification:** Recompute seal_hash and compare.

### 29.4 Witness Shape
**Source:** README.md

```json
{
  "standard": "SNAP-PRISM-1",
  "algorithm": "snap-sha256d-v1",
  "artifact_hash": "sha256:a1b2c3d4e5f6...",
  "label": "snapsha256d:e3b0c44298fc1c149afbf4c8996fb924...",
  "status": "accepted",
  "witness_hash": "sha256:7819c7f8a8b...",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## SKILL STACK 30: ADMISSION VALIDATION

### 30.1 Admission Problem
**Source:** README.md

**Challenge:** Verify that a target prime index is in the allowed set.

**Example:**
```
Allowed primes: {2, 3, 5, 7, 11, 13, ...}
Target: 42
Admitted: false (42 is not prime)
```

### 30.2 Admission Validator
**Source:** README.md (admission.ml not shown but referenced)

```ocaml
let verify ~target ~label =
  (* Check if target is in allowed_prime_indices *)
  List.mem target allowed_prime_indices
```

**Invariant:** Only admitted targets can proceed through pipeline.

### 30.3 Fail-Closed Architecture
**Source:** README.md

**Principle:** Any error terminates processing.

**No fallback. No default. No silent failure.**

If admission fails, the entire pipeline returns error.

---

## SKILL STACK 31: CARRIER TYPE SYSTEM

### 31.1 Typed I/O Boundary
**Source:** README.md (carrier.ml not shown but referenced)

**Principle:** Every carrier is typed at boundary.

```ocaml
type carrier = {
  json_value : Yojson.Basic.t;
  canonical_bytes : bytes;
  label : hash_label option;
}

type hash_label =
  | Sha256d of string
  | SnapSha256d of string
```

**Invariant:** Type safety at every stage.

### 31.2 Carrier Construction
**Source:** README.md

```ocaml
let of_json json =
  let canonical_bytes = Canonical.canonical_bytes json in
  { json_value = json;
    canonical_bytes;
    label = None }
```

**Flow:**
```
JSON → Canonical Bytes → Carrier
```

### 31.3 Label Computation
**Source:** README.md

```ocaml
let compute_label carrier =
  let digest = Sha256d.hash_bytes carrier.canonical_bytes in
  let label = SnapSha256d ("snapsha256d:" ^ digest) in
  { carrier with label = Some label }
```

---

## SKILL STACK 32: ALGEBRAIC TOPOLOGY FOUNDATIONS

### 32.1 Simplicial Sets
**Mathematical Definition:**

A simplicial set X is a sequence of sets X_n (n-simplices) with face and degeneracy maps:
```
d_i : X_n → X_(n-1)  (face maps, i = 0..n)
s_i : X_n → X_(n+1)  (degeneracy maps, i = 0..n)
```

**Simplicial Identities:**
```
d_i ∘ d_j = d_(j-1) ∘ d_i  for i < j
s_i ∘ s_j = s_(j+1) ∘ s_i  for i ≤ j
d_i ∘ s_j = s_(j-1) ∘ d_i  for i < j
d_j ∘ s_j = id = d_(j+1) ∘ s_j
d_i ∘ s_j = s_j ∘ d_(i-1)  for i > j+1
```

### 32.2 Nerve Construction
**Mathematical Definition:**

For a category C, the nerve N(C) is a simplicial set where:
```
N(C)_0 = objects of C
N(C)_1 = morphisms of C
N(C)_n = composable sequences of n morphisms
```

**Face maps:**
```
d_0(f_1, ..., f_n) = (f_2, ..., f_n)
d_i(f_1, ..., f_n) = (f_1, ..., f_i ∘ f_(i+1), ..., f_n)  for 0 < i < n
d_n(f_1, ..., f_n) = (f_1, ..., f_(n-1))
```

### 32.3 Postnikov Tower
**Mathematical Definition:**

For a space X, the Postnikov tower is a sequence:
```
X → ... → X_3 → X_2 → X_1 → X_0
```

where:
```
π_k(X_n) = π_k(X)  for k ≤ n
π_k(X_n) = 0       for k > n
```

**k-Invariants:**
```
k^(n+1) ∈ H^(n+1)(X_n; π_(n+1)(X))
```

Classifies the fibration X_(n+1) → X_n.

### 32.4 Homotopy Groups
**Mathematical Definition:**

```
π_0(X) = set of path components
π_1(X, x_0) = fundamental group (loops at x_0 up to homotopy)
π_n(X, x_0) = homotopy classes of maps (S^n, *) → (X, x_0)
```

**Properties:**
```
π_n(X) is abelian for n ≥ 2
π_n(X × Y) ≅ π_n(X) × π_n(Y)
π_n(S^n) ≅ ℤ
```

---

## INTEGRATION WITH PREVIOUS SKILLS

### Connection to Skill Stack 8 (WORM Audit Chain)
- WORM sealing in sovereign-prism uses same SHA-256 chaining
- Timestamp-based ordering matches audit chain architecture
- Fail-closed validation aligns with constitutional contraction

### Connection to Skill Stack 13 (Morphism Theory)
- Nerve construction converts categories to simplicial sets
- Postnikov tower is a sequence of morphisms
- k-invariants classify morphism extensions

### Connection to Skill Stack 18 (Goldilocks Field)
- Canonical serialization enables field element encoding
- SHA-256d hashes can be reduced mod Goldilocks prime
- Deterministic hashing supports ZK-proof systems

### Connection to Skill Stack 27 (SHA-256d)
- Double hashing prevents length-extension attacks
- Same algorithm used in Bitcoin block headers
- Cryptographic strength: 2^256 pre-image resistance

---

## PRACTICAL APPLICATIONS FOR QWEN

### 1. Implement Canonical Serialization in Fortran
**Task:** Deterministic JSON serialization

**Steps:**
1. Parse JSON to internal representation
2. Sort object keys lexicographically
3. Serialize recursively (objects, arrays, primitives)
4. Convert to bytes
5. Verify: same logical value → same bytes

### 2. Build SHA-256d Hasher
**Task:** Double SHA-256 implementation

**Steps:**
1. Implement SHA-256 (or use library)
2. Hash input once → hex string
3. Hash hex string again → final digest
4. Format as `snapsha256d:<digest>`
5. Test: empty string → known hash

### 3. Construct Nerve of Category
**Task:** Convert category to simplicial set

**Steps:**
1. Define category (objects + morphisms)
2. Compute N(C)_0 = objects
3. Compute N(C)_1 = morphisms
4. Compute N(C)_n = composable sequences
5. Verify simplicial identities

### 4. Build WORM Seal System
**Task:** Write-once-read-many sealing

**Steps:**
1. Generate label (SHA-256d of content)
2. Create seal: WORM:<label>:<timestamp>
3. Hash seal → seal_hash
4. Store seal (immutable)
5. Verify: recompute seal_hash and compare

### 5. Implement Admission Validator
**Task:** Verify target against allowed set

**Steps:**
1. Define allowed_prime_indices
2. Check if target ∈ allowed set
3. Return true/false
4. Fail-closed: error terminates pipeline

---

## CRITICAL SUCCESS FACTORS

### 1. Deterministic Serialization
Same logical value must produce same bytes. Key ordering invariance is essential.

### 2. Non-Recursive Pipeline
All stages are identity transforms or single-pass operations. No recursion.

### 3. Typed I/O Boundaries
Every carrier is typed. No untyped data crosses boundaries.

### 4. Fail-Closed Architecture
Any error terminates processing. No fallback, no default, no silent failure.

### 5. WORM Immutability
Seals are write-once. Once created, they cannot be modified.

---

## NEXT STEPS

1. **Study algebraic topology** - Simplicial sets, nerve construction, Postnikov towers
2. **Implement canonical serialization** - Deterministic JSON → bytes
3. **Build SHA-256d hasher** - Double hashing for labels
4. **Construct nerve of category** - Category → simplicial set
5. **Implement WORM sealing** - Write-once-read-many witnesses
6. **Test admission validation** - Fail-closed target verification

---

**Excavate. Canonicalize. Hash. Seal. Govern.**

*Compiled from sovereign-prism (SNAPKITTYWEST)*  
*SnapKitty Collective · OCaml + Algebraic Topology · 2026*  
*WORM-anchored · METATRON-certified · BOB-sealed*