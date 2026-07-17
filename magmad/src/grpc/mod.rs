// grpc/mod.rs — tonic gRPC service implementation
//
// Internal machine-to-machine API on :50051
// Agent-to-agent, BOB pipeline stages, prover integrations.
//
// sovereign_types.rs contains hand-written prost Message types equivalent to
// what protoc + tonic_build would generate from proto/sovereign.proto.
// When protoc becomes available, run tonic_build and replace the manual types.

mod sovereign_types;
use sovereign_types as sovereign;

use tonic::{Request, Response, Status};
use tokio_stream::wrappers::ReceiverStream;
use tokio::sync::mpsc;
use tracing::info;

use crate::{bob, errant_ffi};
use sovereign::{
    sovereign_server::Sovereign,
    sovereign_server::SovereignServer,
    ChainHeadResult, Empty, HealthResult,
    OrchestrateEvent, OrchestrateRequest,
    RouteRequest, RouteResult,
    VerifyRequest, VerifyResult,
};

// ── Service implementation ─────────────────────────────────────────────────

#[derive(Debug, Default, Clone)]
pub struct SovereignService;

#[tonic::async_trait]
impl Sovereign for SovereignService {

    type OrchestrateStream = ReceiverStream<Result<OrchestrateEvent, Status>>;

    async fn orchestrate(
        &self,
        request: Request<OrchestrateRequest>,
    ) -> Result<Response<Self::OrchestrateStream>, Status> {
        let req = request.into_inner();
        info!("gRPC orchestrate: action={}", req.action);

        let (tx, rx) = mpsc::channel(16);

        tokio::spawn(async move {
            let send = |ev: OrchestrateEvent| {
                let tx = tx.clone();
                async move { tx.send(Ok(ev)).await.ok(); }
            };

            // TRUST-DEED-GATE
            send(OrchestrateEvent {
                stage:   "TRUST-DEED-GATE".into(),
                ok:      true,
                message: "BOB gate open".into(),
                ..Default::default()
            }).await;

            // ERRANT verify
            let ops: Vec<&str> = req.trace_ops.iter().map(|s| s.as_str()).collect();
            let errant = if ops.is_empty() {
                errant_ffi::verify_source("PUSH_UN SEAL")
            } else {
                errant_ffi::verify_named(&ops)
            };

            send(OrchestrateEvent {
                stage:     "ERRANT".into(),
                ok:        errant.ok,
                worm_hash: errant.worm_hash.clone(),
                message:   format!("{} · {} steps", errant.verdict(), errant.steps),
                error:     if errant.ok { String::new() } else { errant.error.clone() },
                ..Default::default()
            }).await;

            if !errant.ok { return; }

            // BOB route
            let signals = bob::BobSignals::from_errant_and_action(&errant, &req.action);
            let route   = bob::route(&signals);

            send(OrchestrateEvent {
                stage:   "BOB".into(),
                ok:      true,
                agent:   format!("{} {}", route.emoji, route.agent),
                message: format!("→ {}:{}", route.agent, route.action),
                ..Default::default()
            }).await;

            // SEAL
            let seal = errant_ffi::sha256_hex(
                format!("MAGMA|{}|{}", route.agent, errant.worm_hash).as_bytes()
            );
            send(OrchestrateEvent {
                stage:      "SEAL".into(),
                ok:         true,
                worm_hash:  seal.clone(),
                proof_hash: seal,
                message:    "Ω↺Ψ↺Δ↺Λ↺Σ↺Φ↺α".into(),
                ..Default::default()
            }).await;
        });

        Ok(Response::new(ReceiverStream::new(rx)))
    }

    async fn verify(
        &self,
        request: Request<VerifyRequest>,
    ) -> Result<Response<VerifyResult>, Status> {
        let req = request.into_inner();
        let ops: Vec<&str> = req.opcodes.iter().map(|s| s.as_str()).collect();
        let result = if ops.is_empty() {
            errant_ffi::verify_source(&req.source)
        } else {
            errant_ffi::verify_named(&ops)
        };

        Ok(Response::new(VerifyResult {
            ok:           result.ok,
            worm_hash:    result.worm_hash,
            error:        result.error,
            steps:        result.steps,
            lin_consumed: result.lin_consumed,
            lin_leaked:   result.lin_leaked,
            fallback:     result.fallback,
        }))
    }

    async fn route(
        &self,
        request: Request<RouteRequest>,
    ) -> Result<Response<RouteResult>, Status> {
        let req = request.into_inner();
        let signals = bob::BobSignals {
            has_seal:      req.has_seal,
            has_vault:     req.has_vault,
            ruptures:      req.ruptures,
            has_forge:     req.has_forge,
            has_resonance: false,
            has_memory:    false,
            has_echo:      false,
            steps:         0,
        };
        let r = bob::route(&signals);
        Ok(Response::new(RouteResult {
            emoji:   r.emoji.into(),
            agent:   r.agent.into(),
            action:  r.action.into(),
            subject: r.subject.into(),
        }))
    }

    async fn chain_head(
        &self,
        _request: Request<Empty>,
    ) -> Result<Response<ChainHeadResult>, Status> {
        let head = errant_ffi::sha256_hex(b"MAGMA-GENESIS");
        Ok(Response::new(ChainHeadResult {
            head,
            index:     0,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }))
    }

    async fn health(
        &self,
        _request: Request<Empty>,
    ) -> Result<Response<HealthResult>, Status> {
        let errant_ok = errant_ffi::verify_named(&["PUSH_UN", "SEAL"]).ok;
        Ok(Response::new(HealthResult {
            status:    if errant_ok { "ok".into() } else { "degraded".into() },
            version:   env!("CARGO_PKG_VERSION").into(),
            nats_ok:   false,
            errant_ok,
            worm_hash: errant_ffi::sha256_hex(b"MAGMA-GENESIS"),
        }))
    }
}

pub fn service() -> SovereignServer<SovereignService> {
    SovereignServer::new(SovereignService::default())
}

use chrono;
