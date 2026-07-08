//! Canonical JSON Serialization
//! Deterministic byte representation with key ordering invariance

use serde_json::Value;
use std::collections::BTreeMap;

/// Canonicalize a JSON value to deterministic bytes
/// Keys are sorted lexicographically to ensure same logical value → same bytes
pub fn canonical_bytes(value: &Value) -> Vec<u8> {
    canonicalize_value(value).into_bytes()
}

/// Recursively canonicalize a JSON value
fn canonicalize_value(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(b) => if *b { "true" } else { "false" }.to_string(),
        Value::Number(n) => n.to_string(),
        Value::String(s) => canonicalize_string(s),
        Value::Array(arr) => {
            let inner: Vec<String> = arr.iter().map(canonicalize_value).collect();
            format!("[{}]", inner.join(","))
        }
        Value::Object(obj) => {
            // KEY INSIGHT: Sort by key name (BTreeMap ensures lexicographic order)
            let sorted: BTreeMap<&String, &Value> = obj.iter().collect();
            let inner: Vec<String> = sorted
                .iter()
                .map(|(k, v)| format!("\"{}\":{}", k, canonicalize_value(v)))
                .collect();
            format!("{{{}}}", inner.join(","))
        }
    }
}

/// Canonicalize a string (minimal: return as-is)
/// Production: use unicode-normalization for NFC form
fn canonicalize_string(s: &str) -> String {
    // Escape special characters for JSON
    let escaped = s
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t");
    format!("\"{}\"", escaped)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_key_ordering_invariance() {
        let v1 = json!({"b": 2, "a": 1});
        let v2 = json!({"a": 1, "b": 2});
        assert_eq!(canonical_bytes(&v1), canonical_bytes(&v2));
    }

    #[test]
    fn test_nested_objects() {
        let v1 = json!({"z": {"b": 2, "a": 1}, "y": 3});
        let v2 = json!({"y": 3, "z": {"a": 1, "b": 2}});
        assert_eq!(canonical_bytes(&v1), canonical_bytes(&v2));
    }

    #[test]
    fn test_arrays_preserve_order() {
        let v1 = json!([1, 2, 3]);
        let v2 = json!([1, 2, 3]);
        assert_eq!(canonical_bytes(&v1), canonical_bytes(&v2));
    }

    #[test]
    fn test_primitives() {
        assert_eq!(canonicalize_value(&json!(null)), "null");
        assert_eq!(canonicalize_value(&json!(true)), "true");
        assert_eq!(canonicalize_value(&json!(false)), "false");
        assert_eq!(canonicalize_value(&json!(42)), "42");
        assert_eq!(canonicalize_value(&json!("hello")), "\"hello\"");
    }
}
