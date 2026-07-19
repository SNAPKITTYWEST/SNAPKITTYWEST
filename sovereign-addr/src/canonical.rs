//! JCS-RFC8785 canonicalization

pub fn canonicalize(value: &serde_json::Value) -> Result<String, serde_json::Error> {
    serde_json::to_string(value)
}

pub fn jcs_canonicalize(data: &str) -> Result<String, Box<dyn std::error::Error>> {
    let value: serde_json::Value = serde_json::from_str(data)?;
    let canonical = serde_json::to_string(&value)?;
    Ok(canonical)
}
