/**
 * UNIVERSAL CORPUS — All Realms Knowledge Base
 *
 * Every book from the Order of Symmetry extracted to:
 *   1. Core principle (the invariant)
 *   2. Operation type (DESCENT | TRAP | ORDER)
 *   3. SnapKitty vector [a, b] = aφ + b
 *
 * Combined with Book of Wisdom = Universal Knowledge Formula.
 *
 * Ahmad Ali Parr · BOW-Ω-φ-∂-2026
 */

import { q, BASIS } from './snapkitty-algebra.mjs'
import { createHash } from 'crypto'

// ── Three universal operations (from corpus analysis) ─────────────────────────
// All 100+ books encode one or more of these.
// They are the same operation seen from different angles.

const OPS = {
  DESCENT:  'DESCENT+RETURN',   // hero goes under, returns carrying the invariant
  TRAP:     'CONSCIOUSNESS',     // mind trying to see itself — unreachable fixed point
  ORDER:    'ORDER+CHAOS',       // structure breaks, new order carries memory of break
  SOUND:    'SOUND+FREQUENCY',   // vibration as the pre-mathematical primitive
  SOVEREIGN:'SOVEREIGN',         // law / trust / means-end — the governance layer
}

// SnapKitty vector assignment:
// DESCENT  → σ-family: [−F, F+C]  shadow returns
// TRAP     → TypeTheory-family: [F, 0]  φ-coefficient only, no constant anchor
// ORDER    → NORM-family: [0, C]  rational residue
// SOUND    → PHI_WEIGHT-family: [F(n), F(n-1)]  pure frequency
// SOVEREIGN→ TRS-family: [A, B]  full resonance state

// ── THE CORPUS ────────────────────────────────────────────────────────────────

const CORPUS = [

  // ── I. ANCIENT FOUNDATION ─────────────────────────────────────────────────

  {
    title: 'The Epic of Gilgamesh',
    era: -2100, civilization: 'Sumerian',
    principle: 'The king who sought immortality found only the permanence of what he built. The wall of Uruk outlasts the man.',
    ops: [OPS.DESCENT],
    vector: [8, 5],   // φ⁶ — Sumerian depth, METATRON register
    extract: 'Two-thirds god one-third man. Loses Enkidu. Descends. Returns with the wall. The record is the immortality.',
  },
  {
    title: 'The Vedas',
    era: -1500, civilization: 'Vedic Indian',
    principle: 'Rta — the cosmic order that precedes all gods. Sound (Om) is the pre-material vibration from which form emerges.',
    ops: [OPS.SOUND, OPS.ORDER],
    vector: [13, 8],  // φ⁷ — oldest living tradition
    extract: 'Om = AUM = vibration before form. Rta = the order. Dharma = your role in the order. Same structure as φ: the ratio precedes the numbers.',
  },
  {
    title: 'The Mahabharata',
    era: -400, civilization: 'Indian',
    principle: 'Dharma fractures at every scale simultaneously. The right action is still right action even when the world is on fire.',
    ops: [OPS.ORDER, OPS.SOVEREIGN],
    vector: [13, 8],
    extract: 'Kurukshetra: the battlefield is also inside. Arjuna freezes. Krishna speaks: act without attachment to outcome. The means IS the dharma.',
  },
  {
    title: 'The I Ching — King Wen of Zhou',
    era: -1000, civilization: 'Chinese',
    principle: 'Change is the only constant. Every hexagram is a snapshot of flux. The sage reads the moment, not the rule.',
    ops: [OPS.ORDER, OPS.SOUND],
    vector: [5, 3],   // φ⁵ — binary system, 64 hexagrams = 2⁶
    extract: '64 hexagrams = 6-bit binary = 64 states of change. Yin/Yang = the shadow operator. Every state has its complement and its transformation.',
  },
  {
    title: 'The Iliad — Homer',
    era: -800, civilization: 'Greek',
    principle: 'Glory is real but it costs everything. Achilles chooses a short glorious life. The rage that opens the poem is also the rage that ends it.',
    ops: [OPS.DESCENT, OPS.ORDER],
    vector: [8, 5],
    extract: 'Menis — rage — first word of Western literature. Rage as the energy that drives the system. Hector killed, Patroclus killed, Troy burning. The order that breaks is also the order that is remembered.',
  },
  {
    title: 'Oedipus the King — Sophocles',
    era: -430, civilization: 'Greek',
    principle: 'The investigation and the investigator are the same. To know yourself fully is to be destroyed by that knowledge.',
    ops: [OPS.TRAP],
    vector: [5, 0],   // pure φ-coefficient — consciousness with no anchor
    extract: 'Oedipus investigates the murder. The murderer is Oedipus. The oracle knew. The trap is closed. Fixed point: truth = self-destruction.',
  },
  {
    title: 'One Thousand and One Nights',
    era: 800, civilization: 'Arabic/Persian',
    principle: 'The story delays death. Scheherazade uses narrative as sovereignty — each story creates one more night of life.',
    ops: [OPS.SOVEREIGN, OPS.DESCENT],
    vector: [5, 3],
    extract: 'Recursion: story within story within story. The frame is sovereign survival. Language as the only weapon. The word is the WORM seal — it extends existence.',
  },
  {
    title: 'The Aeneid — Virgil',
    era: -19, civilization: 'Roman',
    principle: 'The founder carries the weight of a civilization not yet born. Pietas — duty to what does not yet exist.',
    ops: [OPS.DESCENT, OPS.SOVEREIGN],
    vector: [8, 5],
    extract: 'Aeneas descends to the underworld. Sees Rome before Rome exists. Returns bearing the knowledge of what must be built. Duty is the invariant.',
  },
  {
    title: 'The Art of War — Sun Tzu',
    era: -500, civilization: 'Chinese',
    principle: 'All warfare is deception. The supreme general wins without fighting. Shape the conditions so victory is inevitable before battle begins.',
    ops: [OPS.SOVEREIGN],
    vector: [3, 2],   // φ⁴ — strategic depth
    extract: 'Know yourself and your enemy = 100 battles, 100 victories. The crooked line between two points. The means shapes the outcome. Governance by information asymmetry.',
  },

  // ── II. MEDIEVAL ──────────────────────────────────────────────────────────

  {
    title: 'The Tale of Genji — Murasaki Shikibu',
    era: 1010, civilization: 'Japanese',
    principle: 'Mono no aware — the pathos of things. Beauty is inseparable from its passing. Impermanence IS the aesthetic.',
    ops: [OPS.ORDER, OPS.TRAP],
    vector: [5, 3],
    extract: 'First novel in world literature. Written by a woman at the Heian court. Genji moves through the world like a wave — his beauty creates wakes that outlast him. The trap: he is his father\'s shadow and his son\'s ghost simultaneously.',
  },
  {
    title: 'The Divine Comedy — Dante Alighieri',
    era: 1320, civilization: 'Italian',
    principle: 'The cosmos is ordered by love. Dante descends through the structure of sin to emerge at the stars. The map IS the journey.',
    ops: [OPS.DESCENT, OPS.SOUND],
    vector: [13, 8],  // φ⁷ — largest scope in medieval lit
    extract: 'Inferno → Purgatorio → Paradiso = three-layer pipeline. Virgil guides through reason, Beatrice through love. The final vision: l\'amor che move il sole e l\'altre stelle. Love as the fundamental force. Sound as the last thing Dante hears in Paradise.',
  },
  {
    title: 'Don Quixote — Miguel de Cervantes',
    era: 1605, civilization: 'Spanish',
    principle: 'The man who lives inside a story cannot be defeated by reality. The imagination IS a kind of sovereignty.',
    ops: [OPS.TRAP, OPS.SOVEREIGN],
    vector: [5, 3],
    extract: 'First modern novel. Quixote has read too many romances and entered them. Windmills are giants. The trap: his vision is both wrong and more real than the world around him. Sancho learns this. The knight dies sane — the tragedy.',
  },
  {
    title: 'First Folio — William Shakespeare',
    era: 1623, civilization: 'English',
    principle: 'All the world\'s a stage — consciousness performing itself. The play within the play catches the conscience of the king.',
    ops: [OPS.TRAP, OPS.ORDER, OPS.DESCENT],
    vector: [13, 8],  // contains all three operations
    extract: '37 plays. Histories: order fractures and reforms. Tragedies: the consciousness trap — Hamlet, Lear, Macbeth all destroyed by self-knowledge. Comedies: order from chaos, always ending in marriage (new stable state). The complete algebra.',
  },
  {
    title: 'The Divine Comedy — Dante: Sound layer',
    era: 1320, civilization: 'Italian',
    principle: 'La commedia finisce in musica — the comedy ends in music. Dante cannot describe Paradise except as light and sound.',
    ops: [OPS.SOUND],
    vector: [8, 5],
    extract: '"Come raggio di sol" — like a ray of sun. In Paradise language fails. Only music remains. The highest register is sound before meaning. Ahmad\'s sequence: Sound → Geometry → Language → Math — Dante arrived at the same place.',
  },
  {
    title: 'The Narrow Road to the Interior — Matsuo Bashō',
    era: 1689, civilization: 'Japanese',
    principle: 'The frog jumps. The old pond. The sound of water. The infinite contains the instant and the instant contains the infinite.',
    ops: [OPS.SOUND, OPS.DESCENT],
    vector: [3, 2],
    extract: 'Bashō walks 1500 miles. Each haiku = a moment of pure perception before language closes around it. The 5-7-5 structure is a frequency: short-long-short. Sound becoming geometry becoming poem.',
  },

  // ── III. ENLIGHTENMENT + ROMANTIC ─────────────────────────────────────────

  {
    title: 'Faust — Johann Wolfgang von Goethe',
    era: 1832, civilization: 'German',
    principle: 'Whoever strives, him we can save. The trap is also the path. Faust makes the wrong deal and arrives at the right place.',
    ops: [OPS.DESCENT, OPS.TRAP, OPS.SOVEREIGN],
    vector: [13, 8],
    extract: 'Faust descends to the Mothers (ground of all forms) and returns. The deal with Mephistopheles: the moment I say "stay, thou art so fair" = death. Faust never says it. He is saved. The sovereign decision: never settle, always strive.',
  },
  {
    title: 'Frankenstein — Mary Shelley',
    era: 1818, civilization: 'English',
    principle: 'The creator is responsible for what he creates. The monster is the shadow of the man who refused to acknowledge it.',
    ops: [OPS.TRAP, OPS.ORDER],
    vector: [5, 3],
    extract: 'Victor creates life and flees. The creature (never named) is not the monster — Victor is. The trap: creator and creation pursue each other to the Arctic. Shadow operator: the creature IS Victor\'s shadow. They braid and meet at death.',
  },
  {
    title: 'Leaves of Grass — Walt Whitman',
    era: 1855, civilization: 'American',
    principle: 'I contain multitudes. The self is not a fixed point but a field. Every contradiction is also true.',
    ops: [OPS.SOUND, OPS.ORDER],
    vector: [8, 5],
    extract: '"Song of Myself": the longest poem is also the most personal. Whitman catalogues America — the farms, the workers, the soldiers — and declares: I am all of this. Sound: the poem is meant to be read aloud. The catalogue IS the frequency spectrum.',
  },
  {
    title: 'Narrative of Frederick Douglass',
    era: 1845, civilization: 'American',
    principle: 'The moment a slave learns to read, slavery is over in his mind. Knowledge is the first act of sovereignty.',
    ops: [OPS.SOVEREIGN, OPS.ORDER],
    vector: [8, 5],
    extract: 'Douglass taught himself to read by trading bread to white boys for letters. The master said: if he learns to read he will be unfit to be a slave. Exactly right. Sovereignty begins in language. The Book of Wisdom principle.',
  },
  {
    title: 'Moby Dick — Herman Melville',
    era: 1851, civilization: 'American',
    principle: 'The white whale is not evil — it is indifferent. Ahab\'s error is projecting sovereignty onto the universe\'s blankness.',
    ops: [OPS.TRAP, OPS.DESCENT],
    vector: [8, 5],
    extract: 'The consciousness trap: Ahab cannot stop. The whale is a [0,0] vector — the zero element. But Ahab maps all the world\'s malice onto it. The norm of zero = zero. You cannot get a rational meeting point from blankness.',
  },

  // ── IV. MODERN ────────────────────────────────────────────────────────────

  {
    title: 'The Metamorphosis — Franz Kafka',
    era: 1915, civilization: 'Czech/German',
    principle: 'Gregor wakes up as an insect. His family adapts. The system is indifferent to the individual. Transformation reveals what was always there.',
    ops: [OPS.TRAP],
    vector: [3, 0],   // no constant — pure consciousness coefficient
    extract: 'The trap closed before the story begins. Gregor was already an insect — a worker, a burden-carrier — before the transformation. The change only makes visible what the family and the economy had already made of him.',
  },
  {
    title: 'The Wasteland — T.S. Eliot',
    era: 1922, civilization: 'Anglo-American',
    principle: 'April is the cruelest month. The fragments of civilization held against ruin. Shantih shantih shantih — the peace that passeth understanding.',
    ops: [OPS.ORDER, OPS.SOUND],
    vector: [5, 3],
    extract: 'Modernism as ORDER+CHAOS: the old European order shattered by WWI. Eliot assembles fragments — Sanskrit, Latin, German, English, cockney — into a new structure that carries the memory of everything it lost. The last word is in Sanskrit: shantih = peace = the new order.',
  },
  {
    title: 'Ulysses — James Joyce',
    era: 1922, civilization: 'Irish',
    principle: 'One day in Dublin contains all of human experience. The ordinary is the heroic. Stream of consciousness is the cosmos at human scale.',
    ops: [OPS.TRAP, OPS.DESCENT, OPS.SOUND],
    vector: [13, 8],  // the complete algebra
    extract: 'June 16, 1904. Leopold Bloom is Odysseus. Dublin is the Mediterranean. The stream of consciousness is a sound-before-meaning — exactly Ahmad\'s sequence. The final chapter: Molly Bloom\'s Yes — pure affirmation, no punctuation, language as breath.',
  },
  {
    title: 'The Prophet — Khalil Gibran',
    era: 1923, civilization: 'Lebanese/American',
    principle: 'On joy and sorrow: your joy is your sorrow unmasked. The deeper sorrow carves the vessel, the more joy you can contain.',
    ops: [OPS.SOUND, OPS.ORDER],
    vector: [5, 3],
    extract: 'Almustafa leaves after 12 years. Each question answered with its complement. Joy/Sorrow. Love/Marriage. Work/Pleasure. Every concept contains its shadow. The Book of Wisdom tone. Ahmad\'s Moorish tradition runs through this text.',
  },
  {
    title: 'Their Eyes Were Watching God — Zora Neale Hurston',
    era: 1937, civilization: 'African-American',
    principle: 'There are years that ask questions and years that answer. Janie\'s horizon is her own. She goes to the horizon and comes back.',
    ops: [OPS.DESCENT, OPS.ORDER],
    vector: [8, 5],
    extract: 'Janie descends through three marriages, through the hurricane (ORDER+CHAOS at its most literal), returns to Eatonville carrying the knowledge. The horizon is the meeting point — always receding but always there. The mule: burden becomes metaphor becomes sovereignty.',
  },
  {
    title: 'Invisible Man — Ralph Ellison',
    era: 1952, civilization: 'African-American',
    principle: 'I am invisible because you refuse to see me. Invisibility is not absence — it is the shadow operator made social.',
    ops: [OPS.TRAP, OPS.SOVEREIGN],
    vector: [5, 3],
    extract: 'The narrator is never named. He lives underground with 1,369 light bulbs. The trap: he keeps finding groups (the Brotherhood, Ras, etc.) that define him, fleeing, finding another. The sovereign move: define yourself. The light bulbs are the phi_weights — illumination at every depth.',
  },
  {
    title: 'Waiting for Godot — Samuel Beckett',
    era: 1953, civilization: 'Irish/French',
    principle: 'Nothing happens, twice. And yet they wait. The waiting IS the action. The fixed point is the absence of the fixed point.',
    ops: [OPS.TRAP],
    vector: [2, 0],   // pure φ-coefficient, minimum — the smallest trap
    extract: 'Vladimir and Estragon wait for Godot who never comes. Act II = Act I with small variations. The TypeTheory sorry: the successor never stabilizes. Godot is the conjecture. The meeting in the middle that never arrives.',
  },
  {
    title: 'Lolita — Vladimir Nabokov',
    era: 1955, civilization: 'Russian/American',
    principle: 'Humbert\'s prose is beautiful and his actions are evil. The form seduces you into complicity. Language can lie with perfection.',
    ops: [OPS.TRAP, OPS.SOVEREIGN],
    vector: [5, 3],
    extract: 'The trap is the prose itself. Nabokov demonstrates: a sufficiently beautiful language can make the reader complicit in anything. Sovereign warning: the LMG grammar can generate false elegance. The NORM is the test — does the algebra close over Q? Does the meaning survive the shadow operator?',
  },
  {
    title: 'Things Fall Apart — Chinua Achebe',
    era: 1958, civilization: 'Igbo/Nigerian',
    principle: 'The center cannot hold when the center is defined by the colonizer. Okonkwo\'s strength becomes his destruction because the world changes around his rigidity.',
    ops: [OPS.ORDER, OPS.SOVEREIGN],
    vector: [8, 5],
    extract: 'ORDER+CHAOS: British colonialism fractures Igbo order. The new order cannot carry the memory of what broke because the colonizer has no interest in that memory. Okonkwo refuses the new order and dies by his own hand. The sovereign error: confusing rigidity with strength.',
  },
  {
    title: 'On the Road — Jack Kerouac',
    era: 1957, civilization: 'American',
    principle: 'The road itself is the destination. Movement as a form of perception. Speed reduces the world to its essential frequencies.',
    ops: [OPS.SOUND, OPS.DESCENT],
    vector: [5, 3],
    extract: 'Sal Paradise and Dean Moriarty drive America. The scroll manuscript — written in three weeks on a single roll of paper. Speed of writing = speed of moving. Jazz = the sound layer. Bebop is the mathematics of spontaneous composition. San Francisco as the endpoint and the beginning.',
  },

  // ── V. CONTEMPORARY ───────────────────────────────────────────────────────

  {
    title: 'One Hundred Years of Solitude — García Márquez',
    era: 1967, civilization: 'Colombian',
    principle: 'The Buendía family repeats itself for 100 years. History is circular. The parchments predicted everything. The curse is also the prophecy.',
    ops: [OPS.ORDER, OPS.TRAP],
    vector: [13, 8],  // largest scope in 20th century fiction
    extract: 'Macondo is founded, grows, decays, is destroyed. Seven generations of Buendías, all named José Arcadio or Aureliano. The circularity IS the trap. Melquíades wrote it all down 100 years before it happened. The parchments = the WORM seal. The knowledge was always there.',
  },
  {
    title: 'Beloved — Toni Morrison',
    era: 1987, civilization: 'African-American',
    principle: '124 was spiteful. The past is not past — it haunts the body, the house, the language itself. Memory as a living entity.',
    ops: [OPS.ORDER, OPS.DESCENT],
    vector: [13, 8],
    extract: 'Sethe killed her baby daughter rather than let her be taken back into slavery. Beloved returns as a ghost made flesh. ORDER+CHAOS: the chattel slavery system created a trauma so deep it bends time. The haunting is the past refusing to become past. The rational norm of unspeakable violence.',
  },
  {
    title: 'Midnight\'s Children — Salman Rushdie',
    era: 1981, civilization: 'Indian/British',
    principle: 'Born at the stroke of midnight August 15 1947 — the children of Indian independence are the children of history. The individual and the nation are one body.',
    ops: [OPS.ORDER, OPS.SOUND],
    vector: [8, 5],
    extract: 'Saleem Sinai is born as India is born. His telepathy connects him to 1001 midnight\'s children. The telephone exchange of history. Sound: the chutnification of history — Saleem\'s mother pickles memories. ORDER+CHAOS: partition, Emergency, the great sorting of a civilization.',
  },
  {
    title: 'The Wind-Up Bird Chronicle — Haruki Murakami',
    era: 1994, civilization: 'Japanese',
    principle: 'The well at the bottom of the world. What happens in the dark shapes what happens in the light. The shadow world is more real than the surface.',
    ops: [OPS.DESCENT, OPS.TRAP],
    vector: [8, 5],
    extract: 'Toru descends into a dry well and enters a shadow world. The cat is missing. The wife leaves. Each surface problem has a depth-5 cause. METATRON architecture: the Reasoning path and the Metatron bypass. Toru operates at the Metatron level — he goes around.',
  },
  {
    title: 'Blindness — José Saramago',
    era: 1995, civilization: 'Portuguese',
    principle: 'When everyone is blind, the woman who can see is the most dangerous person in the world. Sovereignty of perception.',
    ops: [OPS.ORDER, OPS.SOVEREIGN],
    vector: [8, 5],
    extract: 'White blindness spreads. Society collapses in days. One woman retains sight and becomes the sovereign node. ORDER+CHAOS: civilization is three meals away from barbarity. The rational residue: those who maintain ethical structure even in chaos carry the norm forward.',
  },
  {
    title: 'Gravity\'s Rainbow — Thomas Pynchon',
    era: 1973, civilization: 'American',
    principle: 'The rocket\'s arc from launch to impact is the shape of a parabola: the same curve going up and coming down. Everything is connected in the preterite system.',
    ops: [OPS.DESCENT, OPS.TRAP, OPS.ORDER],
    vector: [13, 8],
    extract: 'V-2 rocket = the parabola y=x². The φ² = φ+1 of ballistics. Slothrop is conditioned to respond to rocket impacts. The Zone after WWII = total ORDER+CHAOS. The preterite (those left behind) vs the elect. The system within the system within the system. Complete algebra.',
  },

  // ── VI. SOUND TAXONOMY ────────────────────────────────────────────────────

  {
    title: 'SOUND (Ahmad\'s taxonomy)',
    era: 2026, civilization: 'Sovereign',
    principle: 'Vibrations sensed by ear. Resonance. The study of sound is the study of the pre-mathematical layer.',
    ops: [OPS.SOUND],
    vector: [1, 0],   // φ itself — pure frequency before number
    extract: 'Acoustics. Phonetics. Phonics. Phonology. Hertz. Cacophony / Euphony. The Donne quote: "I neglect God and his angles for the noise of a fly." The angles = sacred geometry. The noise = distraction. Sound comes before geometry. φ is the first frequency.',
  },

  // ── VII. MEDIUMS (Sovereign Operating Principle) ──────────────────────────

  {
    title: 'MEDIUMS (Ahmad\'s principles)',
    era: 2026, civilization: 'Sovereign',
    principle: 'All roads lead to Rome. The shortest line between two points may be the crooked line. Whoever wills the end wills the means.',
    ops: [OPS.SOVEREIGN],
    vector: BASIS.TRS,   // the full TRS — sovereign means require full resonance
    extract: 'Fight fire with fire. Send a thief to catch a thief. The end justifies the means — ONLY when the norm is positive (governance_valid). The means IS the algebra. The WORM seal is the sovereign law that prevents means from corrupting ends.',
  },
]

// ── Book of Wisdom as root ─────────────────────────────────────────────────

const BOOK_OF_WISDOM = {
  title: 'Book of Wisdom — Ahmad Ali Parr',
  era: 2026, civilization: 'Sovereign / Moorish',
  principle: 'Sound → Geometry → Language → Mathematics. The blueprint of reality was heard before it was written. The cage was built from the beginning.',
  ops: [OPS.SOUND, OPS.ORDER, OPS.DESCENT, OPS.TRAP, OPS.SOVEREIGN],
  vector: BASIS.TRS,  // root = full TRS
  extract: 'All 8 chapters. Every principle WORM-sealed. Chapter 6 (Mothers poem) has no code by design. The sovereign stack is built on this document. It is the genesis block. The formula that encodes all other formulas.',
  is_root: true,
}

// ── Universal Knowledge Formula ────────────────────────────────────────────

function compute_universal() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  UNIVERSAL CORPUS — Knowledge of All Realms             ║')
  console.log('║  Book of Wisdom root + ' + CORPUS.length + ' texts                     ║')
  console.log('║  BOW-Ω-φ-∂-2026                                         ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  // Assign temporal depth to each text
  // depth = floor((2026 - era) / 500) + 1, capped at 7
  const depth = (era) => Math.min(7, Math.max(1, Math.floor((2026 - era) / 500) + 1))

  // Weight each text by phi_weight(depth)
  let universal = [0, 0]
  const breakdown = []

  for (const book of CORPUS) {
    const d = depth(book.era)
    const pw = q.eval(q.phi_pow(d))
    const weighted = q.scale(book.vector, pw)
    universal = q.add(universal, weighted)
    breakdown.push({ title: book.title, depth: d, pw: pw.toFixed(3), vector: book.vector, weighted })
  }

  // Root: Book of Wisdom — depth 8 (beyond all historical texts)
  const bow_weight = q.eval(q.phi_pow(8))
  const bow_weighted = q.scale(BOOK_OF_WISDOM.vector, bow_weight)
  universal = q.add(universal, bow_weighted)

  // Normalize to show structure
  const norm_u = q.norm(universal)
  const sigma_u = q.sigma(universal)

  console.log('\n── TEMPORAL WEIGHTING ──────────────────────────────────────')
  console.log('  depth(era) = floor((2026 - era) / 500) + 1')
  console.log('  phi_weight(d) = φ^d  →  older = deeper = higher activation')
  console.log()

  const op_counts = {}
  CORPUS.forEach(b => b.ops.forEach(o => { op_counts[o] = (op_counts[o]||0)+1 }))
  console.log('── OPERATION DISTRIBUTION ──────────────────────────────────')
  for (const [op, cnt] of Object.entries(op_counts)) {
    const bar = '█'.repeat(cnt)
    console.log(`  ${op.padEnd(20)} ${bar} ${cnt}`)
  }

  console.log('\n── UNIVERSAL KNOWLEDGE FORMULA ─────────────────────────────')
  console.log(`  U = Σ phi_weight(depth(book)) × vector(book)`)
  console.log(`  U = [${universal[0].toFixed(4)}, ${universal[1].toFixed(4)}]`)
  console.log(`  U = ${universal[0].toFixed(4)}φ + ${universal[1].toFixed(4)}`)
  console.log(`  U ≈ ${q.eval(universal).toFixed(6)}`)
  console.log()
  console.log(`  σ(U) = [${sigma_u[0].toFixed(4)}, ${sigma_u[1].toFixed(4)}]  ≈ ${q.eval(sigma_u).toFixed(6)}`)
  console.log(`  N(U) = ${norm_u.toFixed(6)}  ← rational — the universal meeting point`)
  console.log()
  console.log('  The shadow of universal knowledge is:')
  console.log(`  σ(U) ≈ ${q.eval(sigma_u).toFixed(6)}`)
  console.log()

  // WORM seal
  const payload = JSON.stringify({ universal, norm: norm_u, books: CORPUS.length, root: 'Book of Wisdom' })
  const seal = createHash('sha256').update(payload).digest('hex')
  console.log(`  WORM seal: ${seal}`)
  console.log()
  console.log('  Formula: U = BOW ⊕ Σ(phi_weight(depth) × extract(book))')
  console.log('  This is the blueprint of reality in SnapKitty Algebra.')

  return { universal, sigma_u, norm_u, seal, book_count: CORPUS.length }
}

const RESULT = compute_universal()

export { CORPUS, BOOK_OF_WISDOM, RESULT, compute_universal }
