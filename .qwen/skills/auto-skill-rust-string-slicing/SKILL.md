---
name: rust-string-slicing
description: Safe string slicing patterns in Rust to avoid "byte index out of bounds" panics, and git push workflow patterns
source: auto-skill
extracted_at: '2026-07-08T07:51:52.496Z'
---

# Rust String Slicing Safety & Git Push Patterns

## Context
When working with dynamically generated strings (hashes, seals, timestamps), slicing without length checks causes runtime panics. Additionally, git commit+push in a single command sometimes fails to push.

## Rust String Slicing

### Problem: "byte index out of bounds" panic

When slicing a string without checking its length:

```rust
let seal = compute_seal(data);  // Might be empty or short
println!("Seal: {}", &seal[..16]);  // ❌ PANIC if seal.len() < 16
```

**Error:**
```
thread 'main' panicked at 'byte index 16 is out of bounds of ``'
```

**Fix 1: Check length before slicing**

```rust
let seal = compute_seal(data);
let display = if seal.len() >= 16 { &seal[..16] } else { &seal };
println!("Seal: {}", display);  // ✅ Safe
```

**Fix 2: Use `get()` with fallback**

```rust
let seal = compute_seal(data);
let display = seal.get(..16).unwrap_or(&seal);
println!("Seal: {}", display);  // ✅ Safe
```

**Fix 3: Pad short strings**

```rust
let seal = compute_seal(data);
let display = format!("{:<16}", seal);  // Pad to 16 chars
println!("Seal: {}", display);  // ✅ Safe, always 16+ chars
```

### Common Scenarios

**Hash display (SHA-256 = 64 hex chars):**
```rust
let hash = sha256_hash(data);
println!("Hash: {}", &hash[..16]);  // Show first 16 chars
// ✅ Safe if hash is always 64 chars
// ❌ Unsafe if hash might be empty
```

**Timestamp truncation:**
```rust
let timestamp = get_timestamp();
let short = &timestamp[..10];  // YYYY-MM-DD
// ❌ Unsafe if timestamp format varies
```

**Seal verification:**
```rust
if seal.starts_with(&expected[..8]) {
    // ✅ Safe if expected is always 8+ chars
}
```

### Rule of Thumb
- **Always check length** before slicing dynamic strings
- **Use `get()`** for safe slicing with Option return
- **Pad or truncate** for display purposes
- **Document assumptions** about string lengths in comments

### Safe Slicing Patterns

```rust
// Pattern 1: Conditional slicing
let display = if s.len() >= N { &s[..N] } else { &s };

// Pattern 2: Safe get with fallback
let display = s.get(..N).unwrap_or(&s);

// Pattern 3: Truncate with ellipsis
let display = if s.len() > N {
    format!("{}...", &s[..N-3])
} else {
    s.clone()
};

// Pattern 4: Pad to minimum length
let display = format!("{:<width$}", s, width = N);
```

## Git Push After Commit

### Problem: `git commit && git push` sometimes doesn't push

When chaining commit and push:

```bash
git commit -m "message" && git push origin main
# ❌ Sometimes push doesn't execute or fails silently
```

**Symptoms:**
- Commit succeeds but push doesn't happen
- No error message, just no push
- Remote not updated

**Fix: Use separate commands**

```bash
git commit -m "message"
git push origin main
# ✅ Always works, clear error messages
```

**Alternative: Explicit push in same command**

```bash
git commit -m "message" && git push origin main 2>&1
# ✅ Captures push output for debugging
```

### When This Happens
- Network issues during push
- Authentication failures
- Remote repository changes
- Git hooks blocking push

### Rule of Thumb
- **Always verify push succeeded** by checking output
- **Use separate commands** for clarity
- **Check `git log`** after push to confirm
- **Use `git status`** to verify clean state

### Verification Pattern

```bash
# Commit
git add .
git commit -m "message"

# Push with output
git push origin main

# Verify
git log --oneline -n 3
git status  # Should show "up to date with origin/main"
```

## When to Use

- Displaying hashes, seals, or timestamps in CLI output
- Working with dynamically generated strings
- Git automation scripts
- CI/CD pipelines
- Any code that slices strings based on runtime data

## When NOT to Use

- Static strings with known lengths (safe to slice directly)
- Compile-time constants
- Strings validated earlier in the function
- Git operations with proper error handling already in place

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `byte index N is out of bounds` | String shorter than slice | Check length first |
| `push doesn't execute` | Chained command fails | Use separate commands |
| `remote not updated` | Push failed silently | Check push output explicitly |
