// sovereign_types.rs — hand-written prost message types for sovereign.proto
//
// Equivalent to what protoc + tonic_build would generate from proto/sovereign.proto.
// Committed to avoid the protoc runtime dependency.
// When protoc is available: delete this file, re-add tonic-build to build.rs,
// and restore the `include!(concat!(env!("OUT_DIR"), "/sovereign.rs"))` pattern.

use prost::Message;

// ── Messages (prost::Message already derives Default — do NOT add Default) ──

#[derive(Clone, PartialEq, Message)]
pub struct Empty {}

#[derive(Clone, PartialEq, Message)]
pub struct OrchestrateRequest {
    #[prost(string, tag = "1")]
    pub session_id: String,
    #[prost(string, tag = "2")]
    pub action: String,
    #[prost(string, tag = "3")]
    pub code: String,
    #[prost(string, tag = "4")]
    pub intent: String,
    #[prost(string, repeated, tag = "5")]
    pub constraints: Vec<String>,
    #[prost(string, repeated, tag = "6")]
    pub trace_ops: Vec<String>,
}

#[derive(Clone, PartialEq, Message)]
pub struct OrchestrateEvent {
    #[prost(string, tag = "1")]
    pub stage: String,
    #[prost(bool, tag = "2")]
    pub ok: bool,
    #[prost(string, tag = "3")]
    pub agent: String,
    #[prost(string, tag = "4")]
    pub worm_hash: String,
    #[prost(string, tag = "5")]
    pub proof_hash: String,
    #[prost(string, tag = "6")]
    pub message: String,
    #[prost(string, tag = "7")]
    pub error: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct VerifyRequest {
    #[prost(string, repeated, tag = "1")]
    pub opcodes: Vec<String>,
    #[prost(string, tag = "2")]
    pub source: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct VerifyResult {
    #[prost(bool, tag = "1")]
    pub ok: bool,
    #[prost(string, tag = "2")]
    pub worm_hash: String,
    #[prost(string, tag = "3")]
    pub error: String,
    #[prost(int32, tag = "4")]
    pub steps: i32,
    #[prost(int32, tag = "5")]
    pub lin_consumed: i32,
    #[prost(int32, tag = "6")]
    pub lin_leaked: i32,
    #[prost(bool, tag = "7")]
    pub fallback: bool,
}

#[derive(Clone, PartialEq, Message)]
pub struct RouteRequest {
    #[prost(bool, tag = "1")]
    pub has_seal: bool,
    #[prost(bool, tag = "2")]
    pub has_vault: bool,
    #[prost(int32, tag = "3")]
    pub ruptures: i32,
    #[prost(bool, tag = "4")]
    pub has_forge: bool,
}

#[derive(Clone, PartialEq, Message)]
pub struct RouteResult {
    #[prost(string, tag = "1")]
    pub emoji: String,
    #[prost(string, tag = "2")]
    pub agent: String,
    #[prost(string, tag = "3")]
    pub action: String,
    #[prost(string, tag = "4")]
    pub subject: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct ChainHeadResult {
    #[prost(string, tag = "1")]
    pub head: String,
    #[prost(int64, tag = "2")]
    pub index: i64,
    #[prost(string, tag = "3")]
    pub timestamp: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct HealthResult {
    #[prost(string, tag = "1")]
    pub status: String,
    #[prost(string, tag = "2")]
    pub version: String,
    #[prost(bool, tag = "3")]
    pub nats_ok: bool,
    #[prost(bool, tag = "4")]
    pub errant_ok: bool,
    #[prost(string, tag = "5")]
    pub worm_hash: String,
}

// ── Server trait ─────────────────────────────────────────────────────────────

pub mod sovereign_server {
    use super::*;
    use tonic::{Request, Response, Status};

    #[tonic::async_trait]
    pub trait Sovereign: Send + Sync + 'static {
        type OrchestrateStream: futures::Stream<Item = Result<OrchestrateEvent, Status>>
            + Send
            + 'static;

        async fn orchestrate(
            &self,
            request: Request<OrchestrateRequest>,
        ) -> Result<Response<Self::OrchestrateStream>, Status>;

        async fn verify(
            &self,
            request: Request<VerifyRequest>,
        ) -> Result<Response<VerifyResult>, Status>;

        async fn route(
            &self,
            request: Request<RouteRequest>,
        ) -> Result<Response<RouteResult>, Status>;

        async fn chain_head(
            &self,
            request: Request<Empty>,
        ) -> Result<Response<ChainHeadResult>, Status>;

        async fn health(
            &self,
            request: Request<Empty>,
        ) -> Result<Response<HealthResult>, Status>;
    }

    // Minimal server wrapper — just type-erases the impl.
    // The actual gRPC dispatch goes through axum+tonic Routes when protoc is available.
    // For now, service() in grpc/mod.rs builds this wrapper and main.rs starts a stub.
    #[derive(Clone)]
    pub struct SovereignServer<T>(pub std::sync::Arc<T>);

    impl<T: Sovereign> SovereignServer<T> {
        pub fn new(inner: T) -> Self {
            Self(std::sync::Arc::new(inner))
        }

        pub fn inner(&self) -> &T {
            &self.0
        }
    }
}
