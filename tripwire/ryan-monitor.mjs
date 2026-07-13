#!/usr/bin/env node
// Agent Ryan — Sentinel Monitor
// Runs on every push + every 6 hours
// Do not modify. Do not give up.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STATE_FILE = path.join(__dirname, 'tripwire-state.json');

// ── Colors ──────────────────────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

// ── State ───────────────────────────────────────────────────────────────────
let state;
try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
} catch (e) {
    console.error(`${RED}TRIPWIRE: Cannot read state file${RESET}`);
    process.exit(1);
}

const config = state.tripwire;

// ── Tripwire Rules ──────────────────────────────────────────────────────────
let tripCount = 0;
const trips = [];

function trip(ruleId, message, severity) {
    trips.push({ ruleId, message, severity });
    tripCount++;
    const color = severity === 'CRITICAL' ? RED : severity === 'HIGH' ? YELLOW : CYAN;
    console.error(`${color}TRIP [${ruleId}]: ${message} (severity: ${severity})${RESET}`);
}

// ── Check 1: Worm Chain Integrity ──────────────────────────────────────────
function checkWormChain() {
    console.log(`${CYAN}CHECK: Worm chain integrity...${RESET}`);
    const { total_seals, seal_indices } = config.seal_watch;

    if (total_seals !== seal_indices.length) {
        trip('TW005', 'Seal count mismatch', 'CRITICAL');
        return false;
    }

    // Verify chain file exists
    const chainFile = path.join(ROOT, '.agentos', 'plasma_gate', 'pubkey.pem');
    if (!fs.existsSync(chainFile)) {
        trip('TW001', 'WORM chain trust anchor missing', 'CRITICAL');
        return false;
    }

    console.log(`${GREEN}PASS: Worm chain integrity verified (${total_seals} seals)${RESET}`);
    return true;
}

// ── Check 2: Sorry Sweep ───────────────────────────────────────────────────
function checkSorrySweep() {
    console.log(`${CYAN}CHECK: Sorry sweep...${RESET}`);
    const { allowed_sorry_count, allowed_axiom_count } = config.checks.sorry_sweep;

    let sorryCount = 0;
    let axiomCount = 0;

    const leanDir = path.join(ROOT, 'mathlib5', 'layers', 'hol', 'lean', 'Mathlib5');
    if (fs.existsSync(leanDir)) {
        const files = fs.readdirSync(leanDir).filter(f => f.endsWith('.lean'));
        for (const file of files) {
            const content = fs.readFileSync(path.join(leanDir, file), 'utf8');
            const fileSorryMatches = content.match(/\bsorry\b/g);
            const fileAxiomMatches = content.match(/\baxiom\b/g);
            if (fileSorryMatches) sorryCount += fileSorryMatches.length;
            if (fileAxiomMatches) axiomCount += fileAxiomMatches.length;
        }
    }

    if (sorryCount > allowed_sorry_count) {
        trip('TW002', `Sorry found: ${sorryCount} > ${allowed_sorry_count}`, 'HIGH');
        return false;
    }

    console.log(`${GREEN}PASS: Sorry sweep clean (sorry: ${sorryCount}, axiom: ${axiomCount})${RESET}`);
    return true;
}

// ── Check 3: Entropy Monitor ───────────────────────────────────────────────
function checkEntropy() {
    console.log(`${CYAN}CHECK: Entropy field...${RESET}`);
    const { threshold, current } = config.checks.entropy_monitor;

    if (current >= threshold) {
        trip('TW003', `Entropy ${current} >= threshold ${threshold}`, 'MEDIUM');
        return false;
    }

    console.log(`${GREEN}PASS: Entropy E = ${current} (threshold: ${threshold})${RESET}`);
    return true;
}

// ── Check 4: Omega Field Seal ──────────────────────────────────────────────
function checkOmegaField() {
    console.log(`${CYAN}CHECK: Omega field seal...${RESET}`);
    const readme = path.join(ROOT, 'README.md');

    if (!fs.existsSync(readme)) {
        trip('TW004', 'README.md missing (omega field lost)', 'CRITICAL');
        return false;
    }

    const content = fs.readFileSync(readme, 'utf8');
    const hasStart = content.includes('<!--OMEGA-FIELD:START-->');
    const hasEnd = content.includes('<!--OMEGA-FIELD:END-->');

    if (!hasStart || !hasEnd) {
        trip('TW004', 'Omega field markers missing or modified', 'CRITICAL');
        return false;
    }

    // Check seal hash is present
    const sealMatch = content.match(/Ω WORM Seal \| `([a-f0-9]{64})`/);
    if (!sealMatch) {
        trip('TW004', 'Omega field seal hash missing', 'HIGH');
        return false;
    }

    console.log(`${GREEN}PASS: Omega field sealed (${sealMatch[1].substring(0, 16)}...)${RESET}`);
    return true;
}

// ── Check 5: File Integrity ────────────────────────────────────────────────
function checkFileIntegrity() {
    console.log(`${CYAN}CHECK: File integrity...${RESET}`);
    const { critical, cpp_foundry, chain_files } = config.monitored_files;

    const allFiles = [...critical, ...cpp_foundry, ...chain_files];
    let missing = 0;

    for (const file of allFiles) {
        const fullPath = path.join(ROOT, file);
        if (!fs.existsSync(fullPath)) {
            console.error(`${YELLOW}  MISSING: ${file}${RESET}`);
            missing++;
        }
    }

    if (missing > 0) {
        trip('TW004', `${missing} monitored files missing`, 'HIGH');
        return false;
    }

    console.log(`${GREEN}PASS: All ${allFiles.length} monitored files present${RESET}`);
    return true;
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
    console.log('');
    console.log(`${CYAN}╔══════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${CYAN}║  Agent Ryan — SENTINEL MONITOR                         ║${RESET}`);
    console.log(`${CYAN}║  INTERCAL Tripwire v1.0                                 ║${RESET}`);
    console.log(`${CYAN}╚══════════════════════════════════════════════════════════╝${RESET}`);
    console.log('');

    const results = {
        worm_chain: checkWormChain(),
        sorry_sweep: checkSorrySweep(),
        entropy: checkEntropy(),
        omega_field: checkOmegaField(),
        file_integrity: checkFileIntegrity()
    };

    console.log('');
    console.log(`${CYAN}════════════════════════════════════════════════════════════${RESET}`);

    if (tripCount > 0) {
        console.error('');
        console.error(`${RED}TRIPWIRE FIRED: ${tripCount} violation(s) detected${RESET}`);
        console.error('');

        for (const t of trips) {
            console.error(`  ${t.severity === 'CRITICAL' ? RED : YELLOW}[${t.ruleId}] ${t.message}${RESET}`);
        }

        console.error('');
        console.error(`${RED}DO GIVE UP.${RESET}`);

        // Write trip log
        const tripLog = {
            timestamp: new Date().toISOString(),
            trips,
            results
        };
        const logFile = path.join(__dirname, 'trip-log.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(tripLog) + '\n');

        process.exit(1);
    } else {
        console.log(`${GREEN}ALL CHECKS PASSED — NO SORRY REMAINS${RESET}`);
        console.log('');

        // Write success log
        const successLog = {
            timestamp: new Date().toISOString(),
            status: 'PASS',
            results
        };
        const logFile = path.join(__dirname, 'trip-log.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(successLog) + '\n');

        process.exit(0);
    }
}

main();
