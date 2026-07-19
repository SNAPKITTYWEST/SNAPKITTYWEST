/**
 * ROGET'S THESAURUS — The Pre-Root
 *
 * Peter Mark Roget, 1852. Published by Longman (now Penguin Group).
 * The first semantic algebra. The source vocabulary for Ahmad's Book of Wisdom.
 * The pre-mathematical structure that gave language its algebraic bones.
 *
 * Genealogy:
 *   Sound → Etymology → Roget's Thesaurus (1852) → Boolean Logic (Boole 1847)
 *         → Ahmad's Book of Wisdom → SnapKitty Algebra → Q(√5)
 *
 * Ahmad Ali Parr discovered: "This is what I created my book with.
 * The source of everything in the universe. The origin of spelling,
 * Boolean, and etymology."
 *
 * BOW-Ω-φ-∂-2026
 */

import { q, BASIS } from './snapkitty-algebra.mjs'
import { createHash } from 'crypto'

const PHI = (1 + Math.sqrt(5)) / 2

// ── Roget's 6 Classes (1852 original structure) ───────────────────────────────
//
// Roget organized ALL of English into 6 classes, 1,000 concept clusters.
// Each cluster = a basis vector in meaning-space.
// Every word = a coordinate: it belongs to one or more clusters.
//
// This is not a dictionary (form → meaning).
// This is a FIELD (meaning → meaning neighborhood).
// That is what makes it algebraic.

const ROGET_6_CLASSES = [
  {
    id: 1,
    name: 'Abstract Relations',
    roget_desc: 'Existence, Relation, Quantity, Order, Number, Time, Change, Causation',
    snapkitty_op: 'THE FIELD Q(√5)',
    vector: [1, 0],   // φ = the abstract relation between 1 and √5
    extract: `
  Abstract relations ARE the field Q(√5):
    Existence     → [0,1] vs [0,0]  (being vs non-being)
    Relation      → the morphisms: add, mul, sigma, norm
    Quantity      → the rational coefficients a, b ∈ Q
    Order         → depth(node): 0,1,2,3,4,5,5,6
    Number        → Fibonacci encoding: φⁿ = F(n)φ + F(n-1)
    Time          → depth(era) = temporal phi_weight
    Change        → σ: φ → -1/φ  (the shadow operator = change)
    Causation     → φ² = φ+1  (the sovereign law: the cause generates one more)`,
  },
  {
    id: 2,
    name: 'Space',
    roget_desc: 'Dimensions, Form, Motion',
    snapkitty_op: 'PHI_WEIGHT (depth → geometry)',
    vector: [8, 5],   // φ⁶ = geometric depth
    extract: `
  Space is phi_weight applied to depth:
    Dimensions → depth 0 through 7 (8 nodes of the resonance graph)
    Form       → [a,b] = the shape of an element in Q(√5)
    Motion     → σ: motion from one embedding to the other

  Geometry comes after sound. Sound creates the dimension.
  φ is the proportion that generates all spatial harmony:
    pentagram, nautilus, sunflower, galaxy arm, DNA helix.
  Roget's SPACE class = the geometry chapter of SnapKitty.`,
  },
  {
    id: 3,
    name: 'Matter',
    roget_desc: 'Matter in General, Inorganic, Organic, Sensation',
    snapkitty_op: '[0, b] — CONSTANT ONLY (material, no φ-growth)',
    vector: [0, 1],   // [0,1] = the rational constant — pure matter
    extract: `
  Matter is the constant term [0,b] in SnapKitty:
    Material things have weight (b) but no φ-coefficient growth.
    They are real but they do not grow by the golden ratio.
    They obey N([0,b]) = b² — the norm is always positive and rational.

  Ahmad's insight: Mammon = worship of [0,b].
  To worship matter = to strip the φ-coefficient from your vector.
  You become real but you stop growing.

  Satan's Deception: "Materialization" = collapsing [a,b] → [0,b].
  This is why the adversary offers material rewards — to strip φ.`,
  },
  {
    id: 4,
    name: 'Intellect',
    roget_desc: 'Formation, Communication, Means of Communicating Ideas',
    snapkitty_op: '[a, 0] — PHI COEFFICIENT ONLY (mind, frequency, ratio)',
    vector: [1, 0],   // [1,0] = φ itself — pure intellect
    extract: `
  Intellect is the φ-coefficient [a,0] in SnapKitty:
    Ideas are pure ratios — they don't have material weight.
    N([a,0]) = -a² < 0 for all a ≠ 0.
    The mind ALONE is norm-negative — intellect without grounding is unstable.

  This is why [a,0] is dangerous without the [0,b] anchor:
    Genius without grounding = the adversary.
    Lucifer = [a,0] — infinite brightness, no rational anchor.
    φ itself = [1,0] — the generator, unstable alone, generates the field.

  Communication = σ: sending the φ-coefficient across the Galois embedding.
  Language = the LMG that takes [a,b] vectors and makes them audible.`,
  },
  {
    id: 5,
    name: 'Volition',
    roget_desc: 'Individual Volition (Will), Intersocial (Authority, Governance)',
    snapkitty_op: 'TRS = [174.4, 106.8] — FULL RESONANCE (sovereign will)',
    vector: BASIS.TRS,   // full TRS = sovereign volition
    extract: `
  Volition is the TRS in SnapKitty — the full sovereign vector:
    Will         = TRS = 174.4φ + 106.8 (all nodes, all depths, all symbols)
    Authority    = phi_weight(7) = φ^7 = [13,8]  (maximum depth)
    Permission   = NORM check: N(x) ≠ 0 before acting
    Governance   = WORM seal: the chain that makes will sovereign
    Prohibition  = DISCERNMENT: σ(σ(x)) = x? before accepting a vector

  Ahmad's MEDIUMS chapter IS Roget's Volition class:
    "All roads lead to Rome" = N(all_paths) = same rational residue
    "Send a thief to catch a thief" = use σ to expose σ_evil
    "Whoever wills the end wills the means" = φ² = φ+1 applied to governance`,
  },
  {
    id: 6,
    name: 'Affections',
    roget_desc: 'Affections in General, Personal, Sympathetic, Moral, Religious',
    snapkitty_op: 'σ(TRS) = [-174.4, 281.2] — SHADOW OF SOVEREIGNTY (love, ethics, the divine)',
    vector: [-174.4, 281.2],  // σ(TRS) = the shadow of sovereignty = ethics/love
    extract: `
  Affections are σ(TRS) — the shadow of sovereignty:
    Personal     = σ applied to self: σ([1,0]) = [-1,1] = -φ + 1 = -1/φ = φ̂
    Sympathetic  = N(TRS) = rational norm = the rational meeting point
    Moral        = the DISCERNMENT rule: does your action maintain σ² = id?
    Religious    = UNITY: σ∘σ = id — God is the involution that returns all things

  Crucially: σ(TRS) ≈ -0.985 ← almost exactly -1.
  The shadow of sovereignty is -1. Love and sovereignty are negatives of each other
  in the embedding — they never meet in ℝ but they DEFINE each other through N.

  N(TRS) = TRS × σ(TRS) = 388.985 × (-0.985) = -383.2 ← rational
  Love × Sovereignty = -383.2 ← the rational meeting point is negative.
  You pay for sovereignty with love. Ahmad's Book of Wisdom: the cost is real.`,
  },
]

// ── Boolean Connection ─────────────────────────────────────────────────────────
//
// George Boole (1815-1864): The Mathematical Analysis of Logic (1847)
// Peter Mark Roget (1779-1869): Thesaurus (1852)
// Both Victorian. Both trying to algebraize thought.
// Boole succeeded for logic. Roget succeeded for meaning.
// SnapKitty unifies both.

const BOOLEAN_TO_SNAPKITTY = {
  note: 'Boolean algebra = Q(√5) restricted to {[0,0], [0,1]}',
  table: [
    { boolean: 'TRUE',  bool_val: 1, snapkitty: '[0, 1]',   meaning: 'rational constant — grounded truth' },
    { boolean: 'FALSE', bool_val: 0, snapkitty: '[0, 0]',   meaning: 'zero element' },
    { boolean: '?????', bool_val: 'φ', snapkitty: '[1, 0]', meaning: 'φ — the truth Boolean cannot express' },
    { boolean: 'AND',   bool_val: '×', snapkitty: 'q.mul',  meaning: 'field multiplication via φ²=φ+1' },
    { boolean: 'OR',    bool_val: '+', snapkitty: 'q.add',  meaning: 'field addition' },
    { boolean: 'NOT',   bool_val: '¬', snapkitty: 'q.sigma',meaning: 'Galois conjugation: the shadow operator' },
    { boolean: 'XOR',   bool_val: '⊕', snapkitty: 'q.sub',  meaning: 'field subtraction' },
    { boolean: 'NORM',  bool_val: '∥·∥', snapkitty: 'q.norm', meaning: 'the rational residue — not in Boolean' },
  ],
  insight: `
  Boolean has TWO truth values: TRUE and FALSE = {0, 1}.
  SnapKitty has INFINITE truth values: all of Q(√5) = {aφ+b | a,b ∈ Q}.

  Boolean = SnapKitty restricted to the rational constant [0,b] with b ∈ {0,1}.
  It is the MATTER class (Roget class 3) without the INTELLECT class (class 4).

  The missing truth value: [1,0] = φ ≈ 1.618...
  φ is the truth that is "more than true" — greater than 1 but not 2.
  Boolean calls it overflow. SnapKitty calls it the generator.

  Ahmad's Thesaurus discovery: when you expand the word "True" in Roget,
  you find: genuine, authentic, real, exact, faithful, loyal, constant.
  These are not Boolean TRUE. They are Q(√5) elements — they have DEGREE.
  Loyal to what depth? Faithful to which embedding?

  SnapKitty = Roget's thesaurus + Boole's algebra + Ahmad's phi.`,
}

// ── Etymology Layer ────────────────────────────────────────────────────────────
//
// Etymology = the φ-coefficient of a word: its origin, its root, its depth.
// The constant term b = the current surface form.
// The φ-coefficient a = how much of the original root-meaning still carries.

const ETYMOLOGY_AS_ALGEBRA = [
  { word: 'Logos',    root: 'Greek: reason/word',    vector: [3, 2],   note: 'φ⁴: Logos = word + reason = language+math, depth 4' },
  { word: 'Sophia',   root: 'Greek: wisdom',          vector: [5, 3],   note: 'φ⁵: Sophia = depth 5, METATRON layer' },
  { word: 'Dharma',   root: 'Sanskrit: cosmic order', vector: [8, 5],   note: 'φ⁶: Dharma = the order that phi_weight maintains' },
  { word: 'Maat',     root: 'Egyptian: truth/order',  vector: [8, 5],   note: 'φ⁶: Maat = same depth as Dharma — same invariant' },
  { word: 'Rta',      root: 'Vedic: cosmic order',    vector: [8, 5],   note: 'φ⁶: Rta = same. Order is depth 6 in every language.' },
  { word: 'Tao',      root: 'Chinese: the way',       vector: [5, 3],   note: 'φ⁵: Tao = the path = the DESCENT route' },
  { word: 'Asha',     root: 'Avestan: truth/order',   vector: [8, 5],   note: 'φ⁶: Asha vs Druj = N(x) > 0 vs N(x) < 0' },
  { word: 'Haqq',     root: 'Arabic: truth/right',    vector: [8, 5],   note: 'φ⁶: Haqq = same invariant as Maat, Dharma, Rta, Asha' },
  { word: 'Emet',     root: 'Hebrew: truth',          vector: [5, 3],   note: 'φ⁵: Aleph+Mem+Tav = first, middle, last letter of Hebrew alphabet' },
  { word: 'Ahimsa',   root: 'Sanskrit: non-harm',     vector: [3, 2],   note: 'φ⁴: the constraint that keeps NORM positive' },
  { word: 'Phronesis',root: 'Greek: practical wisdom', vector: [5, 3],  note: 'φ⁵: Aristotle: wisdom that operates in time (depth)' },
  { word: 'Nemesis',  root: 'Greek: rightful order',  vector: [5, 3],   note: 'φ⁵: the NORM that corrects when TRS drifts' },
]

// ── The Genealogy ─────────────────────────────────────────────────────────────

function print_genealogy() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║  ROGET\'S THESAURUS — The Pre-Root                          ║')
  console.log('║  Source vocabulary for Ahmad\'s Book of Wisdom              ║')
  console.log('║  Origin of spelling, Boolean, etymology                    ║')
  console.log('║  BOW-Ω-φ-∂-2026                                             ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  console.log('\n── GENEALOGY ──────────────────────────────────────────────────')
  console.log()
  console.log('  Sound (pre-mathematical)')
  console.log('    ↓')
  console.log('  Etymology (word roots = depth encoding)')
  console.log('    ↓')
  console.log('  Roget\'s Thesaurus, 1852 — Peter Mark Roget / Penguin Group')
  console.log('  ├── 6 Classes → 1,000 concept clusters → 15,000 words')
  console.log('  └── First semantic algebra: meaning → meaning neighborhood')
  console.log('    ↓')
  console.log('  Boolean Logic, 1847 — George Boole (exact contemporary of Roget)')
  console.log('  └── Truth values {0,1} = Roget\'s Affirmation/Negation class')
  console.log('    ↓')
  console.log('  Ahmad\'s Book of Wisdom — handwritten, 100 pages')
  console.log('  └── Built FROM Roget: every term sourced from Roget clusters')
  console.log('    ↓')
  console.log('  SnapKitty Algebra — Q(√5) = Roget + Boole + φ')
  console.log('  └── SnapKitty is what you get when you take Roget\'s 6 classes')
  console.log('      and Boole\'s {TRUE, FALSE} and add the missing truth value φ')
  console.log()

  console.log('── ROGET\'S 6 CLASSES → SNAPKITTY OPERATIONS ─────────────────')
  for (const cls of ROGET_6_CLASSES) {
    console.log(`\n  Class ${cls.id}: ${cls.name}`)
    console.log(`  Roget: ${cls.roget_desc}`)
    console.log(`  SnapKitty: ${cls.snapkitty_op}`)
    console.log(`  Vector: [${cls.vector[0]}, ${cls.vector[1]}]  ≈ ${(cls.vector[0]*PHI + (cls.vector[1]||0)).toFixed(4)}`)
  }

  console.log('\n── BOOLEAN → SNAPKITTY ────────────────────────────────────────')
  console.log(`  ${BOOLEAN_TO_SNAPKITTY.note}`)
  console.log()
  console.log('  Boolean    Boolean val   SnapKitty       Meaning')
  console.log('  ' + '─'.repeat(70))
  for (const row of BOOLEAN_TO_SNAPKITTY.table) {
    console.log(`  ${row.boolean.padEnd(11)}${String(row.bool_val).padEnd(14)}${row.snapkitty.padEnd(16)}${row.meaning}`)
  }
  console.log()
  console.log('  THE MISSING TRUTH VALUE:')
  console.log('  Boolean: TRUE=1, FALSE=0. Period. No third option.')
  console.log('  SnapKitty: [1,0] = φ ≈ 1.618  ← "more than true, less than 2"')
  console.log('  Ahmad\'s insight: reality is not binary. Faith is not TRUE or FALSE.')
  console.log('  Faith = φ = the ratio that generates but cannot be generated.')

  console.log('\n── ETYMOLOGY = DEPTH ENCODING ─────────────────────────────────')
  console.log('  Every word\'s ROOT = its phi_weight layer')
  console.log()
  console.log('  Word        Root                     Vector    Note')
  console.log('  ' + '─'.repeat(72))
  for (const e of ETYMOLOGY_AS_ALGEBRA) {
    console.log(`  ${e.word.padEnd(12)}${e.root.padEnd(25)}${JSON.stringify(e.vector).padEnd(10)}${e.note}`)
  }
  console.log()
  console.log('  INVARIANT: The words for ORDER / TRUTH in every language')
  console.log('  all land at the SAME phi_weight depth (5 or 6).')
  console.log('  Maat = Dharma = Rta = Asha = Haqq = [8,5] or [5,3].')
  console.log('  The order of reality is invariant across all languages.')
  console.log('  This is what Roget discovered. Ahmad\'s Book encodes it.')

  console.log('\n── THE CLAIM ───────────────────────────────────────────────────')
  console.log()
  console.log('  "The source of everything in the universe."')
  console.log()
  console.log('  Roget organized meaning before meaning had a theory.')
  console.log('  Boole algebraized truth before computers existed.')
  console.log('  Ahmad built his book using Roget\'s vocabulary — exact terms,')
  console.log('  exact categories, exact word-clusters as the building blocks.')
  console.log()
  console.log('  SnapKitty Algebra is the Q(√5) completion of this project:')
  console.log('  - Roget gives the vocabulary (the words, their neighborhoods)')
  console.log('  - Boole gives the logic (the {TRUE, FALSE} foundation)')
  console.log('  - Ahmad adds φ (the missing truth value, the sovereign ratio)')
  console.log('  - Q(√5) = the field that contains all three')
  console.log()
  console.log('  The Penguin Group publishes Roget today.')
  console.log('  Penguin = mass distribution of knowledge = democracy of the mind.')
  console.log('  The same cypherpunk principle: information is free.')

  // WORM seal
  const payload = JSON.stringify({
    source: 'Roget\'s Thesaurus, 1852, Penguin Group',
    author: 'Peter Mark Roget (1779-1869)',
    classes: 6, clusters: 1000, words: 15000,
    genealogy: 'Sound → Etymology → Roget → Boole → Book of Wisdom → Q(√5)',
    missing_truth: 'φ = [1,0]',
    claim: 'Ahmad Ali Parr used Roget as the source vocabulary for Book of Wisdom',
    date: 'BOW-Ω-φ-∂-2026',
  })
  const seal = createHash('sha256').update(payload).digest('hex')
  console.log(`\n  WORM seal: ${seal.slice(0,32)}`)
  console.log(`             ${seal.slice(32)}`)
  console.log()
  console.log('  The book came with it.')
  console.log('  Roget wrote it. Ahmad found it. SnapKitty encoded it.')

  return { classes: ROGET_6_CLASSES, boolean_map: BOOLEAN_TO_SNAPKITTY, etymology: ETYMOLOGY_AS_ALGEBRA, seal }
}

const RESULT = print_genealogy()

export { ROGET_6_CLASSES, BOOLEAN_TO_SNAPKITTY, ETYMOLOGY_AS_ALGEBRA, RESULT }
