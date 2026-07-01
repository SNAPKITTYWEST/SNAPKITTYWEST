<p align="center">
<img src="https://raw.githubusercontent.com/SNAPKITTYWEST/SNAPKITTYWEST/main/bobs-games/assets/voxel-snapkitty.svg" width="128" />
</p>

<h1 align="center">SOVEREIGN LLM</h1>

<p align="center">
Sovereign LLM inference engine — GPT-2 style transformer, BPE tokenizer, KV cache, pgvector embeddings, WORM-sealed weights.
</p>

---

## What This Is

A from-scratch LLM inference engine written in Rust. No Python. No CUDA. No cloud. Your model, your hardware, your sovereignty.

## Architecture

<p align="center">
<img src="architecture.svg" width="100%" />
</p>

### Build Pipeline

```
                    ┌─────────────────────┐
                    │   Text Input        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ sovereign-tokenizer  │
                    │  BPE encode/decode   │
                    │  50K vocab           │
                    └──────────┬──────────┘
                               │ token IDs
                    ┌──────────▼──────────┐
                    │  sovereign-model     │
                    │  ┌────────────────┐  │
                    │  │ Embeddings     │  │
                    │  │ token + pos    │  │
                    │  └───────┬────────┘  │
                    │  ┌───────▼────────┐  │
                    │  │ Transformer ×N │  │
                    │  │ Attn + FFN     │  │
                    │  └───────┬────────┘  │
                    │  ┌───────▼────────┐  │
                    │  │ LM Head + Soft │  │
                    │  └───────┬────────┘  │
                    └──────────┬──────────┘
                               │ logits
                    ┌──────────▼──────────┐
                    │ sovereign-inference  │
                    │  KV cache            │
                    │  top-k sampling      │
                    │  rep penalty         │
                    └──────────┬──────────┘
                               │ generated tokens
                    ┌──────────▼──────────┐
                    │ sovereign-embeddings │
                    │  cosine search       │
                    │  pgvector store      │
                    └──────────┬──────────┘
                               │ embeddings
                    ┌──────────▼──────────┐
                    │   sovereign-seal     │
                    │  SHA-256 WORM        │
                    │  tamper detection    │
                    └──────────┬──────────┘
                               │ sealed output
                    ┌──────────▼──────────┐
                    │  sovereign-server    │
                    │  Axum :8080          │
                    │  REST API            │
                    └─────────────────────┘
```

## Model Configs

| Config | Layers | Heads | d_model | d_ff | Params |
|--------|--------|-------|---------|------|--------|
| tiny | 4 | 4 | 256 | 1024 | ~12M |
| small | 6 | 6 | 384 | 1536 | ~40M |
| default | 12 | 12 | 768 | 3072 | ~124M |

## Usage

```rust
use sovereign_model::{Model, ModelConfig};
use sovereign_tokenizer::Tokenizer;
use sovereign_inference::{InferenceEngine, InferenceConfig};

// Create model and tokenizer
let config = ModelConfig::tiny();
let model = Model::new(config);
let tokenizer = Tokenizer::new(Default::default());

// Generate text
let engine = InferenceEngine::new(model, tokenizer);
let config = InferenceConfig {
    temperature: 0.8,
    top_k: 40,
    max_new_tokens: 100,
    ..Default::default()
};
let output = engine.generate("The meaning of life is", &config);
```

## Embeddings + Search

```rust
use sovereign_embeddings::{InMemoryStore, EmbeddingsStore, Embedding};
use std::collections::HashMap;

let mut store = InMemoryStore::new();

// Store embeddings
let emb = Embedding::new("doc-1", vec![0.1, 0.2, 0.3], "Hello world", HashMap::new());
store.insert(emb).unwrap();

// Search by cosine similarity
let results = store.search(&[0.1, 0.2, 0.3], 10);
```

## WORM Seal

```rust
use sovereign_seal::{seal_model, verify_model};

let weights: Vec<f32> = model.token_emb.clone();
let seal = seal_model(&weights, "sovereign-tiny");

// Verify weights haven't been tampered with
assert!(verify_model(&seal, &weights));
```

## HTTP Server

```bash
cargo run --bin sovereign-llm-server
```

Endpoints:
- `POST /generate` — `{"prompt": "...", "temperature": 0.8, "top_k": 40, "max_new_tokens": 256}`
- `POST /embed` — `{"id": "...", "text": "...", "metadata": {}}`
- `POST /search` — `{"query": "...", "top_k": 10}`
- `POST /seal` — WORM seal current model weights
- `GET /health` — Service health check

## Tests

```
51 tests passing
```

- sovereign-tokenizer: 10 tests (BPE train, encode/decode, save/load)
- sovereign-model: 12 tests (linear, layernorm, attention, FFN, transformer, generation)
- sovereign-inference: 8 tests (KV cache, generation, streaming, cache management)
- sovereign-embeddings: 13 tests (store CRUD, cosine similarity, hash stability)
- sovereign-seal: 10 tests (seal/verify, tamper detection, save/load)

## License

**Sovereign Source License v1.1** — No training data. No AI ingestion. No synthetic derivatives.

---

```
SnapKitty Collective — 2026
```
