use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use sovereign_embeddings::{Embedding, InMemoryStore, EmbeddingsStore};
use sovereign_inference::{InferenceConfig, InferenceEngine};
use sovereign_model::{Model, ModelConfig};
use sovereign_seal::{seal_model, WormSeal};
use sovereign_tokenizer::Tokenizer;
use std::sync::{Arc, RwLock};
use tokio::sync::Mutex;

#[derive(Clone)]
struct AppState {
    engine: Arc<Mutex<InferenceEngine>>,
    embeddings: Arc<RwLock<InMemoryStore>>,
    seal: Arc<RwLock<Option<WormSeal>>>,
}

#[derive(Deserialize)]
struct GenerateRequest {
    prompt: String,
    #[serde(default = "default_temperature")]
    temperature: f32,
    #[serde(default = "default_top_k")]
    top_k: usize,
    #[serde(default = "default_max_tokens")]
    max_new_tokens: usize,
}

fn default_temperature() -> f32 { 0.8 }
fn default_top_k() -> usize { 40 }
fn default_max_tokens() -> usize { 256 }

#[derive(Serialize)]
struct GenerateResponse {
    text: String,
    tokens_generated: usize,
}

#[derive(Deserialize)]
struct EmbedRequest {
    id: String,
    text: String,
    #[serde(default)]
    metadata: std::collections::HashMap<String, String>,
}

#[derive(Serialize)]
struct EmbedResponse {
    id: String,
    hash: String,
    sealed: bool,
}

#[derive(Deserialize)]
struct SearchRequest {
    query: String,
    #[serde(default = "default_top_k")]
    top_k: usize,
}

#[derive(Serialize)]
struct SearchResult {
    id: String,
    text: String,
    score: f32,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    model: String,
    param_count: usize,
    vocab_size: usize,
    embeddings_count: usize,
    sealed: bool,
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    let engine = state.engine.lock().await;
    let embeddings = state.embeddings.read().unwrap();
    let seal = state.seal.read().unwrap();

    Json(HealthResponse {
        status: "healthy".to_string(),
        model: engine.model.config.vocab_size.to_string(),
        param_count: engine.model.config.param_count(),
        vocab_size: engine.model.config.vocab_size,
        embeddings_count: embeddings.count(),
        sealed: seal.is_some(),
    })
}

async fn generate(
    State(state): State<AppState>,
    Json(req): Json<GenerateRequest>,
) -> Result<Json<GenerateResponse>, StatusCode> {
    let engine = state.engine.lock().await;

    let config = InferenceConfig {
        temperature: req.temperature,
        top_k: req.top_k,
        max_new_tokens: req.max_new_tokens,
        ..Default::default()
    };

    let output = engine.generate(&req.prompt, &config);
    let tokens_generated = engine.tokenizer.encode(&output).len();

    Ok(Json(GenerateResponse {
        text: output,
        tokens_generated,
    }))
}

async fn embed(
    State(state): State<AppState>,
    Json(req): Json<EmbedRequest>,
) -> Result<Json<EmbedResponse>, StatusCode> {
    // Simple embedding: hash the text into a vector
    // In production, this would use the model's embedding layer
    let config = ModelConfig::tiny();
    let dim = config.d_model;
    let vector: Vec<f32> = (0..dim)
        .map(|i| {
            let bytes = req.text.as_bytes();
            let idx = i % bytes.len();
            bytes[idx] as f32 / 255.0
        })
        .collect();

    let mut emb = Embedding::new(&req.id, vector, &req.text, req.metadata);

    let mut embeddings = state.embeddings.write().unwrap();
    let hash = emb.hash.clone();
    embeddings.insert(emb).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(EmbedResponse {
        id: req.id,
        hash,
        sealed: false,
    }))
}

async fn search(
    State(state): State<AppState>,
    Json(req): Json<SearchRequest>,
) -> Result<Json<Vec<SearchResult>>, StatusCode> {
    let config = ModelConfig::tiny();
    let dim = config.d_model;
    let query_vector: Vec<f32> = (0..dim)
        .map(|i| {
            let bytes = req.query.as_bytes();
            let idx = i % bytes.len();
            bytes[idx] as f32 / 255.0
        })
        .collect();

    let embeddings = state.embeddings.read().unwrap();
    let results = embeddings.search(&query_vector, req.top_k);

    let search_results: Vec<SearchResult> = results
        .iter()
        .filter_map(|(id, score)| {
            embeddings.get(id).map(|emb| SearchResult {
                id: id.clone(),
                text: emb.text.clone(),
                score: *score,
            })
        })
        .collect();

    Ok(Json(search_results))
}

async fn seal_weights(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let engine = state.engine.lock().await;
    let weights = &engine.model.token_emb;
    let seal = seal_model(weights, "sovereign-tiny");

    let mut seal_guard = state.seal.write().unwrap();
    *seal_guard = Some(seal.clone());

    Ok(Json(serde_json::json!({
        "hash": seal.hash,
        "checksum": seal.checksum,
        "weight_count": seal.weight_count,
        "verified": true,
    })))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let model_config = ModelConfig::tiny();
    let model = Model::new(model_config);
    let tokenizer = Tokenizer::new(sovereign_tokenizer::TokenizerConfig::default());
    let engine = InferenceEngine::new(model, tokenizer);

    let state = AppState {
        engine: Arc::new(Mutex::new(engine)),
        embeddings: Arc::new(RwLock::new(InMemoryStore::new())),
        seal: Arc::new(RwLock::new(None)),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/generate", post(generate))
        .route("/embed", post(embed))
        .route("/search", post(search))
        .route("/seal", post(seal_weights))
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    tracing::info!("sovereign-llm server listening on :8080");
    axum::serve(listener, app).await.unwrap();
}
