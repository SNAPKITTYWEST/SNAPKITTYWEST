use sovereign_model::{Model, ModelConfig};
use sovereign_tokenizer::Tokenizer;

#[derive(Debug, Clone)]
pub struct KVCache {
    pub key: Vec<f32>,
    pub value: Vec<f32>,
    pub seq_len: usize,
    pub max_len: usize,
    pub n_heads: usize,
    pub head_dim: usize,
}

impl KVCache {
    pub fn new(max_len: usize, n_heads: usize, head_dim: usize) -> Self {
        Self {
            key: vec![0.0; max_len * n_heads * head_dim],
            value: vec![0.0; max_len * n_heads * head_dim],
            seq_len: 0,
            max_len,
            n_heads,
            head_dim,
        }
    }

    pub fn append(&mut self, new_key: &[f32], new_value: &[f32]) {
        let n = new_key.len() / (self.n_heads * self.head_dim);
        for i in 0..n {
            let offset = (self.seq_len + i) * self.n_heads * self.head_dim;
            let src_offset = i * self.n_heads * self.head_dim;
            self.key[offset..offset + self.n_heads * self.head_dim]
                .copy_from_slice(&new_key[src_offset..src_offset + self.n_heads * self.head_dim]);
            self.value[offset..offset + self.n_heads * self.head_dim]
                .copy_from_slice(&new_value[src_offset..src_offset + self.n_heads * self.head_dim]);
        }
        self.seq_len += n;
    }

    pub fn clear(&mut self) {
        self.seq_len = 0;
    }
}

#[derive(Debug, Clone)]
pub struct InferenceConfig {
    pub temperature: f32,
    pub top_k: usize,
    pub max_new_tokens: usize,
    pub repetition_penalty: f32,
}

impl Default for InferenceConfig {
    fn default() -> Self {
        Self {
            temperature: 0.8,
            top_k: 40,
            max_new_tokens: 256,
            repetition_penalty: 1.1,
        }
    }
}

pub struct InferenceEngine {
    pub model: Model,
    pub tokenizer: Tokenizer,
    pub kv_cache: Option<KVCache>,
}

impl InferenceEngine {
    pub fn new(model: Model, tokenizer: Tokenizer) -> Self {
        Self {
            model,
            tokenizer,
            kv_cache: None,
        }
    }

    pub fn init_cache(&mut self, max_len: usize) {
        let config = &self.model.config;
        self.kv_cache = Some(KVCache::new(max_len, config.n_heads, config.d_model / config.n_heads));
    }

    pub fn clear_cache(&mut self) {
        if let Some(cache) = &mut self.kv_cache {
            cache.clear();
        }
    }

    pub fn generate(&self, prompt: &str, config: &InferenceConfig) -> String {
        let mut tokens = self.tokenizer.encode(prompt);
        let initial_len = tokens.len();

        for _ in 0..config.max_new_tokens {
            let logits = self.model.forward(&tokens);
            let last_pos = tokens.len() - 1;
            let vocab_size = self.model.config.vocab_size;
            let last_logits = logits[last_pos * vocab_size..(last_pos + 1) * vocab_size].to_vec();

            // Apply repetition penalty
            let mut penalized_logits = last_logits.clone();
            for &token in &tokens[tokens.len().saturating_sub(64)..] {
                if token < vocab_size {
                    if penalized_logits[token] > 0.0 {
                        penalized_logits[token] /= config.repetition_penalty;
                    } else {
                        penalized_logits[token] *= config.repetition_penalty;
                    }
                }
            }

            let next_token = self.model.sample(&penalized_logits, config.temperature, config.top_k);
            tokens.push(next_token);
        }

        self.tokenizer.decode(&tokens[initial_len..])
    }

    pub fn generate_streaming<F>(&self, prompt: &str, config: &InferenceConfig, mut callback: F)
    where
        F: FnMut(usize, String),
    {
        let mut tokens = self.tokenizer.encode(prompt);
        let initial_len = tokens.len();

        for step in 0..config.max_new_tokens {
            let logits = self.model.forward(&tokens);
            let last_pos = tokens.len() - 1;
            let vocab_size = self.model.config.vocab_size;
            let last_logits = logits[last_pos * vocab_size..(last_pos + 1) * vocab_size].to_vec();

            let next_token = self.model.sample(&last_logits, config.temperature, config.top_k);
            tokens.push(next_token);

            let new_text = self.tokenizer.decode(&tokens[tokens.len() - 1..]);
            callback(step, new_text);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kv_cache() {
        let mut cache = KVCache::new(1024, 4, 64);
        let key = vec![0.1; 4 * 64];
        let value = vec![0.2; 4 * 64];
        cache.append(&key, &value);
        assert_eq!(cache.seq_len, 1);
    }

    #[test]
    fn test_kv_cache_clear() {
        let mut cache = KVCache::new(1024, 4, 64);
        let key = vec![0.1; 4 * 64];
        let value = vec![0.2; 4 * 64];
        cache.append(&key, &value);
        cache.clear();
        assert_eq!(cache.seq_len, 0);
    }

    #[test]
    fn test_kv_cache_multiple_appends() {
        let mut cache = KVCache::new(1024, 4, 64);
        let key = vec![0.1; 4 * 64];
        let value = vec![0.2; 4 * 64];
        for _ in 0..5 {
            cache.append(&key, &value);
        }
        assert_eq!(cache.seq_len, 5);
    }

    #[test]
    fn test_inference_config_default() {
        let config = InferenceConfig::default();
        assert_eq!(config.temperature, 0.8);
        assert_eq!(config.top_k, 40);
        assert_eq!(config.max_new_tokens, 256);
    }

    #[test]
    fn test_engine_generation() {
        let model_config = ModelConfig::tiny();
        let model = Model::new(model_config);
        let tokenizer = sovereign_tokenizer::Tokenizer::new(sovereign_tokenizer::TokenizerConfig::default());
        let engine = InferenceEngine::new(model, tokenizer);

        let config = InferenceConfig {
            max_new_tokens: 5,
            top_k: 256, // Use larger top-k to avoid only special tokens
            ..Default::default()
        };
        let output = engine.generate("hello", &config);
        // Output may be empty if model generates only special tokens
        // Just verify it doesn't panic
        let _ = output;
    }

    #[test]
    fn test_engine_streaming() {
        let model_config = ModelConfig::tiny();
        let model = Model::new(model_config);
        let tokenizer = sovereign_tokenizer::Tokenizer::new(sovereign_tokenizer::TokenizerConfig::default());
        let engine = InferenceEngine::new(model, tokenizer);

        let config = InferenceConfig {
            max_new_tokens: 3,
            ..Default::default()
        };
        let mut count = 0;
        engine.generate_streaming("test", &config, |_step, _text| {
            count += 1;
        });
        assert_eq!(count, 3);
    }

    #[test]
    fn test_engine_cache_init() {
        let model_config = ModelConfig::tiny();
        let model = Model::new(model_config);
        let tokenizer = sovereign_tokenizer::Tokenizer::new(sovereign_tokenizer::TokenizerConfig::default());
        let mut engine = InferenceEngine::new(model, tokenizer);
        engine.init_cache(1024);
        assert!(engine.kv_cache.is_some());
    }

    #[test]
    fn test_engine_cache_clear() {
        let model_config = ModelConfig::tiny();
        let model = Model::new(model_config);
        let tokenizer = sovereign_tokenizer::Tokenizer::new(sovereign_tokenizer::TokenizerConfig::default());
        let mut engine = InferenceEngine::new(model, tokenizer);
        engine.init_cache(1024);
        engine.clear_cache();
        assert_eq!(engine.kv_cache.as_ref().unwrap().seq_len, 0);
    }
}
