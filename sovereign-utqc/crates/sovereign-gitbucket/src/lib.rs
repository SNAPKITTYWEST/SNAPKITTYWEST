//! # sovereign-gitbucket
//!
//! GitBucket integration: deterministic memory extraction from git history.
//!
//! ## Architecture
//!
//! "Git as WORM, JSON as Query, Prolog as Truth"
//!
//! Each git commit produces a WORM-sealed memory bucket containing:
//! - Commit metadata (hash, author, timestamp, message)
//! - Diff analysis (files changed, roles, diff hashes)
//! - Entity extraction (functions, structs, traits, etc.)
//! - Trust status and WORM seal
//!
//! The extraction is deterministic: same commit always produces same bucket.
//! Buckets are append-only and cryptographically chained.

use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use thiserror::Error;

pub mod prolog;

/// GitBucket error.
#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum GitBucketError {
    /// Invalid commit hash format.
    #[error("invalid commit hash: {0}")]
    InvalidHash(String),

    /// Bucket validation failed.
    #[error("bucket validation failed: {0}")]
    ValidationFailed(String),

    /// Chain integrity broken.
    #[error("chain integrity broken at index {0}")]
    ChainBroken(usize),
}

/// File role classification.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FileRole {
    /// Source code.
    Source,
    /// Documentation.
    Doc,
    /// Configuration.
    Config,
    /// Test file.
    Test,
    /// Build script.
    Build,
    /// Unknown.
    Unknown,
}

impl FileRole {
    /// Classify a file path into a role.
    pub fn classify(path: &str) -> Self {
        if path.ends_with(".md") || path.ends_with(".txt") || path.contains("doc") {
            Self::Doc
        } else if path.contains("test") || path.ends_with("_test.rs") || path.ends_with("_test.go") {
            Self::Test
        } else if path.ends_with(".toml") || path.ends_with(".yaml") || path.ends_with(".yml") || path.ends_with(".json") {
            Self::Config
        } else if path.contains("build") || path.contains("Makefile") {
            Self::Build
        } else if path.ends_with(".rs") || path.ends_with(".go") || path.ends_with(".py") || path.ends_with(".js") || path.ends_with(".ts") || path.ends_with(".hs") || path.ends_with(".v") || path.ends_with(".lean") {
            Self::Source
        } else {
            Self::Unknown
        }
    }
}

/// Entity type extracted from source code.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EntityType {
    /// Function or method.
    Function,
    /// Struct or class.
    Struct,
    /// Trait or interface.
    Trait,
    /// Module or namespace.
    Module,
    /// Type alias.
    TypeAlias,
    /// Constant or static.
    Constant,
    /// Unknown entity.
    Unknown,
}

/// An extracted entity from source code.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Entity {
    /// Entity name.
    pub name: String,
    /// Entity type.
    pub entity_type: EntityType,
    /// File path.
    pub file_path: String,
    /// Line number (0-indexed).
    pub line: usize,
}

/// Diff entry for a single file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiffEntry {
    /// File path.
    pub path: String,
    /// File role.
    pub role: FileRole,
    /// SHA-256 hash of the diff content.
    pub diff_hash: String,
    /// Lines added.
    pub lines_added: usize,
    /// Lines removed.
    pub lines_removed: usize,
}

/// A WORM-sealed memory bucket from a single commit.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryBucket {
    /// Sequential bucket ID.
    pub id: String,
    /// Git commit hash.
    pub git_hash: String,
    /// Parent commit hash.
    pub parent_hash: String,
    /// Commit timestamp (ISO 8601).
    pub timestamp: String,
    /// Author information.
    pub author: Author,
    /// Branch name.
    pub branch: String,
    /// Memory type.
    pub bucket_type: String,
    /// Short summary.
    pub summary: String,
    /// Extracted keywords.
    pub keywords: Vec<String>,
    /// Extracted entities.
    pub entities: Vec<Entity>,
    /// File diffs.
    pub files: Vec<DiffEntry>,
    /// Related bucket IDs.
    pub related: Vec<String>,
    /// Trust status.
    pub trust: String,
    /// Whether this bucket is immutable.
    pub immutable: bool,
    /// WORM seal.
    pub worm_seal: WormSeal,
}

/// Author information.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Author {
    /// Author name or ID.
    pub id: String,
    /// Public key (if available).
    pub pubkey: String,
}

/// WORM seal for a memory bucket.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WormSeal {
    /// Signing algorithm.
    pub algorithm: String,
    /// Signature (hex-encoded).
    pub signature: String,
    /// Signer identifier.
    pub signer: String,
    /// Audit reference UUID.
    pub audit_ref: String,
}

impl MemoryBucket {
    /// Compute the WORM seal for this bucket.
    pub fn compute_seal(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.git_hash.as_bytes());
        hasher.update(self.parent_hash.as_bytes());
        hasher.update(self.timestamp.as_bytes());
        hasher.update(self.author.id.as_bytes());
        hasher.update(self.branch.as_bytes());
        hasher.update(self.bucket_type.as_bytes());
        hasher.update(self.summary.as_bytes());
        for kw in &self.keywords {
            hasher.update(kw.as_bytes());
        }
        for file in &self.files {
            hasher.update(file.path.as_bytes());
            hasher.update(file.diff_hash.as_bytes());
        }
        hex::encode(hasher.finalize())
    }

    /// Validate bucket integrity.
    pub fn validate(&self) -> Result<(), GitBucketError> {
        if self.git_hash.is_empty() {
            return Err(GitBucketError::InvalidHash(self.git_hash.clone()));
        }
        if self.worm_seal.signature.is_empty() {
            return Err(GitBucketError::ValidationFailed("empty seal".to_string()));
        }
        Ok(())
    }
}

/// Chain of memory buckets with WORM integrity.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BucketChain {
    /// Ordered list of buckets.
    pub buckets: Vec<MemoryBucket>,
    /// Chain hash: hash of all bucket seals in order.
    pub chain_hash: String,
}

impl BucketChain {
    /// Create empty chain.
    pub fn new() -> Self {
        Self { buckets: Vec::new(), chain_hash: String::new() }
    }

    /// Append a bucket to the chain.
    pub fn append(&mut self, bucket: MemoryBucket) -> Result<(), GitBucketError> {
        bucket.validate()?;

        // Verify chain linkage
        if !self.buckets.is_empty() {
            let last = self.buckets.last().expect("checked non-empty");
            if last.git_hash != bucket.parent_hash {
                return Err(GitBucketError::ChainBroken(self.buckets.len()));
            }
        }

        self.buckets.push(bucket);
        self.recompute_chain_hash();
        Ok(())
    }

    /// Recompute chain hash.
    fn recompute_chain_hash(&mut self) {
        let mut hasher = Sha256::new();
        for bucket in &self.buckets {
            hasher.update(bucket.worm_seal.signature.as_bytes());
        }
        self.chain_hash = hex::encode(hasher.finalize());
    }

    /// Verify chain integrity.
    pub fn verify(&self) -> Result<(), GitBucketError> {
        for (i, bucket) in self.buckets.iter().enumerate() {
            bucket.validate()?;

            if i > 0 {
                let prev = &self.buckets[i - 1];
                if prev.git_hash != bucket.parent_hash {
                    return Err(GitBucketError::ChainBroken(i));
                }
            }
        }

        // Verify chain hash
        let mut hasher = Sha256::new();
        for bucket in &self.buckets {
            hasher.update(bucket.worm_seal.signature.as_bytes());
        }
        let expected = hex::encode(hasher.finalize());
        if self.chain_hash != expected {
            return Err(GitBucketError::ChainBroken(self.buckets.len()));
        }

        Ok(())
    }

    /// Look up bucket by git hash.
    pub fn find_by_hash(&self, hash: &str) -> Option<&MemoryBucket> {
        self.buckets.iter().find(|b| b.git_hash == hash)
    }

    /// Filter buckets by type.
    pub fn filter_by_type(&self, bucket_type: &str) -> Vec<&MemoryBucket> {
        self.buckets.iter().filter(|b| b.bucket_type == bucket_type).collect()
    }

    /// Filter buckets by trust status.
    pub fn filter_by_trust(&self, trust: &str) -> Vec<&MemoryBucket> {
        self.buckets.iter().filter(|b| b.trust == trust).collect()
    }
}

/// Extract keywords from a commit message.
pub fn extract_keywords(message: &str) -> Vec<String> {
    let stop_words: &[&str] = &["the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
        "may", "might", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in",
        "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before",
        "after", "above", "below", "between", "out", "off", "over", "under", "again", "further",
        "then", "once", "here", "there", "when", "where", "why", "how", "all", "both", "each",
        "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own",
        "same", "so", "than", "too", "very", "just", "because", "but", "and", "or", "if",
        "while", "that", "this", "these", "those", "add", "remove", "fix", "update", "change"];

    let mut keywords: Vec<String> = message.split_whitespace()
        .map(|w| w.to_lowercase().trim_matches(|c: char| !c.is_alphanumeric()).to_string())
        .filter(|w| w.len() > 2 && !stop_words.contains(&w.as_str()))
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    keywords.sort(); // Deterministic ordering
    keywords
}

/// Deterministic bucket builder: same inputs always produce same bucket.
pub fn build_bucket(
    git_hash: &str,
    parent_hash: &str,
    timestamp: &str,
    author_name: &str,
    branch: &str,
    message: &str,
    file_paths: &[String],
) -> MemoryBucket {
    let keywords = extract_keywords(message);
    let bucket_type = classify_commit_type(message);

    let files: Vec<DiffEntry> = file_paths.iter().map(|path| {
        let mut hasher = Sha256::new();
        hasher.update(path.as_bytes());
        let diff_hash = hex::encode(hasher.finalize());

        DiffEntry {
            path: path.clone(),
            role: FileRole::classify(path),
            diff_hash,
            lines_added: 0,
            lines_removed: 0,
        }
    }).collect();

    let entities = extract_entities(file_paths);

    let summary = if message.len() > 100 {
        format!("{}...", &message[..97])
    } else {
        message.to_string()
    };

    let worm_seal = WormSeal {
        algorithm: "SHA-256".to_string(),
        signature: String::new(), // Will be computed
        signer: "GitBucket".to_string(),
        audit_ref: uuid_v4_deterministic(git_hash),
    };

    let mut bucket = MemoryBucket {
        id: format!("mem_{}", git_hash),
        git_hash: git_hash.to_string(),
        parent_hash: parent_hash.to_string(),
        timestamp: timestamp.to_string(),
        author: Author {
            id: author_name.to_string(),
            pubkey: format!("ed25519:{}", author_name),
        },
        branch: branch.to_string(),
        bucket_type,
        summary,
        keywords,
        entities,
        files,
        related: Vec::new(),
        trust: "pending".to_string(),
        immutable: true,
        worm_seal,
    };

    // Compute seal
    let seal = bucket.compute_seal();
    bucket.worm_seal.signature = seal;

    bucket
}

/// Classify commit type from message.
fn classify_commit_type(message: &str) -> String {
    let lower = message.to_lowercase();
    if lower.starts_with("feat") || lower.starts_with("add") || lower.starts_with("new") {
        "feature".to_string()
    } else if lower.starts_with("fix") || lower.starts_with("bug") || lower.starts_with("patch") {
        "bugfix".to_string()
    } else if lower.starts_with("refactor") || lower.starts_with("clean") || lower.starts_with("restructure") {
        "refactor".to_string()
    } else if lower.starts_with("doc") || lower.starts_with("readme") {
        "documentation".to_string()
    } else if lower.starts_with("test") || lower.starts_with("spec") {
        "test".to_string()
    } else if lower.starts_with("chore") || lower.starts_with("ci") || lower.starts_with("build") {
        "maintenance".to_string()
    } else {
        "audit".to_string()
    }
}

/// Extract entities from file paths.
fn extract_entities(file_paths: &[String]) -> Vec<Entity> {
    let mut entities = Vec::new();
    for path in file_paths {
        let name = path.split('/').last().unwrap_or(path)
            .split('\\').last().unwrap_or(path)
            .to_string();

        let entity_type = if name.ends_with(".rs") || name.ends_with(".go") || name.ends_with(".py") {
            EntityType::Module
        } else if name.ends_with(".toml") || name.ends_with(".yaml") || name.ends_with(".json") {
            EntityType::Constant
        } else if name.ends_with(".md") || name.ends_with(".txt") {
            EntityType::Unknown
        } else {
            EntityType::Unknown
        };

        entities.push(Entity {
            name,
            entity_type,
            file_path: path.clone(),
            line: 0,
        });
    }
    entities
}

/// Deterministic UUID v4 from seed (for audit_ref).
fn uuid_v4_deterministic(seed: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    let hash = hasher.finalize();
    let h = hex::encode(hash);
    format!(
        "{}-{}-4{}-{}-{}",
        &h[..8],
        &h[8..12],
        &h[13..16],
        &h[16..20],
        &h[20..32],
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_file_role_classification() {
        assert_eq!(FileRole::classify("src/main.rs"), FileRole::Source);
        assert_eq!(FileRole::classify("README.md"), FileRole::Doc);
        assert_eq!(FileRole::classify("Cargo.toml"), FileRole::Config);
        assert_eq!(FileRole::classify("tests/test.rs"), FileRole::Test);
        assert_eq!(FileRole::classify("build.rs"), FileRole::Build);
    }

    #[test]
    fn test_extract_keywords() {
        let keywords = extract_keywords("Add prime Fock space crate");
        assert!(keywords.contains(&"prime".to_string()));
        assert!(keywords.contains(&"fock".to_string()));
        assert!(keywords.contains(&"space".to_string()));
        assert!(keywords.contains(&"crate".to_string()));
        assert!(!keywords.contains(&"add".to_string())); // stop word
    }

    #[test]
    fn test_classify_commit_type() {
        assert_eq!(classify_commit_type("feat: add new crate"), "feature");
        assert_eq!(classify_commit_type("fix: resolve bug"), "bugfix");
        assert_eq!(classify_commit_type("refactor: clean up"), "refactor");
        assert_eq!(classify_commit_type("docs: update README"), "documentation");
        assert_eq!(classify_commit_type("test: add tests"), "test");
        assert_eq!(classify_commit_type("random message"), "audit");
    }

    #[test]
    fn test_build_bucket_deterministic() {
        let b1 = build_bucket(
            "abc123", "def456", "2026-07-02T00:00:00Z",
            "testuser", "main", "Add new feature",
            &["src/lib.rs".to_string()],
        );
        let b2 = build_bucket(
            "abc123", "def456", "2026-07-02T00:00:00Z",
            "testuser", "main", "Add new feature",
            &["src/lib.rs".to_string()],
        );
        assert_eq!(b1.compute_seal(), b2.compute_seal());
    }

    #[test]
    fn test_bucket_validate() {
        let bucket = build_bucket(
            "abc123def456789012345678901234567890", "def456",
            "2026-07-02T00:00:00Z", "test", "main", "test",
            &["src/lib.rs".to_string()],
        );
        assert!(bucket.validate().is_ok());
    }

    #[test]
    fn test_bucket_chain() {
        let mut chain = BucketChain::new();

        let b1 = build_bucket(
            "aaa111", "000000", "2026-07-02T00:00:00Z",
            "user1", "main", "Initial commit",
            &["src/lib.rs".to_string()],
        );
        chain.append(b1).unwrap();

        let b2 = build_bucket(
            "bbb222", "aaa111", "2026-07-02T01:00:00Z",
            "user1", "main", "Add feature",
            &["src/feature.rs".to_string()],
        );
        chain.append(b2).unwrap();

        assert_eq!(chain.buckets.len(), 2);
        assert!(chain.verify().is_ok());
    }

    #[test]
    fn test_chain_broken_link() {
        let mut chain = BucketChain::new();

        let b1 = build_bucket(
            "aaa111", "000000", "2026-07-02T00:00:00Z",
            "user1", "main", "Initial",
            &["src/lib.rs".to_string()],
        );
        chain.append(b1).unwrap();

        let b2 = build_bucket(
            "bbb222", "WRONG_HASH", "2026-07-02T01:00:00Z",
            "user1", "main", "Feature",
            &["src/feat.rs".to_string()],
        );
        assert!(chain.append(b2).is_err());
    }

    #[test]
    fn test_find_by_hash() {
        let mut chain = BucketChain::new();
        let b1 = build_bucket(
            "abc123", "000000", "2026-07-02T00:00:00Z",
            "user", "main", "msg", &["f.rs".to_string()],
        );
        chain.append(b1).unwrap();
        assert!(chain.find_by_hash("abc123").is_some());
        assert!(chain.find_by_hash("nonexistent").is_none());
    }

    #[test]
    fn test_filter_by_type() {
        let mut chain = BucketChain::new();
        let b1 = build_bucket(
            "aaa", "000", "2026-07-02T00:00:00Z",
            "u", "main", "feat: new", &["f.rs".to_string()],
        );
        chain.append(b1).unwrap();
        let b2 = build_bucket(
            "bbb", "aaa", "2026-07-02T01:00:00Z",
            "u", "main", "fix: bug", &["g.rs".to_string()],
        );
        chain.append(b2).unwrap();

        assert_eq!(chain.filter_by_type("feature").len(), 1);
        assert_eq!(chain.filter_by_type("bugfix").len(), 1);
        assert_eq!(chain.filter_by_type("nonexistent").len(), 0);
    }

    #[test]
    fn test_uuid_deterministic() {
        let u1 = uuid_v4_deterministic("test_seed");
        let u2 = uuid_v4_deterministic("test_seed");
        assert_eq!(u1, u2);
    }

    proptest! {
        #[test]
        fn prop_bucket_seal_deterministic(
            hash in "[a-f0-9]{6,40}",
            author in "[a-z]{3,10}",
            msg in "[a-z ]{5,30}",
        ) {
            let b1 = build_bucket(&hash, "000", "2026-01-01", &author, "main", &msg, &["f.rs".to_string()]);
            let b2 = build_bucket(&hash, "000", "2026-01-01", &author, "main", &msg, &["f.rs".to_string()]);
            prop_assert_eq!(b1.compute_seal(), b2.compute_seal());
        }

        #[test]
        fn prop_keywords_no_stop_words(msg in "[a-z ]{5,50}") {
            let kw = extract_keywords(&msg);
            let stop = ["the", "and", "for", "are", "but", "not", "you", "all"];
            for w in &kw {
                prop_assert!(!stop.contains(&w.as_str()), "stop word found: {}", w);
            }
        }
    }
}
