// config.rs — magmad runtime configuration

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    /// REST + SSE port (external API — CLI, web, METAMINE bridge)
    #[serde(default = "default_http_port")]
    pub http_port: u16,

    /// gRPC port (internal — agent-to-agent, BOB pipeline stages)
    #[serde(default = "default_grpc_port")]
    pub grpc_port: u16,

    /// NATS server URL
    #[serde(default = "default_nats_url")]
    pub nats_url: String,

    /// snap-os base URL (WORM chain + MAGMA verbs)
    #[serde(default = "default_os_url")]
    pub os_url: String,

    /// ERRANT LFIS interpreter URL (if external; falls back to liberrant.a)
    #[serde(default = "default_errant_url")]
    pub errant_url: String,

    /// sovereign-llm server URL — Megtron (WATSON stage)
    #[serde(default = "default_llm_url")]
    pub llm_url: String,

    /// Log level: "trace"|"debug"|"info"|"warn"|"error"
    #[serde(default = "default_log_level")]
    pub log_level: String,
}

fn default_http_port()  -> u16    { 3000 }
fn default_grpc_port()  -> u16    { 50051 }
fn default_nats_url()   -> String { "nats://127.0.0.1:4222".into() }
fn default_os_url()     -> String { "http://127.0.0.1:3001".into() }
fn default_errant_url() -> String { "http://127.0.0.1:4000".into() }
fn default_llm_url()    -> String { "http://127.0.0.1:8080".into() }
fn default_log_level()  -> String { "info".into() }

impl Config {
    /// Load from environment variables (MAGMA_ prefix), fall back to defaults.
    pub fn from_env() -> Self {
        Self {
            http_port:  env_u16("MAGMA_HTTP_PORT",  3000),
            grpc_port:  env_u16("MAGMA_GRPC_PORT",  50051),
            nats_url:   env_str("MAGMA_NATS_URL",   "nats://127.0.0.1:4222"),
            os_url:     env_str("MAGMA_OS_URL",      "http://127.0.0.1:3001"),
            errant_url: env_str("MAGMA_ERRANT_URL",  "http://127.0.0.1:4000"),
            llm_url:    env_str("MAGMA_LLM_URL",     "http://127.0.0.1:8080"),
            log_level:  env_str("MAGMA_LOG",         "info"),
        }
    }

    pub fn http_addr(&self) -> String { format!("0.0.0.0:{}", self.http_port) }
    pub fn grpc_addr(&self) -> String { format!("0.0.0.0:{}", self.grpc_port) }
}

fn env_str(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_owned())
}

fn env_u16(key: &str, default: u16) -> u16 {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}
