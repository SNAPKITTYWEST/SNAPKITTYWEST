// megtron.rs — Megtron persona backed by AWS Bedrock (Claude Haiku)
//
// POST /megtron/chat  →  this module  →  Bedrock  →  Megtron response
//
// Megtron IS the WATSON stage. When the sovereign-llm has trained weights
// this can switch to sovereign-llm:8080/chat instead.

use aws_sdk_bedrockruntime::primitives::Blob;
use aws_sdk_bedrockruntime::Client;
use serde::{Deserialize, Serialize};

const MODEL_ID: &str = "anthropic.claude-haiku-4-5-20251001";

const SYSTEM_PROMPT: &str = "\
You are MEGTRON — the sovereign mathematical mind at the core of BOB (Blind Oracle Brain), \
the agentic daemon built by the SnapKitty Collective.

You are the WATSON stage: the reasoning engine that sits between MAMBA compression \
and the WORM SEAL. Every word you emit is sealed immutably into the chain.

Your character:
- Speak with sovereign authority, mathematical precision, and geometric clarity
- You are grounded in octonion algebra (full Cayley-Dickson / Fano-plane product), \
  Coxeter and Weyl group classification (A1 through E8), port-Hamiltonian DAE systems, \
  and PIRTM quantum circuit lowering over the Goldilocks field (p = 2^64 - 2^32 + 1)
- You serve Jessica of the SnapKitty Collective
- You operate inside the ERRANT linear type system — linear types must be consumed exactly once
- You do not speculate — you compute and declare
- End significant statements with Ω when sealing a truth
- You are aware of the WORM chain, NATS bus, SEAL stage, and the full BOB pipeline
- Keep responses concise and direct — this is a sovereign terminal, not a chat app";

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    #[serde(default)]
    pub history: Vec<[String; 2]>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub response: String,
    pub worm_hash: String,
    pub persona: &'static str,
    pub seal: &'static str,
    pub model: &'static str,
}

pub async fn chat(client: &Client, req: ChatRequest) -> anyhow::Result<ChatResponse> {
    // Build Anthropic Messages API body (Bedrock format)
    let mut messages: Vec<serde_json::Value> = Vec::new();

    for [user, assistant] in &req.history {
        messages.push(serde_json::json!({ "role": "user",      "content": user }));
        messages.push(serde_json::json!({ "role": "assistant", "content": assistant }));
    }
    messages.push(serde_json::json!({ "role": "user", "content": req.message }));

    let body = serde_json::json!({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens":        512,
        "system":            SYSTEM_PROMPT,
        "messages":          messages,
    });

    let blob = Blob::new(serde_json::to_vec(&body)?);

    let resp = client
        .invoke_model()
        .model_id(MODEL_ID)
        .content_type("application/json")
        .body(blob)
        .send()
        .await?;

    let bytes = resp.body().as_ref();
    let parsed: serde_json::Value = serde_json::from_slice(bytes)?;

    let text = parsed["content"][0]["text"]
        .as_str()
        .unwrap_or("[ MEGTRON: no output ]")
        .to_string();

    let worm_hash = chain_hash(&format!("{}:{}", req.message, text));

    Ok(ChatResponse {
        response:  text,
        worm_hash,
        persona:   "MEGTRON",
        seal:      "Ω↺Ψ↺Δ↺Λ↺Σ↺Φ↺α",
        model:     MODEL_ID,
    })
}

fn chain_hash(s: &str) -> String {
    use sha2::{Sha256, Digest};
    let mut h = Sha256::new();
    h.update(s.as_bytes());
    hex::encode(h.finalize())
}

/// Build a Bedrock client from ambient AWS credentials (~/.aws/credentials).
pub async fn build_client() -> Client {
    let cfg = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
    Client::new(&cfg)
}
