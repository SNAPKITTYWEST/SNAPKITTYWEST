use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tokenizer {
    vocab: HashMap<String, usize>,
    merges: Vec<(String, String)>,
    pub pad_token: usize,
    pub eos_token: usize,
    pub bos_token: usize,
    pub vocab_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenizerConfig {
    pub vocab_size: usize,
    pub pad_token: usize,
    pub eos_token: usize,
    pub bos_token: usize,
}

impl Default for TokenizerConfig {
    fn default() -> Self {
        Self {
            vocab_size: 50257,
            pad_token: 0,
            eos_token: 1,
            bos_token: 2,
        }
    }
}

impl Tokenizer {
    pub fn new(config: TokenizerConfig) -> Self {
        let mut vocab = HashMap::new();
        // Base byte tokens
        for i in 0..256 {
            vocab.insert((i as u8 as char).to_string(), i);
        }
        // Special tokens
        vocab.insert("<PAD>".to_string(), config.pad_token);
        vocab.insert("<EOS>".to_string(), config.eos_token);
        vocab.insert("<BOS>".to_string(), config.bos_token);

        Self {
            vocab,
            merges: Vec::new(),
            pad_token: config.pad_token,
            eos_token: config.eos_token,
            bos_token: config.bos_token,
            vocab_size: config.vocab_size,
        }
    }

    pub fn train(text: &str, vocab_size: usize) -> Self {
        let mut tokenizer = Self::new(TokenizerConfig {
            vocab_size,
            ..Default::default()
        });

        // Initial vocabulary: all single bytes
        let mut freq: HashMap<(String, String), usize> = HashMap::new();

        // Split into words, then into character pairs
        for word in text.split_whitespace() {
            let chars: Vec<String> = word.chars().map(|c| c.to_string()).collect();
            for i in 0..chars.len().saturating_sub(1) {
                *freq.entry((chars[i].clone(), chars[i + 1].clone())).or_insert(0) += 1;
            }
        }

        // Greedy BPE merges
        let target_merges = vocab_size.saturating_sub(259); // 256 bytes + 3 specials
        for _ in 0..target_merges {
            if freq.is_empty() {
                break;
            }

            // Find most frequent pair
            let best = freq
                .iter()
                .max_by_key(|(_, &count)| count)
                .map(|(pair, _)| pair.clone());

            if let Some((a, b)) = best {
                let merged = format!("{}{}", a, b);
                let token_id = tokenizer.vocab.len();
                tokenizer.vocab.insert(merged.clone(), token_id);
                tokenizer.merges.push((a.clone(), b.clone()));

                // Update frequencies
                let mut new_freq: HashMap<(String, String), usize> = HashMap::new();
                for ((ka, kb), count) in freq.drain() {
                    if ka == a && kb == b {
                        // This pair was merged, skip
                    } else if kb == a {
                        new_freq.insert((ka, merged.clone()), count);
                    } else if ka == b {
                        new_freq.insert((merged.clone(), kb), count);
                    } else {
                        new_freq.insert((ka, kb), count);
                    }
                }
                freq = new_freq;
            }
        }

        tokenizer.vocab_size = tokenizer.vocab.len();
        tokenizer
    }

    pub fn encode(&self, text: &str) -> Vec<usize> {
        let mut tokens = vec![self.bos_token];

        // Encode character by character, preserving spaces
        let chars: Vec<String> = text.chars().map(|c| c.to_string()).collect();
        let mut i = 0;
        while i < chars.len() {
            let mut merged = false;
            // Try merges from longest to shortest
            for (a, b) in &self.merges {
                if i + 1 < chars.len() && chars[i] == *a && chars[i + 1] == *b {
                    let merged_str = format!("{}{}", a, b);
                    tokens.push(*self.vocab.get(&merged_str).unwrap_or(&0));
                    i += 2;
                    merged = true;
                    break;
                }
            }
            if !merged {
                if let Some(&id) = self.vocab.get(&chars[i]) {
                    tokens.push(id);
                } else {
                    for byte in chars[i].bytes() {
                        tokens.push(byte as usize);
                    }
                }
                i += 1;
            }
        }

        tokens.push(self.eos_token);
        tokens
    }

    pub fn decode(&self, tokens: &[usize]) -> String {
        let reverse: HashMap<usize, String> = self.vocab.iter().map(|(k, &v)| (v, k.clone())).collect();

        let mut result = String::new();
        for &token_id in tokens {
            if token_id == self.pad_token || token_id == self.bos_token || token_id == self.eos_token {
                continue;
            }
            if let Some(text) = reverse.get(&token_id) {
                result.push_str(text);
            }
        }
        result
    }

    pub fn vocab_size(&self) -> usize {
        self.vocab.len()
    }

    pub fn save(&self, path: &str) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(path, json)
    }

    pub fn load(path: &str) -> std::io::Result<Self> {
        let json = std::fs::read_to_string(path)?;
        serde_json::from_str(&json).map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_decode_roundtrip() {
        let tok = Tokenizer::new(TokenizerConfig::default());
        let text = "hello world";
        let tokens = tok.encode(text);
        let decoded = tok.decode(&tokens);
        assert_eq!(decoded, text);
    }

    #[test]
    fn test_special_tokens() {
        let tok = Tokenizer::new(TokenizerConfig::default());
        assert_eq!(tok.pad_token, 0);
        assert_eq!(tok.eos_token, 1);
        assert_eq!(tok.bos_token, 2);
    }

    #[test]
    fn test_encode_adds_bos_eos() {
        let tok = Tokenizer::new(TokenizerConfig::default());
        let tokens = tok.encode("test");
        assert_eq!(tokens[0], tok.bos_token);
        assert_eq!(tokens[tokens.len() - 1], tok.eos_token);
    }

    #[test]
    fn test_empty_string() {
        let tok = Tokenizer::new(TokenizerConfig::default());
        let tokens = tok.encode("");
        assert_eq!(tokens, vec![tok.bos_token, tok.eos_token]);
    }

    #[test]
    fn test_single_char() {
        let tok = Tokenizer::new(TokenizerConfig::default());
        let tokens = tok.encode("a");
        assert_eq!(tokens.len(), 3); // BOS + 'a' + EOS
    }

    #[test]
    fn test_vocab_size() {
        let tok = Tokenizer::new(TokenizerConfig::default());
        assert!(tok.vocab_size() >= 259); // At least 256 bytes + 3 specials
    }

    #[test]
    fn test_save_load_roundtrip() {
        let tok = Tokenizer::new(TokenizerConfig::default());
        let path = "test_tokenizer.json";
        tok.save(path).unwrap();
        let loaded = Tokenizer::load(path).unwrap();
        assert_eq!(loaded.vocab_size(), tok.vocab_size());
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn test_bpe_training() {
        let text = "the cat sat on the mat the cat ate the rat";
        let tok = Tokenizer::train(text, 300);
        assert!(tok.vocab_size() > 259);
        assert!(!tok.merges.is_empty());
    }

    #[test]
    fn test_decode_skips_special_tokens() {
        let tok = Tokenizer::new(TokenizerConfig::default());
        let tokens = vec![tok.bos_token, 104, 105, tok.eos_token];
        let decoded = tok.decode(&tokens);
        assert!(!decoded.is_empty());
    }

    #[test]
    fn test_multiple_words() {
        let tok = Tokenizer::new(TokenizerConfig::default());
        let tokens = tok.encode("hello world foo bar");
        assert!(tokens.len() > 4); // BOS + tokens + EOS
    }
}
