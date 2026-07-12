/**
 * SOVEREIGN VAULT — vault.ts
 * Key management for the sovereign router.
 * One VAULT_MASTER_SECRET → derives all API keys + signing key.
 * No plaintext keys on disk. No keys in env except the master.
 *
 * Pattern:
 *   1. Set VAULT_MASTER_SECRET once (you know it, it never leaves your head)
 *   2. Run: npm run vault:seal to encrypt your API keys into vault.sealed.json
 *   3. Router calls vault.get("MISTRAL_API_KEY") → decrypts in memory only
 *   4. DFA leak scanner runs on all LLM outputs before they leave the system
 *
 * Cherry-picked from: bobs control repo/DEVFLOW-FINANCE/collectivekitty/lib/crypto-vault.ts
 * Author: Ahmad Ali Parr + Claude Sonnet 4.6
 */

import {
  createPrivateKey, createPublicKey,
  sign, verify as cryptoVerify,
  createCipheriv, createDecipheriv,
  randomBytes, pbkdf2Sync,
} from "crypto";
import { promises as fs } from "fs";
import path from "path";

const VAULT_FILE = path.join(process.cwd(), "vault.sealed.json");

// ── KEY DERIVATION ────────────────────────────────────────────────────────────

function deriveBytes(master: string, label: string, len: number): Buffer {
  return pbkdf2Sync(master, `snapkitty:${label}`, 100_000, len, "sha512");
}

function buildVault(master: string) {
  if (!master) throw new Error("VAULT_MASTER_SECRET not set");

  const ed25519Seed = deriveBytes(master, "ed25519-seed", 32);
  const aesKey      = deriveBytes(master, "aes-256-gcm",  32);

  // Ed25519 keypair from seed
  const pkcs8Header = Buffer.from("302e020100300506032b657004220420", "hex");
  const pkcs8Der    = Buffer.concat([pkcs8Header, ed25519Seed]);
  const privateKey  = createPrivateKey({ key: pkcs8Der, format: "der", type: "pkcs8" });
  const publicKey   = createPublicKey(privateKey);

  // ── AES-256-GCM ──────────────────────────────────────────────────────────────

  function encrypt(plaintext: string) {
    const iv     = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
    const enc    = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag    = cipher.getAuthTag();
    return {
      iv:   iv.toString("hex"),
      tag:  tag.toString("hex"),
      data: enc.toString("hex"),
    };
  }

  function decrypt(blob: { iv: string; tag: string; data: string }): string {
    const decipher = createDecipheriv("aes-256-gcm", aesKey, Buffer.from(blob.iv, "hex"));
    decipher.setAuthTag(Buffer.from(blob.tag, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(blob.data, "hex")),
      decipher.final(),
    ]).toString("utf8");
  }

  // ── Ed25519 signing ───────────────────────────────────────────────────────────

  function signPayload(message: string): string {
    return sign(null, Buffer.from(message), privateKey).toString("hex");
  }

  function verifyPayload(message: string, sig: string): boolean {
    try {
      return cryptoVerify(null, Buffer.from(message), publicKey, Buffer.from(sig, "hex"));
    } catch { return false; }
  }

  function publicKeyHex(): string {
    return publicKey.export({ format: "der", type: "spki" }).toString("hex");
  }

  return { encrypt, decrypt, signPayload, verifyPayload, publicKeyHex };
}

// ── DFA LEAK SCANNER — run on ALL LLM output before it leaves ────────────────
// Catches accidental key leakage in model output.

const KEY_LEAK_PATTERNS = [
  /sk-[a-zA-Z0-9_\-\.]{20,}/g,          // Mistral / OpenAI style
  /sk-ws-[a-zA-Z0-9_\-\.]{20,}/g,        // DashScope
  /AKIA[A-Z0-9]{16}/g,                    // AWS access key
  /[a-z0-9]{32,}:[a-z0-9]{32,}/g,        // generic token pairs
  /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,    // Bearer tokens
  /api[_-]?key[_-]?=\s*['"]?[a-zA-Z0-9_\-\.]{16,}/gi, // api_key= assignments
];

export function scanForLeaks(text: string): { clean: boolean; redacted: string; found: string[] } {
  let redacted = text;
  const found: string[] = [];

  for (const pattern of KEY_LEAK_PATTERNS) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, (match) => {
      found.push(match.slice(0, 8) + "...[REDACTED]");
      return "[REDACTED]";
    });
  }

  return { clean: found.length === 0, redacted, found };
}

// ── VAULT STORE — sealed key file ─────────────────────────────────────────────

export class SovereignVault {
  private vault: ReturnType<typeof buildVault>;
  private sealed: Record<string, { iv: string; tag: string; data: string }> = {};

  constructor(master: string) {
    this.vault = buildVault(master);
  }

  async load() {
    try {
      const raw = await fs.readFile(VAULT_FILE, "utf8");
      this.sealed = JSON.parse(raw);
    } catch {
      this.sealed = {}; // fresh vault
    }
    return this;
  }

  async seal(keyName: string, value: string) {
    this.sealed[keyName] = this.vault.encrypt(value);
    await fs.writeFile(VAULT_FILE, JSON.stringify(this.sealed, null, 2));
    console.log(`[VAULT] Sealed: ${keyName}`);
  }

  get(keyName: string): string {
    // Prefer sealed vault, fall back to env (for migration)
    if (this.sealed[keyName]) {
      return this.vault.decrypt(this.sealed[keyName]);
    }
    const fromEnv = process.env[keyName];
    if (fromEnv) return fromEnv;
    throw new Error(`[VAULT] Key not found: ${keyName}`);
  }

  sign(message: string): string {
    return this.vault.signPayload(message);
  }

  verify(message: string, sig: string): boolean {
    return this.vault.verifyPayload(message, sig);
  }

  publicKey(): string {
    return this.vault.publicKeyHex();
  }

  // Sign a code push — every git commit gets an Ed25519 receipt
  signPush(commitMsg: string, files: string[]): { sig: string; pubkey: string; ts: number } {
    const ts      = Date.now();
    const message = `push:${commitMsg}:${files.join(",")}:${ts}`;
    const sig     = this.sign(message);
    return { sig, pubkey: this.publicKey(), ts };
  }
}

// ── SINGLETON ─────────────────────────────────────────────────────────────────

let _vault: SovereignVault | null = null;

export async function getVault(): Promise<SovereignVault> {
  if (_vault) return _vault;
  const master = process.env.VAULT_MASTER_SECRET;
  if (!master) throw new Error(
    "VAULT_MASTER_SECRET not set. Add it to .env — this is the only secret you need to remember."
  );
  _vault = await new SovereignVault(master).load();
  return _vault;
}

// ── CLI: seal keys into vault ─────────────────────────────────────────────────
// Usage: npx tsx vault.ts seal MISTRAL_API_KEY=abc123 TAVILY_API_KEY=xyz

if (process.argv[2] === "seal") {
  const master = process.env.VAULT_MASTER_SECRET;
  if (!master) { console.error("Set VAULT_MASTER_SECRET first"); process.exit(1); }
  const vault = await new SovereignVault(master).load();
  for (const arg of process.argv.slice(3)) {
    const [name, ...rest] = arg.split("=");
    const value = rest.join("=");
    if (name && value) await vault.seal(name, value);
  }
  console.log("[VAULT] Done. Keys sealed into vault.sealed.json");
  console.log("[VAULT] vault.sealed.json is safe to commit — encrypted with your master secret.");
}
