// bob.rs — BOB routing logic
//
// BOB = TRUST-DEED-GATE → MAMBA → WATSON → PROLOG-KERNEL → HASKELL-MONAD → SEAL
//
// After ERRANT verifies linearity, BOB determines which MAGMA verb + agent
// handles the request. Mirrors bridge.mjs bobRoute() priority table.
//
// Priority (descending): SEAL > VAULT > SENTINEL > FORGE > ORACLE > ANCHOR > FLUX > NOVA

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BobRoute {
    pub emoji:   &'static str,
    pub agent:   &'static str,
    pub action:  &'static str,
    pub subject: &'static str,   // NATS subject
    pub verb:    &'static str,   // MAGMA HTTP event name
}

#[derive(Debug, Default)]
pub struct BobSignals {
    pub has_seal:      bool,
    pub has_vault:     bool,
    pub ruptures:      i32,
    pub has_forge:     bool,
    pub has_resonance: bool,
    pub has_memory:    bool,
    pub has_echo:      bool,
    pub steps:         i32,
}

static ROUTE_SEAL:      BobRoute = BobRoute { emoji: "🔒", agent: "CIPHER",   action: "SIGN",      subject: "sovereign.cipher.seal.v1",    verb: "METAMINE_SEAL"    };
static ROUTE_VAULT:     BobRoute = BobRoute { emoji: "🏦", agent: "VAULT",    action: "APPROVE",   subject: "sovereign.vault.approve.v1",  verb: "VAULT_APPROVE"    };
static ROUTE_SENTINEL:  BobRoute = BobRoute { emoji: "👁",  agent: "SENTINEL", action: "MONITOR",   subject: "sovereign.sentinel.watch.v1", verb: "SENTINEL_MONITOR" };
static ROUTE_FORGE:     BobRoute = BobRoute { emoji: "⚒️", agent: "FORGE",    action: "BUILD",     subject: "sovereign.forge.build.v1",    verb: "FORGE_BUILD"      };
static ROUTE_ORACLE:    BobRoute = BobRoute { emoji: "🔮", agent: "ORACLE",   action: "KNOWLEDGE", subject: "sovereign.oracle.query.v1",   verb: "ORACLE_QUERY"     };
static ROUTE_MNEMEX:    BobRoute = BobRoute { emoji: "📜", agent: "MNEMEX",   action: "WORM",      subject: "sovereign.mnemex.anchor.v1",  verb: "ANCHOR"           };
static ROUTE_HERALD:    BobRoute = BobRoute { emoji: "⚡", agent: "HERALD",   action: "BROADCAST", subject: "sovereign.herald.flux.v1",    verb: "FLUX_BROADCAST"   };
static ROUTE_NOVA:      BobRoute = BobRoute { emoji: "🧠", agent: "NOVA",     action: "SYNTHETIC", subject: "sovereign.nova.query.v1",     verb: "NOVA_SYNTHETIC"   };

impl BobSignals {
    /// Derive signals from ERRANT result + action string
    pub fn from_errant_and_action(
        errant: &crate::errant_ffi::ErrantResult,
        action: &str,
    ) -> Self {
        BobSignals {
            has_seal:      action.contains("seal") || action.contains("sign"),
            has_vault:     action.contains("vault") || action.contains("approve") || action.contains("transfer"),
            ruptures:      errant.ruptures,
            has_forge:     action.contains("forge") || action.contains("build"),
            has_resonance: action.contains("query") || action.contains("oracle") || action.contains("resona"),
            has_memory:    action.contains("anchor") || action.contains("memory"),
            has_echo:      errant.output.len() > 0,
            steps:         errant.steps,
        }
    }
}

pub fn route(signals: &BobSignals) -> &'static BobRoute {
    // TRUST-DEED-GATE: critical tasks always route through CIPHER for sealing
    if signals.has_seal      { return &ROUTE_SEAL;     }
    if signals.has_vault     { return &ROUTE_VAULT;    }
    if signals.ruptures > 0  { return &ROUTE_SENTINEL; }
    if signals.has_forge     { return &ROUTE_FORGE;    }
    if signals.has_resonance { return &ROUTE_ORACLE;   }
    if signals.has_memory    { return &ROUTE_MNEMEX;   }
    if signals.has_echo      { return &ROUTE_HERALD;   }
    &ROUTE_NOVA
}

/// The BOB pipeline stages printed in SSE stream
pub fn pipeline_stages() -> &'static [&'static str] {
    &["TRUST-DEED-GATE", "MAMBA", "WATSON", "PROLOG-KERNEL", "HASKELL-MONAD", "SEAL"]
}
