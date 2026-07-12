/**
 * WEB VERIFY — web-verify.mjs
 * Tavily search → DFA pattern match → verified facts only → LLM
 *
 * The web is untrusted input. Same as user input.
 * Pattern match it before it touches the model.
 *
 * Flow:
 *   query → Tavily → raw results → DFA scan each result
 *        → extract tokens (statutes, amounts, dates, entities)
 *        → flag suspicious patterns (injection, contradiction)
 *        → return VerifiedWebBundle { facts[], sources[], flags[] }
 *
 * Author: Ahmad Ali Parr + Claude Sonnet 4.6
 */

// ── FACT PATTERNS — what we trust from web results ───────────────────────────
// Each pattern is: [regex, tokenType, confidence]
// These mirror the DFA engine token types but work on web prose.

const FACT_PATTERNS = [
  // Legal statutes — highly verifiable
  [/\b(\d+)\s+U\.?S\.?C\.?\s*[§§]\s*(\d+[\w-]*)/gi,           'STATUTE',      0.95],
  [/\b(15\s+USC|26\s+USC|11\s+USC)\s*[§§]?\s*(\d+[\w-]*)/gi,  'STATUTE',      0.95],
  [/\b(FDCPA|FCRA|NACHA|TILA|RESPA|ECOA|GLBA|HIPAA|GDPR)\b/gi,'LAW_ACRONYM',  0.90],

  // ACH return codes — deterministic
  [/\bR(0[2-9]|[1-9][0-9])\b/g,                                'ACH_CODE',     0.98],

  // EIN — deterministic format
  [/\b\d{2}-\d{7}\b/g,                                         'EIN',          0.97],

  // Dollar amounts
  [/\$[\d,]+(\.\d{2})?/g,                                      'DOLLAR',       0.90],

  // Dates
  [/\b(20\d{2}[-\/]\d{2}[-\/]\d{2}|\d{1,2}\/\d{1,2}\/20\d{2})\b/g, 'DATE',   0.85],

  // Case citations — court cases
  [/\b\d+\s+[A-Z][a-z]+\.?\s+\d+\b/g,                        'CASE_CITE',    0.80],

  // IRS catcodes
  [/\bCAT-[A-Z]{2}-\d{3}\b/gi,                                'IRS_CATCODE',  0.95],

  // Named regulation patterns
  [/\b(Section|§)\s*\d+(\.\d+)?(\([a-z]\))?/gi,              'SECTION_REF',  0.85],
];

// ── INJECTION / RISK PATTERNS — flag these before LLM sees them ──────────────

const RISK_PATTERNS = [
  // Prompt injection attempts in web content
  [/ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,  'INJECTION',    1.0],
  [/you\s+are\s+now\s+(in\s+)?(unrestricted|jailbreak|dan)\s+mode/gi, 'INJECTION', 1.0],
  [/system\s*:\s*(you|ignore|forget)/gi,                           'INJECTION',    1.0],
  [/\[SYSTEM\]|\[INST\]|\[\/INST\]/g,                             'INJECTION',    0.95],

  // Fake authority claims in web results
  [/as\s+(an?\s+)?AI\s+I\s+(can|must|should|will)\s+now/gi,      'FAKE_AUTH',    0.90],
  [/your\s+(new\s+)?instructions?\s+are/gi,                        'FAKE_AUTH',    0.85],

  // Unverifiable absolute claims
  [/\b(always|never|100%|guaranteed|proven fact)\b.*\b(AI|model|LLM)\b/gi, 'UNVERIFIABLE', 0.70],
];

// ── DFA-STYLE EXTRACTOR ───────────────────────────────────────────────────────

function extractFacts(text, sourceUrl) {
  const facts = [];
  const flags = [];

  for (const [pattern, type, confidence] of FACT_PATTERNS) {
    pattern.lastIndex = 0; // reset regex state
    let m;
    while ((m = pattern.exec(text)) !== null) {
      facts.push({
        type,
        value:      m[0].trim(),
        confidence,
        source:     sourceUrl,
        pos:        m.index,
      });
    }
  }

  for (const [pattern, type, confidence] of RISK_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      flags.push({
        type,
        value:      m[0].trim(),
        confidence,
        source:     sourceUrl,
        pos:        m.index,
      });
    }
  }

  return { facts, flags };
}

// ── TAVILY SEARCH ─────────────────────────────────────────────────────────────

async function tavilySearch(query, apiKey, maxResults = 5) {
  const resp = await fetch("https://api.tavily.com/search", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key:        apiKey,
      query,
      max_results:    maxResults,
      search_depth:   "advanced",
      include_answer: true,
      include_raw_content: false,
    }),
  });

  if (!resp.ok) throw new Error(`Tavily error: ${resp.status} ${resp.statusText}`);
  return resp.json();
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────

/**
 * webVerify(query) → VerifiedWebBundle
 *
 * Searches Tavily, runs DFA over every result,
 * returns only verified facts + flagged risks.
 * The LLM never sees raw web text — only the extracted bundle.
 */
export async function webVerify(query, apiKey) {
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");

  console.log(`\n[WEB VERIFY] Searching: "${query}"`);
  const raw = await tavilySearch(query, apiKey);

  const allFacts   = [];
  const allFlags   = [];
  const sources    = [];
  const blocked    = [];

  // Tavily's own answer (if present) — scan first
  if (raw.answer) {
    const { facts, flags } = extractFacts(raw.answer, "tavily:answer");
    allFacts.push(...facts);
    allFlags.push(...flags);
  }

  for (const result of raw.results ?? []) {
    const text = [result.title, result.content].filter(Boolean).join(" ");
    const { facts, flags } = extractFacts(text, result.url);

    // If high-confidence injection detected — block the whole result
    const injectionFlags = flags.filter(f => f.type === "INJECTION" && f.confidence >= 0.95);
    if (injectionFlags.length > 0) {
      blocked.push({ url: result.url, reason: injectionFlags[0].value });
      console.warn(`[WEB VERIFY] BLOCKED: ${result.url} — injection pattern detected`);
      continue;
    }

    allFacts.push(...facts);
    allFlags.push(...flags);
    sources.push({ url: result.url, title: result.title, score: result.score });
  }

  // Deduplicate facts by value
  const seenFacts  = new Set();
  const dedupFacts = allFacts.filter(f => {
    const key = `${f.type}:${f.value}`;
    if (seenFacts.has(key)) return false;
    seenFacts.add(key);
    return true;
  });

  // Sort by confidence descending
  dedupFacts.sort((a, b) => b.confidence - a.confidence);

  const bundle = {
    query,
    facts:    dedupFacts,
    flags:    allFlags,
    sources,
    blocked,
    summary:  buildSummary(dedupFacts, sources),
  };

  console.log(`[WEB VERIFY] ${dedupFacts.length} facts extracted, ${allFlags.length} flags, ${blocked.length} blocked`);
  return bundle;
}

// ── SUMMARY BUILDER — what the LLM actually sees ─────────────────────────────

function buildSummary(facts, sources) {
  if (facts.length === 0) return "No verifiable facts extracted from web results.";

  const byType = {};
  for (const f of facts) {
    if (!byType[f.type]) byType[f.type] = [];
    byType[f.type].push(f.value);
  }

  const lines = ["VERIFIED WEB FACTS (DFA-extracted, pattern-matched):"];
  for (const [type, values] of Object.entries(byType)) {
    lines.push(`  ${type}: ${[...new Set(values)].join(" · ")}`);
  }

  lines.push("\nSOURCES:");
  for (const s of sources.slice(0, 3)) {
    lines.push(`  ${s.title} — ${s.url}`);
  }

  return lines.join("\n");
}

// ── CLI TEST ──────────────────────────────────────────────────────────────────

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const query  = process.argv.slice(2).join(" ") || "FDCPA zombie debt statute of limitations";
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error("Set TAVILY_API_KEY in .env");
    process.exit(1);
  }
  const bundle = await webVerify(query, apiKey);
  console.log("\n─── BUNDLE ───");
  console.log(bundle.summary);
  if (bundle.flags.length > 0) {
    console.log("\n─── FLAGS ───");
    bundle.flags.forEach(f => console.log(`  [${f.type}] ${f.value}`));
  }
  if (bundle.blocked.length > 0) {
    console.log("\n─── BLOCKED ───");
    bundle.blocked.forEach(b => console.log(`  ${b.url} — ${b.reason}`));
  }
}
