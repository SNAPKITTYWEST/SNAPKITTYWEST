use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Embedding {
    pub id: String,
    pub vector: Vec<f32>,
    pub text: String,
    pub metadata: HashMap<String, String>,
    pub hash: String,
    pub sealed: bool,
}

impl Embedding {
    pub fn new(id: &str, vector: Vec<f32>, text: &str, metadata: HashMap<String, String>) -> Self {
        let hash = compute_hash(&vector, text);
        Self {
            id: id.to_string(),
            vector,
            text: text.to_string(),
            metadata,
            hash,
            sealed: false,
        }
    }

    pub fn seal(&mut self) {
        self.sealed = true;
    }
}

pub fn compute_hash(vector: &[f32], text: &str) -> String {
    let mut hasher = Sha256::new();
    for &v in vector {
        hasher.update(v.to_le_bytes());
    }
    hasher.update(text.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub trait EmbeddingsStore {
    fn insert(&mut self, embedding: Embedding) -> Result<(), String>;
    fn get(&self, id: &str) -> Option<&Embedding>;
    fn search(&self, query: &[f32], top_k: usize) -> Vec<(String, f32)>;
    fn delete(&mut self, id: &str) -> Result<(), String>;
    fn count(&self) -> usize;
}

pub struct InMemoryStore {
    embeddings: HashMap<String, Embedding>,
}

impl InMemoryStore {
    pub fn new() -> Self {
        Self {
            embeddings: HashMap::new(),
        }
    }

    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm_a == 0.0 || norm_b == 0.0 {
            0.0
        } else {
            dot / (norm_a * norm_b)
        }
    }
}

impl Default for InMemoryStore {
    fn default() -> Self {
        Self::new()
    }
}

impl EmbeddingsStore for InMemoryStore {
    fn insert(&mut self, embedding: Embedding) -> Result<(), String> {
        self.embeddings.insert(embedding.id.clone(), embedding);
        Ok(())
    }

    fn get(&self, id: &str) -> Option<&Embedding> {
        self.embeddings.get(id)
    }

    fn search(&self, query: &[f32], top_k: usize) -> Vec<(String, f32)> {
        let mut results: Vec<(String, f32)> = self
            .embeddings
            .iter()
            .map(|(id, emb)| (id.clone(), Self::cosine_similarity(query, &emb.vector)))
            .collect();

        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        results.truncate(top_k);
        results
    }

    fn delete(&mut self, id: &str) -> Result<(), String> {
        self.embeddings.remove(id);
        Ok(())
    }

    fn count(&self) -> usize {
        self.embeddings.len()
    }
}

pub struct PgVectorStore {
    connection_string: String,
}

impl PgVectorStore {
    pub fn new(connection_string: &str) -> Self {
        Self {
            connection_string: connection_string.to_string(),
        }

        // In production, this would:
        // 1. Connect to PostgreSQL
        // 2. Enable pgvector extension
        // 3. Create embeddings table with vector column
        // CREATE TABLE IF NOT EXISTS embeddings (
        //     id TEXT PRIMARY KEY,
        //     vector vector(384),
        //     text TEXT,
        //     metadata JSONB,
        //     hash TEXT,
        //     sealed BOOLEAN DEFAULT FALSE
        // );
        // CREATE INDEX ON embeddings USING ivfflat (vector vector_cosine_ops);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedding_new() {
        let mut metadata = HashMap::new();
        metadata.insert("source".to_string(), "test".to_string());
        let emb = Embedding::new("test-1", vec![0.1, 0.2, 0.3], "hello", metadata);
        assert_eq!(emb.id, "test-1");
        assert!(!emb.sealed);
    }

    #[test]
    fn test_embedding_seal() {
        let emb = &mut Embedding::new("test-1", vec![0.1], "hello", HashMap::new());
        emb.seal();
        assert!(emb.sealed);
    }

    #[test]
    fn test_compute_hash() {
        let h1 = compute_hash(&[0.1, 0.2], "hello");
        let h2 = compute_hash(&[0.1, 0.2], "hello");
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64); // SHA-256 hex
    }

    #[test]
    fn test_compute_hash_different() {
        let h1 = compute_hash(&[0.1, 0.2], "hello");
        let h2 = compute_hash(&[0.1, 0.2], "world");
        assert_ne!(h1, h2);
    }

    #[test]
    fn test_in_memory_store_insert() {
        let mut store = InMemoryStore::new();
        let emb = Embedding::new("1", vec![0.1, 0.2], "text", HashMap::new());
        assert!(store.insert(emb).is_ok());
        assert_eq!(store.count(), 1);
    }

    #[test]
    fn test_in_memory_store_get() {
        let mut store = InMemoryStore::new();
        let emb = Embedding::new("1", vec![0.1, 0.2], "text", HashMap::new());
        store.insert(emb).unwrap();
        assert!(store.get("1").is_some());
        assert!(store.get("2").is_none());
    }

    #[test]
    fn test_in_memory_store_search() {
        let mut store = InMemoryStore::new();
        store.insert(Embedding::new("1", vec![1.0, 0.0, 0.0], "a", HashMap::new())).unwrap();
        store.insert(Embedding::new("2", vec![0.0, 1.0, 0.0], "b", HashMap::new())).unwrap();
        store.insert(Embedding::new("3", vec![0.9, 0.1, 0.0], "c", HashMap::new())).unwrap();

        let results = store.search(&[1.0, 0.0, 0.0], 2);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].0, "1"); // Most similar
    }

    #[test]
    fn test_in_memory_store_delete() {
        let mut store = InMemoryStore::new();
        store.insert(Embedding::new("1", vec![0.1], "text", HashMap::new())).unwrap();
        assert!(store.delete("1").is_ok());
        assert_eq!(store.count(), 0);
    }

    #[test]
    fn test_cosine_similarity() {
        let sim = InMemoryStore::cosine_similarity(&[1.0, 0.0], &[1.0, 0.0]);
        assert!((sim - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let sim = InMemoryStore::cosine_similarity(&[1.0, 0.0], &[0.0, 1.0]);
        assert!(sim.abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_zero() {
        let sim = InMemoryStore::cosine_similarity(&[0.0, 0.0], &[1.0, 0.0]);
        assert!(sim.abs() < 0.001);
    }

    #[test]
    fn test_embedding_hash_is_stable() {
        let emb1 = Embedding::new("1", vec![0.1, 0.2, 0.3], "hello", HashMap::new());
        let emb2 = Embedding::new("1", vec![0.1, 0.2, 0.3], "hello", HashMap::new());
        assert_eq!(emb1.hash, emb2.hash);
    }

    #[test]
    fn test_store_default() {
        let store = InMemoryStore::default();
        assert_eq!(store.count(), 0);
    }
}
