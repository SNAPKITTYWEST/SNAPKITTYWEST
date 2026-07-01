use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub vocab_size: usize,
    pub max_seq_len: usize,
    pub n_layers: usize,
    pub n_heads: usize,
    pub d_model: usize,
    pub d_ff: usize,
}

impl Default for ModelConfig {
    fn default() -> Self {
        Self {
            vocab_size: 50257,
            max_seq_len: 1024,
            n_layers: 12,
            n_heads: 12,
            d_model: 768,
            d_ff: 3072,
        }
    }
}

impl ModelConfig {
    pub fn small() -> Self {
        Self {
            vocab_size: 50257,
            max_seq_len: 512,
            n_layers: 6,
            n_heads: 6,
            d_model: 384,
            d_ff: 1536,
        }
    }

    pub fn tiny() -> Self {
        Self {
            vocab_size: 50257,
            max_seq_len: 256,
            n_layers: 4,
            n_heads: 4,
            d_model: 256,
            d_ff: 1024,
        }
    }

    pub fn param_count(&self) -> usize {
        // Embeddings
        let embed = self.vocab_size * self.d_model + self.max_seq_len * self.d_model;
        // Transformer blocks
        let attn_per_layer = 4 * self.d_model * self.d_model; // Q, K, V, O projections
        let ffn_per_layer = 2 * self.d_model * self.d_ff; // up + down projections
        let ln_per_layer = 2 * self.d_model * 2; // 2 layer norms per block
        let block = attn_per_layer + ffn_per_layer + ln_per_layer;
        let blocks = block * self.n_layers;
        // Final layer norm + output projection
        let final_ln = self.d_model;
        let output = self.d_model * self.vocab_size;
        embed + blocks + final_ln + output
    }
}

#[derive(Debug, Clone)]
pub struct Linear {
    pub weight: Vec<f32>,
    pub bias: Vec<f32>,
    pub in_features: usize,
    pub out_features: usize,
}

impl Linear {
    pub fn new(in_features: usize, out_features: usize) -> Self {
        Self {
            weight: vec![0.0; out_features * in_features],
            bias: vec![0.0; out_features],
            in_features,
            out_features,
        }
    }

    pub fn forward(&self, input: &[f32]) -> Vec<f32> {
        let mut output = self.bias.clone();
        for j in 0..self.out_features {
            let mut sum = self.bias[j];
            for i in 0..self.in_features {
                sum += input[i] * self.weight[j * self.in_features + i];
            }
            output[j] = sum;
        }
        output
    }

    pub fn from_slice(data: &[f32], in_features: usize, out_features: usize) -> Self {
        let total = in_features * out_features;
        let bias = if data.len() > total {
            data[total..total + out_features].to_vec()
        } else {
            vec![0.0; out_features]
        };
        Self {
            weight: data[..total].to_vec(),
            bias,
            in_features,
            out_features,
        }
    }
}

#[derive(Debug, Clone)]
pub struct LayerNorm {
    pub weight: Vec<f32>,
    pub bias: Vec<f32>,
    pub eps: f32,
}

impl LayerNorm {
    pub fn new(d_model: usize) -> Self {
        Self {
            weight: vec![1.0; d_model],
            bias: vec![0.0; d_model],
            eps: 1e-5,
        }
    }

    pub fn forward(&self, input: &[f32]) -> Vec<f32> {
        let n = input.len() as f32;
        let mean: f32 = input.iter().sum::<f32>() / n;
        let var: f32 = input.iter().map(|x| (x - mean).powi(2)).sum::<f32>() / n;
        let std_inv = 1.0 / (var + self.eps).sqrt();

        input
            .iter()
            .enumerate()
            .map(|(i, &x)| self.weight[i] * (x - mean) * std_inv + self.bias[i])
            .collect()
    }
}

#[derive(Debug, Clone)]
pub struct MultiHeadAttention {
    pub q_proj: Linear,
    pub k_proj: Linear,
    pub v_proj: Linear,
    pub o_proj: Linear,
    pub n_heads: usize,
    pub d_model: usize,
    pub head_dim: usize,
}

impl MultiHeadAttention {
    pub fn new(d_model: usize, n_heads: usize) -> Self {
        let head_dim = d_model / n_heads;
        Self {
            q_proj: Linear::new(d_model, d_model),
            k_proj: Linear::new(d_model, d_model),
            v_proj: Linear::new(d_model, d_model),
            o_proj: Linear::new(d_model, d_model),
            n_heads,
            d_model,
            head_dim,
        }
    }

    pub fn forward(&self, input: &[f32]) -> Vec<f32> {
        // Simplified: just Q/K/V projections + output projection
        // Full attention requires KV cache and cross-position access
        let q = self.q_proj.forward(input);
        let k = self.k_proj.forward(input);
        let v = self.v_proj.forward(input);

        // Element-wise attention (simplified for single-position processing)
        let mut output = vec![0.0; self.d_model];
        let scale = (self.head_dim as f32).sqrt();

        for h in 0..self.n_heads {
            let start = h * self.head_dim;
            let end = start + self.head_dim;
            for j in start..end {
                // Simple gated combination
                let gate = (q[j] * k[j] / scale).tanh();
                output[j] = gate * v[j];
            }
        }

        self.o_proj.forward(&output)
    }
}

#[derive(Debug, Clone)]
pub struct FeedForward {
    pub up: Linear,
    pub down: Linear,
}

impl FeedForward {
    pub fn new(d_model: usize, d_ff: usize) -> Self {
        Self {
            up: Linear::new(d_model, d_ff),
            down: Linear::new(d_ff, d_model),
        }
    }

    pub fn forward(&self, input: &[f32]) -> Vec<f32> {
        let hidden = self.up.forward(input);
        // GELU activation
        let activated: Vec<f32> = hidden
            .iter()
            .map(|&x| 0.5 * x * (1.0 + ((2.0f32.sqrt() * (x + 0.044715 * x.powi(3))).tanh())))
            .collect();
        self.down.forward(&activated)
    }
}

#[derive(Debug, Clone)]
pub struct TransformerBlock {
    pub ln1: LayerNorm,
    pub attn: MultiHeadAttention,
    pub ln2: LayerNorm,
    pub ffn: FeedForward,
}

impl TransformerBlock {
    pub fn new(d_model: usize, n_heads: usize, d_ff: usize) -> Self {
        Self {
            ln1: LayerNorm::new(d_model),
            attn: MultiHeadAttention::new(d_model, n_heads),
            ln2: LayerNorm::new(d_model),
            ffn: FeedForward::new(d_model, d_ff),
        }
    }

    pub fn forward(&self, input: &[f32], seq_len: usize) -> Vec<f32> {
        let d_model = input.len() / seq_len;
        let mut output = vec![0.0; input.len()];

        for pos in 0..seq_len {
            let start = pos * d_model;
            let end = start + d_model;
            let slice = &input[start..end];

            // Pre-norm transformer block
            let normed = self.ln1.forward(slice);
            let attn_out = self.attn.forward(&normed);
            let residual1: Vec<f32> = slice.iter().zip(attn_out.iter()).map(|(a, b)| a + b).collect();

            let normed2 = self.ln2.forward(&residual1);
            let ffn_out = self.ffn.forward(&normed2);
            let residual2: Vec<f32> = residual1.iter().zip(ffn_out.iter()).map(|(a, b)| a + b).collect();

            output[start..end].copy_from_slice(&residual2);
        }

        output
    }
}

#[derive(Debug, Clone)]
pub struct Model {
    pub config: ModelConfig,
    pub token_emb: Vec<f32>,
    pub pos_emb: Vec<f32>,
    pub blocks: Vec<TransformerBlock>,
    pub ln_final: LayerNorm,
    pub lm_head: Linear,
}

impl Model {
    pub fn new(config: ModelConfig) -> Self {
        let mut rng_state: u32 = 42;
        let mut rand = || -> f32 {
            rng_state = rng_state.wrapping_mul(1664525).wrapping_add(1013904223);
            (rng_state as f32 / u32::MAX as f32) * 2.0 - 1.0
        };

        let scale = (config.d_model as f32).sqrt();
        let d_model = config.d_model;
        let n_heads = config.n_heads;
        let d_ff = config.d_ff;
        let n_layers = config.n_layers;
        let vocab_size = config.vocab_size;
        let max_seq_len = config.max_seq_len;

        let token_emb: Vec<f32> = (0..vocab_size * d_model)
            .map(|_| rand() / scale)
            .collect();

        let pos_emb: Vec<f32> = (0..max_seq_len * d_model)
            .map(|_| rand() / scale)
            .collect();

        let blocks: Vec<TransformerBlock> = (0..n_layers)
            .map(|_| TransformerBlock::new(d_model, n_heads, d_ff))
            .collect();

        let lm_head = Linear::new(d_model, vocab_size);

        Self {
            config,
            token_emb,
            pos_emb,
            blocks,
            ln_final: LayerNorm::new(d_model),
            lm_head,
        }
    }

    pub fn forward(&self, token_ids: &[usize]) -> Vec<f32> {
        let seq_len = token_ids.len();
        let d = self.config.d_model;

        // Embedding lookup
        let mut hidden = vec![0.0; seq_len * d];
        for (pos, &token_id) in token_ids.iter().enumerate() {
            if token_id < self.config.vocab_size {
                for j in 0..d {
                    hidden[pos * d + j] = self.token_emb[token_id * d + j] + self.pos_emb[pos * d + j];
                }
            }
        }

        // Transformer blocks
        let mut x = hidden;
        for block in &self.blocks {
            x = block.forward(&x, seq_len);
        }

        // Final layer norm
        for pos in 0..seq_len {
            let slice = x[pos * d..(pos + 1) * d].to_vec();
            let normed = self.ln_final.forward(&slice);
            x[pos * d..(pos + 1) * d].copy_from_slice(&normed);
        }

        // LM head
        let mut logits = vec![0.0; seq_len * self.config.vocab_size];
        for pos in 0..seq_len {
            let input = x[pos * d..(pos + 1) * d].to_vec();
            let output = self.lm_head.forward(&input);
            logits[pos * self.config.vocab_size..(pos + 1) * self.config.vocab_size].copy_from_slice(&output);
        }

        logits
    }

    pub fn logits_to_probs(&self, logits: &[f32], temperature: f32, top_k: usize) -> Vec<(usize, f32)> {
        let mut probs: Vec<(usize, f32)> = logits
            .iter()
            .enumerate()
            .map(|(i, &logit)| (i, logit / temperature))
            .collect();

        // Softmax
        let max_logit = probs.iter().map(|(_, l)| l).cloned().fold(f32::NEG_INFINITY, f32::max);
        let exp_sum: f32 = probs.iter().map(|(_, l)| (l - max_logit).exp()).sum();
        for (_, p) in &mut probs {
            *p = (*p - max_logit).exp() / exp_sum;
        }

        // Sort by probability
        probs.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        // Top-k
        probs.truncate(top_k);
        probs
    }

    pub fn sample(&self, logits: &[f32], temperature: f32, top_k: usize) -> usize {
        let probs = self.logits_to_probs(logits, temperature, top_k);

        // Weighted random sampling
        let total: f32 = probs.iter().map(|(_, p)| p).sum();
        let mut rng_state: u32 = 12345;
        let mut rand = || -> f32 {
            rng_state = rng_state.wrapping_mul(1664525).wrapping_add(1013904223);
            rng_state as f32 / u32::MAX as f32
        };

        let r = rand() * total;
        let mut cumulative = 0.0;
        for (token_id, prob) in &probs {
            cumulative += prob;
            if cumulative >= r {
                return *token_id;
            }
        }

        probs[0].0
    }

    pub fn generate(&self, token_ids: &[usize], max_new_tokens: usize, temperature: f32, top_k: usize) -> Vec<usize> {
        let mut tokens = token_ids.to_vec();
        for _ in 0..max_new_tokens {
            let logits = self.forward(&tokens);
            let last_logits = logits[(tokens.len() - 1) * self.config.vocab_size..tokens.len() * self.config.vocab_size].to_vec();
            let next_token = self.sample(&last_logits, temperature, top_k);
            tokens.push(next_token);
        }
        tokens
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_config_small() {
        let config = ModelConfig::small();
        assert_eq!(config.n_layers, 6);
        assert_eq!(config.d_model, 384);
        assert!(config.param_count() > 0);
    }

    #[test]
    fn test_model_config_tiny() {
        let config = ModelConfig::tiny();
        assert_eq!(config.n_layers, 4);
        assert_eq!(config.d_model, 256);
    }

    #[test]
    fn test_linear_forward() {
        let linear = Linear::new(3, 2);
        let input = vec![1.0, 2.0, 3.0];
        let output = linear.forward(&input);
        assert_eq!(output.len(), 2);
    }

    #[test]
    fn test_layer_norm() {
        let ln = LayerNorm::new(4);
        let input = vec![1.0, 2.0, 3.0, 4.0];
        let output = ln.forward(&input);
        assert_eq!(output.len(), 4);
        // Output should be normalized (mean ~0, std ~1)
        let mean: f32 = output.iter().sum::<f32>() / 4.0;
        assert!(mean.abs() < 0.01);
    }

    #[test]
    fn test_attention() {
        let attn = MultiHeadAttention::new(64, 4);
        let input = vec![0.1; 64];
        let output = attn.forward(&input);
        assert_eq!(output.len(), 64);
    }

    #[test]
    fn test_feedforward() {
        let ffn = FeedForward::new(64, 256);
        let input = vec![0.1; 64];
        let output = ffn.forward(&input);
        assert_eq!(output.len(), 64);
    }

    #[test]
    fn test_transformer_block() {
        let block = TransformerBlock::new(64, 4, 256);
        let input = vec![0.1; 64];
        let output = block.forward(&input, 1);
        assert_eq!(output.len(), 64);
    }

    #[test]
    fn test_model_forward() {
        let config = ModelConfig::tiny();
        let vocab_size = config.vocab_size;
        let model = Model::new(config);
        let token_ids = vec![1, 2, 3, 4, 5];
        let logits = model.forward(&token_ids);
        assert_eq!(logits.len(), 5 * vocab_size);
    }

    #[test]
    fn test_logits_to_probs() {
        let config = ModelConfig::tiny();
        let vocab_size = config.vocab_size;
        let model = Model::new(config);
        let logits = vec![1.0; vocab_size];
        let probs = model.logits_to_probs(&logits, 1.0, 10);
        assert_eq!(probs.len(), 10);
        // Top-k probabilities should sum to <= 1.0 (not all tokens included)
        let sum: f32 = probs.iter().map(|(_, p)| p).sum();
        assert!(sum <= 1.0);
        assert!(sum > 0.0);
    }

    #[test]
    fn test_sample() {
        let config = ModelConfig::tiny();
        let vocab_size = config.vocab_size;
        let model = Model::new(config);
        let logits = vec![1.0; vocab_size];
        let token = model.sample(&logits, 1.0, 10);
        assert!(token < vocab_size);
    }

    #[test]
    fn test_generate() {
        let config = ModelConfig::tiny();
        let model = Model::new(config);
        let tokens = model.generate(&[1, 2, 3], 5, 1.0, 10);
        assert_eq!(tokens.len(), 8); // 3 input + 5 new
    }

    #[test]
    fn test_param_count() {
        let config = ModelConfig::tiny();
        let params = config.param_count();
        assert!(params > 0);
        assert!(params < 100_000_000); // Tiny model should be < 100M params
    }
}
