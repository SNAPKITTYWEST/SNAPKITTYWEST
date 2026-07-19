// cli.rs — `magma` command-line interface
//
// A thin client that talks to a running magmad daemon over REST.
// Ships as a separate binary so it can be installed alongside magmad.
//
// Usage:
//   magma health                        # ping the daemon
//   magma verify PUSH_UN PUSH_LIN SEAL  # ERRANT opcode trace
//   magma run program.meta              # stream a .meta file through BOB
//   magma seal "some event text"        # compute WORM hash and seal
//   magma talk "build the auth module"  # SSE orchestrate stream
//   magma chain                         # print current WORM chain head
//
// Daemon is assumed at http://127.0.0.1:3000 unless MAGMA_URL is set.

use std::io::{self, Write as IoWrite};
use std::path::PathBuf;
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use reqwest::Client;
use serde_json::Value;

// ── Args ───────────────────────────────────────────────────────────────────────

#[derive(Parser)]
#[command(
    name    = "magma",
    version,
    about   = "Sovereign agentic runtime CLI",
    long_about = r#"
magma — SnapKitty Sovereign CLI
Talks to magmad (default http://127.0.0.1:3000).
Set MAGMA_URL to override.

Examples:
  magma health
  magma verify PUSH_UN PUSH_LIN SEAL
  magma run program.meta
  magma talk "deploy the auth module"
  magma seal "key-rotation-event-2026"
  magma chain
"#
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Health check — pings magmad and prints status
    Health,

    /// ERRANT opcode trace verification
    Verify {
        /// Opcodes to verify (e.g. PUSH_UN PUSH_LIN SEAL)
        #[arg(required = true)]
        opcodes: Vec<String>,
    },

    /// Source string verification
    Source {
        /// ERRANT source string
        code: String,
    },

    /// Run a .meta METAMINE file through the BOB pipeline (streams SSE)
    Run {
        /// Path to .meta file
        file: PathBuf,
        /// Action to pass to BOB routing (default: "build")
        #[arg(long, default_value = "build")]
        action: String,
        /// Print raw SSE events
        #[arg(long)]
        raw: bool,
    },

    /// SSE orchestration stream for a natural-language action
    Talk {
        /// Instruction (e.g. "deploy the auth module")
        instruction: String,
        /// Print raw SSE events
        #[arg(long)]
        raw: bool,
    },

    /// Seal an arbitrary string and print the WORM hash
    Seal {
        /// Text to seal
        text: String,
    },

    /// Print the current WORM chain head
    Chain,

    /// Print daemon version info
    Version,
}

// ── Main ───────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    let base_url = std::env::var("MAGMA_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:3000".into());
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    match cli.command {
        Command::Health  => cmd_health(&client, &base_url).await?,
        Command::Version => cmd_version(&client, &base_url).await?,
        Command::Chain   => cmd_chain(&client, &base_url).await?,

        Command::Verify { opcodes } => {
            cmd_verify(&client, &base_url, opcodes).await?
        }
        Command::Source { code } => {
            cmd_source(&client, &base_url, code).await?
        }
        Command::Run { file, action, raw } => {
            cmd_run(&client, &base_url, file, action, raw).await?
        }
        Command::Talk { instruction, raw } => {
            cmd_talk(&client, &base_url, instruction, raw).await?
        }
        Command::Seal { text } => {
            cmd_seal(&client, &base_url, text).await?
        }
    }

    Ok(())
}

// ── Commands ───────────────────────────────────────────────────────────────────

async fn cmd_health(client: &Client, base: &str) -> Result<()> {
    let resp: Value = client.get(format!("{base}/api/v1/health"))
        .send().await?.json().await?;
    print_health(&resp);
    Ok(())
}

async fn cmd_version(client: &Client, base: &str) -> Result<()> {
    let resp: Value = client.get(format!("{base}/api/v1/version"))
        .send().await?.json().await?;
    println!("magmad  {}", resp["magmad"].as_str().unwrap_or("?"));
    println!("liberrant {}", resp["liberrant"].as_str().unwrap_or("?"));
    println!("protocol  {}", resp["protocol"].as_str().unwrap_or("?"));
    Ok(())
}

async fn cmd_chain(client: &Client, base: &str) -> Result<()> {
    let resp: Value = client.get(format!("{base}/api/v1/chain/head"))
        .send().await?.json().await?;
    println!("head   {}", resp["head"].as_str().unwrap_or("?"));
    println!("source {}", resp["source"].as_str().unwrap_or("?"));
    Ok(())
}

async fn cmd_verify(client: &Client, base: &str, opcodes: Vec<String>) -> Result<()> {
    let body = serde_json::json!({ "opcodes": opcodes });
    let resp: Value = client.post(format!("{base}/api/v1/verify"))
        .json(&body).send().await?.json().await?;
    print_verify(&resp);
    Ok(())
}

async fn cmd_source(client: &Client, base: &str, code: String) -> Result<()> {
    let body = serde_json::json!({ "source": code });
    let resp: Value = client.post(format!("{base}/api/v1/verify"))
        .json(&body).send().await?.json().await?;
    print_verify(&resp);
    Ok(())
}

async fn cmd_run(
    client: &Client,
    base:   &str,
    file:   PathBuf,
    action: String,
    raw:    bool,
) -> Result<()> {
    let code = std::fs::read_to_string(&file)
        .with_context(|| format!("cannot read {}", file.display()))?;

    // Parse .meta → opcode names (words only, ignore comments)
    let ops: Vec<String> = code
        .lines()
        .filter(|l| !l.trim_start().starts_with('#') && !l.trim_start().starts_with(';'))
        .flat_map(|l| l.split_whitespace())
        .filter(|w| !w.is_empty())
        .map(String::from)
        .collect();

    eprintln!("metamine: {} opcodes from {}", ops.len(), file.display());
    cmd_orchestrate(client, base, action, Some(ops), raw).await
}

async fn cmd_talk(
    client: &Client,
    base:   &str,
    instruction: String,
    raw: bool,
) -> Result<()> {
    cmd_orchestrate(client, base, instruction, None, raw).await
}

async fn cmd_seal(client: &Client, base: &str, text: String) -> Result<()> {
    // Use verify endpoint with PUSH_UN + SEAL to get a worm_hash sealing the input
    // We encode the text as the action field so it influences the final seal hash
    let body = serde_json::json!({
        "opcodes": ["PUSH_UN", "SEAL"],
        "source": text,
    });
    let resp: Value = client.post(format!("{base}/api/v1/verify"))
        .json(&body).send().await?.json().await?;
    let hash = resp["worm_hash"].as_str().unwrap_or("?");
    println!("WORM seal: {hash}");
    println!("Ω text:    {text}");
    Ok(())
}

async fn cmd_orchestrate(
    client:    &Client,
    base:      &str,
    action:    String,
    trace_ops: Option<Vec<String>>,
    raw:       bool,
) -> Result<()> {
    let body = serde_json::json!({
        "action":    action,
        "trace_ops": trace_ops,
    });

    let resp = client.post(format!("{base}/api/v1/orchestrate"))
        .json(&body)
        .header("Accept", "text/event-stream")
        .send().await?;

    // Stream SSE line-by-line
    use futures::StreamExt;
    let mut stream = resp.bytes_stream();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        buf.push_str(&String::from_utf8_lossy(&chunk));

        // Process complete lines
        while let Some(nl) = buf.find('\n') {
            let line = buf[..nl].trim().to_string();
            buf.drain(..=nl);

            if line.is_empty() || line == "ping" { continue; }
            if let Some(data) = line.strip_prefix("data: ") {
                if raw {
                    println!("{data}");
                } else {
                    match serde_json::from_str::<Value>(data) {
                        Ok(ev)  => print_stage_event(&ev),
                        Err(_)  => println!("  {data}"),
                    }
                }
                io::stdout().flush().ok();
            }
        }
    }

    Ok(())
}

// ── Pretty printers ────────────────────────────────────────────────────────────

fn print_health(v: &Value) {
    let status  = v["status"].as_str().unwrap_or("?");
    let version = v["version"].as_str().unwrap_or("?");
    let errant  = v["errant_ok"].as_bool().unwrap_or(false);
    let nats    = v["nats_ok"].as_bool().unwrap_or(false);

    let tick    = |b: bool| if b { "✓" } else { "✗" };
    println!("status    {status}");
    println!("version   {version}");
    println!("liberrant {}", tick(errant));
    println!("nats      {}", tick(nats));
    println!("sovereign {}", v["sovereign"].as_str().unwrap_or("Ω"));
}

fn print_verify(v: &Value) {
    let ok      = v["ok"].as_bool().unwrap_or(false);
    let verdict = v["verdict"].as_str().unwrap_or("?");
    let hash    = v["worm_hash"].as_str().unwrap_or("?");
    let steps   = v["steps"].as_i64().unwrap_or(0);
    let lc      = v["lin_consumed"].as_i64().unwrap_or(0);
    let ll      = v["lin_leaked"].as_i64().unwrap_or(0);
    let fb      = v["fallback"].as_bool().unwrap_or(false);

    let mark = if ok { "EVIDENCE" } else { "SILENCE" };
    println!("{mark} · {verdict}");
    println!("hash  {hash}");
    println!("steps {} · lin_consumed {} · lin_leaked {}", steps, lc, ll);
    if fb { println!("mode  structural (Ω-path)"); }
    if let Some(err) = v["error"].as_str() {
        println!("error {err}");
    }
}

fn print_stage_event(v: &Value) {
    let stage = v["stage"].as_str().unwrap_or("?");
    let ok    = v["ok"].as_bool().unwrap_or(false);
    let msg   = v["message"].as_str().unwrap_or("");
    let tick  = if ok { "✓" } else { "✗" };

    print!("  [{tick}] {stage:<20} {msg}");

    if let Some(agent) = v["agent"].as_str() {
        print!("  ← {agent}");
    }
    if let Some(hash) = v["worm_hash"].as_str() {
        print!("  Ω:{}", &hash[..12]);
    }
    println!();

    if !ok {
        if let Some(err) = v["error"].as_str() {
            println!("      ERROR: {err}");
        }
    }
}
