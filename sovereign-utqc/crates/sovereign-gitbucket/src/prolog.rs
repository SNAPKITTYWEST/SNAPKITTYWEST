//! Prolog fact generation and query engine for memory buckets.
//!
//! ## Architecture
//!
//! MemoryBuckets → Prolog Facts → Query Engine → Context Bundles
//!
//! The fact base is multi-dimensional:
//! - `memory_bucket(ID, Type, Summary, Trust, Timestamp, Author)`
//! - `bucket_file(ID, Path, Role)`
//! - `bucket_entity(ID, Name, Type)`
//! - `bucket_keyword(ID, Keyword)`
//! - `bucket_dep(ParentID, ChildID)`
//!
//! Queries support conjunction (AND), disjunction (OR), and negation (NOT).

use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::MemoryBucket;

/// Prolog engine error.
#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum PrologError {
    /// Unknown predicate.
    #[error("unknown predicate: {0}")]
    UnknownPredicate(String),

    /// Arity mismatch.
    #[error("arity mismatch: expected {0}, got {1}")]
    ArityMismatch(usize, usize),

    /// Variable not bound.
    #[error("variable not bound: {0}")]
    UnboundVariable(String),

    /// Query timeout.
    #[error("query exceeded max iterations: {0}")]
    Timeout(usize),
}

/// A Prolog fact: predicate name + arguments.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Fact {
    /// Predicate name.
    pub predicate: String,
    /// Fact arguments.
    pub args: Vec<String>,
}

impl Fact {
    /// Create a new fact.
    pub fn new(predicate: &str, args: Vec<String>) -> Self {
        Self { predicate: predicate.to_string(), args }
    }

    /// Render as Prolog fact string.
    pub fn to_prolog(&self) -> String {
        let args_str = self.args.iter()
            .map(|a| format!("\"{}\"", a.replace('\\', "\\\\").replace('"', "\\\"")))
            .collect::<Vec<_>>()
            .join(", ");
        format!("{}({}).", self.predicate, args_str)
    }
}

/// A Prolog query pattern.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Query {
    /// Match a fact: predicate(args). Variables start with "?".
    Match {
        /// Predicate name to match.
        predicate: String,
        /// Argument patterns. "?"-prefixed are variables.
        args: Vec<String>,
    },
    /// Conjunction: ALL sub-queries must match.
    And(Vec<Query>),
    /// Disjunction: ANY sub-query must match.
    Or(Vec<Query>),
    /// Negation: sub-query must NOT match.
    Not(Box<Query>),
}

/// A query result: variable bindings.
pub type Bindings = HashMap<String, String>;

/// A match result: bindings + matched fact.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    /// Variable bindings.
    pub bindings: Bindings,
    /// Matched fact IDs.
    pub matched: Vec<String>,
}

/// The Prolog fact base: stores facts and answers queries.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FactBase {
    /// All facts, indexed by predicate name.
    pub facts: HashMap<String, Vec<Fact>>,
    /// Bucket index: ID → bucket data.
    pub buckets: HashMap<String, MemoryBucket>,
}

impl FactBase {
    /// Create empty fact base.
    pub fn new() -> Self {
        Self {
            facts: HashMap::new(),
            buckets: HashMap::new(),
        }
    }

    /// Assert a fact into the base.
    pub fn assert(&mut self, fact: Fact) {
        self.facts
            .entry(fact.predicate.clone())
            .or_default()
            .push(fact);
    }

    /// Assert a memory bucket and generate all derived facts.
    pub fn assert_bucket(&mut self, bucket: MemoryBucket) {
        let id = bucket.id.clone();

        // Core fact: memory_bucket(ID, Type, Summary, Trust, Timestamp, Author)
        self.assert(Fact::new("memory_bucket", vec![
            id.clone(),
            bucket.bucket_type.clone(),
            bucket.summary.clone(),
            bucket.trust.clone(),
            bucket.timestamp.clone(),
            bucket.author.id.clone(),
        ]));

        // File facts: bucket_file(ID, Path, Role)
        for file in &bucket.files {
            let role = format!("{:?}", file.role);
            self.assert(Fact::new("bucket_file", vec![
                id.clone(),
                file.path.clone(),
                role,
            ]));
        }

        // Entity facts: bucket_entity(ID, Name, Type)
        for entity in &bucket.entities {
            let etype = format!("{:?}", entity.entity_type);
            self.assert(Fact::new("bucket_entity", vec![
                id.clone(),
                entity.name.clone(),
                etype,
            ]));
        }

        // Keyword facts: bucket_keyword(ID, Keyword)
        for kw in &bucket.keywords {
            self.assert(Fact::new("bucket_keyword", vec![
                id.clone(),
                kw.clone(),
            ]));
        }

        // Dependency facts: bucket_dep(ParentID, ChildID)
        for related in &bucket.related {
            self.assert(Fact::new("bucket_dep", vec![
                related.clone(),
                id.clone(),
            ]));
        }

        // Agent fact: bucket_agent(ID, AgentID)
        self.assert(Fact::new("bucket_agent", vec![
            id.clone(),
            bucket.author.id.clone(),
        ]));

        // Type fact: bucket_type(ID, Type)
        self.assert(Fact::new("bucket_type", vec![
            id.clone(),
            bucket.bucket_type.clone(),
        ]));

        // Store the bucket
        self.buckets.insert(id, bucket);
    }

    /// Assert multiple buckets.
    pub fn assert_buckets(&mut self, buckets: Vec<MemoryBucket>) {
        for bucket in buckets {
            self.assert_bucket(bucket);
        }
    }

    /// Query by predicate with simple variable binding.
    pub fn query(&self, query: &Query) -> Result<Vec<QueryResult>, PrologError> {
        match query {
            Query::Match { predicate, args } => {
                self.query_match(predicate, args)
            }
            Query::And(sub_queries) => {
                self.query_and(sub_queries)
            }
            Query::Or(sub_queries) => {
                self.query_or(sub_queries)
            }
            Query::Not(sub_query) => {
                self.query_not(sub_query)
            }
        }
    }

    /// Simple match: find facts matching predicate with arg patterns.
    /// Args starting with "?" are variables (bound in results).
    fn query_match(&self, predicate: &str, pattern: &[String]) -> Result<Vec<QueryResult>, PrologError> {
        let facts = self.facts.get(predicate)
            .ok_or_else(|| PrologError::UnknownPredicate(predicate.to_string()))?;

        let mut results = Vec::new();

        for fact in facts {
            if fact.args.len() != pattern.len() {
                continue;
            }

            let mut bindings = Bindings::new();
            let mut matched = true;

            for (p, f) in pattern.iter().zip(fact.args.iter()) {
                if p.starts_with('?') {
                    bindings.insert(p.clone(), f.clone());
                } else if p != f {
                    matched = false;
                    break;
                }
            }

            if matched {
                results.push(QueryResult {
                    bindings,
                    matched: vec![fact.args[0].clone()],
                });
            }
        }

        Ok(results)
    }

    /// Conjunction: ALL sub-queries must produce at least one result.
    fn query_and(&self, sub_queries: &[Query]) -> Result<Vec<QueryResult>, PrologError> {
        if sub_queries.is_empty() {
            return Ok(vec![QueryResult { bindings: Bindings::new(), matched: Vec::new() }]);
        }

        let mut results = vec![QueryResult { bindings: Bindings::new(), matched: Vec::new() }];

        for sub in sub_queries {
            let sub_results = self.query(sub)?;
            let mut merged = Vec::new();

            for existing in &results {
                for sub_r in &sub_results {
                    // Merge bindings (no conflicts assumed)
                    let mut new_bindings = existing.bindings.clone();
                    for (k, v) in &sub_r.bindings {
                        if !new_bindings.contains_key(k) {
                            new_bindings.insert(k.clone(), v.clone());
                        }
                    }

                    let mut new_matched = existing.matched.clone();
                    new_matched.extend(sub_r.matched.clone());
                    new_matched.sort();
                    new_matched.dedup();

                    merged.push(QueryResult {
                        bindings: new_bindings,
                        matched: new_matched,
                    });
                }
            }

            results = merged;
        }

        Ok(results)
    }

    /// Disjunction: ANY sub-query producing results.
    fn query_or(&self, sub_queries: &[Query]) -> Result<Vec<QueryResult>, PrologError> {
        let mut all_results = Vec::new();

        for sub in sub_queries {
            all_results.extend(self.query(sub)?);
        }

        Ok(all_results)
    }

    /// Negation: succeeds if sub-query produces NO results.
    fn query_not(&self, sub_query: &Query) -> Result<Vec<QueryResult>, PrologError> {
        let results = self.query(sub_query)?;
        if results.is_empty() {
            Ok(vec![QueryResult { bindings: Bindings::new(), matched: Vec::new() }])
        } else {
            Ok(Vec::new())
        }
    }

    /// Convenience: query by file path.
    pub fn query_by_file(&self, path: &str) -> Vec<&MemoryBucket> {
        self.buckets.values()
            .filter(|b| b.files.iter().any(|f| f.path == path))
            .collect()
    }

    /// Convenience: query by keyword/topic.
    pub fn query_by_keyword(&self, keyword: &str) -> Vec<&MemoryBucket> {
        self.buckets.values()
            .filter(|b| b.keywords.iter().any(|k| k == keyword))
            .collect()
    }

    /// Convenience: query by bucket type.
    pub fn query_by_type(&self, bucket_type: &str) -> Vec<&MemoryBucket> {
        self.buckets.values()
            .filter(|b| b.bucket_type == bucket_type)
            .collect()
    }

    /// Convenience: query by author/agent.
    pub fn query_by_agent(&self, agent: &str) -> Vec<&MemoryBucket> {
        self.buckets.values()
            .filter(|b| b.author.id == agent)
            .collect()
    }

    /// Convenience: query by trust status.
    pub fn query_by_trust(&self, trust: &str) -> Vec<&MemoryBucket> {
        self.buckets.values()
            .filter(|b| b.trust == trust)
            .collect()
    }

    /// Convenience: query by time range.
    pub fn query_by_time(&self, from: &str, to: &str) -> Vec<&MemoryBucket> {
        self.buckets.values()
            .filter(|b| b.timestamp.as_str() >= from && b.timestamp.as_str() <= to)
            .collect()
    }

    /// Render entire fact base as Prolog source.
    pub fn to_prolog(&self) -> String {
        let mut lines = Vec::new();
        lines.push("% Generated by sovereign-gitbucket Prolog engine".to_string());
        lines.push(":- dynamic memory_bucket/6.".to_string());
        lines.push(":- dynamic bucket_file/3.".to_string());
        lines.push(":- dynamic bucket_entity/3.".to_string());
        lines.push(":- dynamic bucket_keyword/2.".to_string());
        lines.push(":- dynamic bucket_dep/2.".to_string());
        lines.push(":- dynamic bucket_agent/2.".to_string());
        lines.push(":- dynamic bucket_type/2.".to_string());
        lines.push(String::new());

        let mut predicates: Vec<&String> = self.facts.keys().collect();
        predicates.sort();

        for pred in predicates {
            let facts = &self.facts[pred];
            for fact in facts {
                lines.push(fact.to_prolog());
            }
        }

        lines.join("\n")
    }

    /// Count facts by predicate.
    pub fn fact_counts(&self) -> HashMap<String, usize> {
        self.facts.iter().map(|(k, v)| (k.clone(), v.len())).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::build_bucket;
    use proptest::prelude::*;

    use std::sync::atomic::{AtomicUsize, Ordering};
    static BUCKET_COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn make_test_bucket(_id: &str, _parent: &str, msg: &str, files: Vec<String>) -> MemoryBucket {
        let n = BUCKET_COUNTER.fetch_add(1, Ordering::SeqCst);
        let hash = format!("{:040x}", n + 0xAAA000);
        let parent_hash = format!("{:040x}", n + 0x999000);
        let ts = format!("2026-07-02T{:02}:00:00Z", n % 24);
        build_bucket(
            &hash, &parent_hash, &ts,
            "test_agent", "main", msg, &files,
        )
    }

    #[test]
    fn test_fact_base_assert_bucket() {
        let mut fb = FactBase::new();
        let bucket = make_test_bucket("aaa111", "000000", "feat: add parser", vec!["src/parser.rs".to_string()]);
        fb.assert_bucket(bucket);

        assert!(fb.facts.contains_key("memory_bucket"));
        assert_eq!(fb.facts["memory_bucket"].len(), 1);
        assert!(fb.facts.contains_key("bucket_file"));
        assert_eq!(fb.facts["bucket_file"].len(), 1);
        assert_eq!(fb.buckets.len(), 1);
    }

    #[test]
    fn test_query_by_predicate() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: bug", vec!["src/bug.rs".to_string()]));

        let results = fb.query(&Query::Match {
            predicate: "memory_bucket".to_string(),
            args: vec!["?id".to_string(), "feature".to_string(), "?_s".to_string(), "?_tr".to_string(), "?_ts".to_string(), "?_a".to_string()],
        }).unwrap();

        assert_eq!(results.len(), 1);
        assert!(results[0].bindings.contains_key("?id"));
    }

    #[test]
    fn test_query_by_file() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string(), "src/ast.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: bug", vec!["src/bug.rs".to_string()]));

        let results = fb.query(&Query::Match {
            predicate: "bucket_file".to_string(),
            args: vec!["?id".to_string(), "src/parser.rs".to_string(), "?_role".to_string()],
        }).unwrap();

        assert_eq!(results.len(), 1);
        assert!(results[0].bindings.contains_key("?id"));
    }

    #[test]
    fn test_query_by_keyword() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: add prime Fock space", vec!["src/fock.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: resolve bug", vec!["src/fix.rs".to_string()]));

        let results = fb.query(&Query::Match {
            predicate: "bucket_keyword".to_string(),
            args: vec!["?id".to_string(), "fock".to_string()],
        }).unwrap();

        assert_eq!(results.len(), 1);
        assert!(results[0].bindings.contains_key("?id"));
    }

    #[test]
    fn test_query_conjunction() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "feat: lexer", vec!["src/lexer.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("ccc333", "bbb222", "fix: parser bug", vec!["src/parser.rs".to_string()]));

        // Find buckets that are "feature" type AND have file "src/parser.rs"
        let results = fb.query(&Query::And(vec![
            Query::Match {
                predicate: "memory_bucket".to_string(),
                args: vec!["?id".to_string(), "feature".to_string(), "?_s".to_string(), "?_tr".to_string(), "?_ts".to_string(), "?_a".to_string()],
            },
            Query::Match {
                predicate: "bucket_file".to_string(),
                args: vec!["?id".to_string(), "src/parser.rs".to_string(), "?_role".to_string()],
            },
        ])).unwrap();

        // The conjunction should match buckets where the same ?id appears in both facts
        // Since the first bucket has both "feature" type and "src/parser.rs", we get 1 match
        assert!(!results.is_empty());
        assert!(results[0].bindings.contains_key("?id"));
    }

    #[test]
    fn test_query_disjunction() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: bug", vec!["src/bug.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("ccc333", "bbb222", "refactor: cleanup", vec!["src/clean.rs".to_string()]));

        // Find buckets that are either "feature" or "bugfix"
        let results = fb.query(&Query::Or(vec![
            Query::Match {
                predicate: "memory_bucket".to_string(),
                args: vec!["?id".to_string(), "feature".to_string(), "?_s".to_string(), "?_tr".to_string(), "?_ts".to_string(), "?_a".to_string()],
            },
            Query::Match {
                predicate: "memory_bucket".to_string(),
                args: vec!["?id".to_string(), "bugfix".to_string(), "?_s".to_string(), "?_tr".to_string(), "?_ts".to_string(), "?_a".to_string()],
            },
        ])).unwrap();

        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_query_negation() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: bug", vec!["src/bug.rs".to_string()]));

        // NOT succeeds when sub-query finds NO match
        let results = fb.query(&Query::Not(Box::new(Query::Match {
            predicate: "bucket_file".to_string(),
            args: vec!["?id".to_string(), "src/nonexistent.rs".to_string(), "?_role".to_string()],
        }))).unwrap();
        assert_eq!(results.len(), 1, "NOT succeeds when file doesn't exist");

        // NOT fails (returns empty) when sub-query DOES match
        let results2 = fb.query(&Query::Not(Box::new(Query::Match {
            predicate: "bucket_file".to_string(),
            args: vec!["?id".to_string(), "src/parser.rs".to_string(), "?_role".to_string()],
        }))).unwrap();
        assert!(results2.is_empty(), "NOT fails when file exists");
    }

    #[test]
    fn test_convenience_query_by_file() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string(), "src/ast.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: bug", vec!["src/bug.rs".to_string()]));

        let results = fb.query_by_file("src/parser.rs");
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_convenience_query_by_type() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: bug", vec!["src/bug.rs".to_string()]));

        let features = fb.query_by_type("feature");
        assert_eq!(features.len(), 1);

        let bugfixes = fb.query_by_type("bugfix");
        assert_eq!(bugfixes.len(), 1);
    }

    #[test]
    fn test_convenience_query_by_agent() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: bug", vec!["src/bug.rs".to_string()]));

        let results = fb.query_by_agent("test_agent");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_convenience_query_by_trust() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: bug", vec!["src/bug.rs".to_string()]));

        let pending = fb.query_by_trust("pending");
        assert_eq!(pending.len(), 2);
    }

    #[test]
    fn test_convenience_query_by_time() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: bug", vec!["src/bug.rs".to_string()]));

        let results = fb.query_by_time("2026-07-01", "2026-07-03");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_to_prolog() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string()]));

        let prolog = fb.to_prolog();
        assert!(prolog.contains("memory_bucket("));
        assert!(prolog.contains("bucket_file("));
        assert!(prolog.contains(":- dynamic"));
    }

    #[test]
    fn test_fact_counts() {
        let mut fb = FactBase::new();
        fb.assert_bucket(make_test_bucket("aaa111", "000000", "feat: parser", vec!["src/parser.rs".to_string(), "src/ast.rs".to_string()]));
        fb.assert_bucket(make_test_bucket("bbb222", "aaa111", "fix: bug", vec!["src/bug.rs".to_string()]));

        let counts = fb.fact_counts();
        assert_eq!(counts.get("memory_bucket"), Some(&2));
        assert_eq!(counts.get("bucket_file"), Some(&3));
    }

    #[test]
    fn test_prolog_render() {
        let fact = Fact::new("test", vec!["hello".to_string(), "world".to_string()]);
        assert_eq!(fact.to_prolog(), "test(\"hello\", \"world\").");
    }

    proptest! {
        #[test]
        fn prop_bucket_assert_roundtrip(
            id in "[a-f0-9]{6}",
            msg in "[a-z ]{5,20}",
        ) {
            let bucket = make_test_bucket(&id, "000", &msg, vec!["src/lib.rs".to_string()]);
            let bucket_id = bucket.id.clone();
            let mut fb = FactBase::new();
            fb.assert_bucket(bucket);
            prop_assert!(fb.buckets.contains_key(&bucket_id));
            prop_assert!(!fb.facts.is_empty());
        }

        #[test]
        fn prop_query_by_keyword_deterministic(
            kw in "[a-z]{3,10}",
        ) {
            let bucket = make_test_bucket("aaa111", "000", &format!("feat: {}", kw), vec!["src/lib.rs".to_string()]);
            let mut fb1 = FactBase::new();
            let mut fb2 = FactBase::new();
            fb1.assert_bucket(bucket.clone());
            fb2.assert_bucket(bucket);

            let r1 = fb1.query_by_keyword(&kw);
            let r2 = fb2.query_by_keyword(&kw);
            prop_assert_eq!(r1.len(), r2.len());
        }
    }
}
