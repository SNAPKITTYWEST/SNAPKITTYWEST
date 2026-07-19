// nats_bus.rs — NATS pub/sub fabric
//
// Wraps async-nats client. Sovereign subjects follow the pattern:
//   sovereign.<layer>.<verb>.<version>
//   e.g. sovereign.forge.build.v1
//        sovereign.cipher.seal.v1
//        sovereign.audit.bifrost.commit.v1
//
// NatsBus is cheaply cloneable (Arc inside async-nats client).

use async_nats::Client;
use anyhow::Result;
use serde::Serialize;
use tracing::{info, warn};

#[derive(Clone)]
pub struct NatsBus {
    client: Client,
}

impl NatsBus {
    pub async fn connect(url: &str) -> Result<Self> {
        let client = async_nats::connect(url).await?;
        info!("NATS connected: {}", url);
        Ok(Self { client })
    }

    /// Publish a serializable payload to a NATS subject.
    pub async fn publish<T: Serialize>(&self, subject: &str, payload: &T) -> Result<()> {
        let bytes = serde_json::to_vec(payload)?;
        self.client
            .publish(subject.to_owned(), bytes.into())
            .await?;
        Ok(())
    }

    /// Publish a raw string payload.
    pub async fn publish_str(&self, subject: &str, payload: &str) -> Result<()> {
        self.client
            .publish(subject.to_owned(), payload.as_bytes().to_vec().into())
            .await?;
        Ok(())
    }

    /// Publish a sovereign audit event to bifrost.
    pub async fn audit<T: Serialize>(&self, event: &str, payload: &T) -> Result<()> {
        #[derive(Serialize)]
        struct AuditEnvelope<'a, T> {
            event:    &'a str,
            payload:  &'a T,
            timestamp: String,
        }
        let envelope = AuditEnvelope {
            event,
            payload,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };
        self.publish("sovereign.audit.bifrost.commit.v1", &envelope).await
    }

    /// Subscribe to a subject, returning a stream of messages.
    pub async fn subscribe(&self, subject: &str) -> Result<async_nats::Subscriber> {
        Ok(self.client.subscribe(subject.to_owned()).await?)
    }
}

/// Offline stub — used when NATS is unavailable.
/// Logs the publish attempt and returns Ok(()) silently.
pub async fn publish_offline(subject: &str, payload: &str) {
    warn!("NATS offline — dropped: {} → {}", subject, &payload[..payload.len().min(80)]);
}

// chrono for timestamps
use chrono;
