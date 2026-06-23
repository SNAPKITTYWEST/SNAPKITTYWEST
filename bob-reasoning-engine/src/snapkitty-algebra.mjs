/**
 * SnapKitty Algebra — Q(√5) Countdown + LMG Vector
 *
 * The field Q(√5): every element = aφ + b  →  vector [a, b]
 * All arithmetic reduces to 2-vectors using φ² = φ + 1.
 *
 * Ahmad Ali Parr · BOW-Ω-φ-∂-2026
 */

const PHI = (1 + Math.sqrt(5)) / 2   // 1.618033...
const PHI_HAT = 1 - PHI               // σ(φ) = -1/φ = 1 - φ ≈ -0.618

// ── Q(√5) arithmetic ─────────────────────────────────────────────────────────
// Elements as [phi_coef, const]  →  aφ + b

const q = {
  add:   ([a,b],[c,d]) => [a+c, b+d],
  sub:   ([a,b],[c,d]) => [a-c, b-d],
  scale: ([a,b], k)    => [a*k, b*k],

  // (aφ+b)(cφ+d) = ac(φ+1) + (ad+bc)φ + bd  using φ²=φ+1
  mul: ([a,b],[c,d]) => [a*c + a*d + b*c, a*c + b*d],

  // σ: φ→-1/φ=1-φ  →  σ(aφ+b) = a(1-φ)+b = -aφ+(a+b)
  sigma: ([a,b]) => [-a, a+b],

  // N(x) = x·σ(x) ∈ Q  (rational norm, the meeting point)
  norm: v => q.mul(v, q.sigma(v))[1],   // φ-coef always 0

  // [c,d]⁻¹ = σ([c,d]) / N([c,d])
  inv: ([c,d]) => { const n = q.norm([c,d]); return q.scale(q.sigma([c,d]), 1/n) },
  div: (v, w)  => q.mul(v, q.inv(w)),

  // phi_weight(n) = φⁿ = F(n)φ + F(n-1)
  phi_pow: n => { let a=0,b=1; for(let i=0;i<n;i++){[a,b]=[b,a+b];} return [a, b>0?b-a:0]},

  eval: ([a,b]) => a*PHI + b,
  fmt:  ([a,b]) => `${a}φ + ${b}`,
}

// ── Canonical basis ───────────────────────────────────────────────────────────

const BASIS = {
  PHI:    [1, 0],
  ONE:    [0, 1],
  TWO:    [0, 2],
  THREE:  [0, 3],
  FIVE:   [0, 5],
  ME:     [41,   25  ],
  AN:     [36.6, 22.6],
  KI:     [40.4, 24.5],
  DI:     [56.4, 34.7],
  TRS:    [174.4, 106.8],
}

// ── LMG — Language Math Grammar ──────────────────────────────────────────────
// Each rule is a vector [name, input_shape, output_shape, formula, value]

const LMG = [
  {
    id: 0, name: 'ELEMENT',
    rule: '[a, b]',
    meaning: 'aφ + b  ∈  Q(√5)',
    domain: 'Q(√5)',
    vector: [1, 0],  // φ as canonical generator
  },
  {
    id: 1, name: 'ADD',
    rule: '[a+c, b+d]',
    meaning: '(aφ+b) + (cφ+d)',
    domain: 'Q(√5) × Q(√5) → Q(√5)',
    vector: q.add(BASIS.TRS, [0, 0]),
  },
  {
    id: 2, name: 'MUL',
    rule: '[ac+ad+bc, ac+bd]',
    meaning: '(aφ+b)(cφ+d)  via φ²=φ+1',
    domain: 'Q(√5) × Q(√5) → Q(√5)',
    vector: q.mul(BASIS.PHI, BASIS.PHI),  // φ² = φ+1 = [1,1]
  },
  {
    id: 3, name: 'SIGMA',
    rule: '[-a, a+b]',
    meaning: 'σ(aφ+b): Galois conjugation φ→-1/φ=1-φ',
    domain: 'Q(√5) → Q(√5)',
    vector: q.sigma(BASIS.TRS),
  },
  {
    id: 4, name: 'NORM',
    rule: 'B²+AB-A²  ∈  Q',
    meaning: 'N(aφ+b) = b²+ab-a²: rational meeting point',
    domain: 'Q(√5) → Q',
    vector: [0, q.norm(BASIS.TRS)],
  },
  {
    id: 5, name: 'PHI_WEIGHT',
    rule: '[F(n), F(n-1)]',
    meaning: 'φⁿ = F(n)φ + F(n-1)  Fibonacci encoding',
    domain: 'ℕ → Q(√5)',
    vector: q.phi_pow(6),  // φ⁶ = 8φ+5  (METATRON depth)
  },
  {
    id: 6, name: 'TRS',
    rule: 'Σ_s Σ_n bias_s(n) × φ^(depth_n+1)',
    meaning: 'Total Resonance Sum = 174.4φ + 106.8',
    domain: 'Bias × Depth → Q(√5)',
    vector: BASIS.TRS,
  },
  {
    id: 7, name: 'RECOVER_PHI',
    rule: '(TRS - B) ÷ A  where TRS = Aφ+B',
    meaning: 'φ is recoverable from TRS: φ = (TRS-106.8)/174.4',
    domain: 'Q(√5) → Q(√5)',
    vector: q.div(q.sub(BASIS.TRS, [0, 106.8]), [0, 174.4]),
  },
]

// ── Countdown ─────────────────────────────────────────────────────────────────
// Given source elements and ops, reach a target in Q(√5).

function countdown(sources, target, label) {
  console.log(`\n  COUNTDOWN: reach ${label}`)
  console.log(`  Target:  [${target.map(x=>x.toFixed(4)).join(', ')}]  ≈ ${q.eval(target).toFixed(6)}`)

  const steps = []
  let acc = sources[0].val

  for (const src of sources) {
    const res = src.op ? src.op(acc, src.val) : src.val
    acc = res
    steps.push({ expr: src.expr, result: res, val: q.eval(res).toFixed(6) })
    console.log(`    ${src.expr.padEnd(36)} = [${res.map(x=>x.toFixed(3)).join(', ')}]  ≈ ${q.eval(res).toFixed(6)}`)
  }

  const final = steps[steps.length - 1].result
  const hit = Math.abs(q.eval(final) - q.eval(target)) < 1e-6
  console.log(`  ${hit ? 'HIT' : 'MISS'}  →  ${q.fmt(final)}`)
  return { steps, hit, vector: final }
}

// ── Play ──────────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════════╗')
console.log('║  SNAPKITTY ALGEBRA — Countdown + LMG Vector             ║')
console.log('║  Field: Q(√5)   Element: aφ + b   Ops: +×σN            ║')
console.log('║  BOW-Ω-φ-∂-2026                                         ║')
console.log('╚══════════════════════════════════════════════════════════╝')

// Round 1: Build TRS from the four Sumerian symbols
console.log('\n══ ROUND 1: ME + AN + KI + DI = TRS ══')
countdown([
  { val: BASIS.ME, expr: 'ME' },
  { val: BASIS.AN, expr: 'ME + AN', op: (a,b) => q.add(a,b) },
  { val: BASIS.KI, expr: 'ME + AN + KI', op: (a,b) => q.add(a,b) },
  { val: BASIS.DI, expr: 'ME + AN + KI + DI', op: (a,b) => q.add(a,b) },
], BASIS.TRS, 'TRS')

// Round 2: Shadow operator on TRS
console.log('\n══ ROUND 2: σ(TRS) = shadow ══')
countdown([
  { val: BASIS.TRS, expr: 'TRS' },
  { val: q.sigma(BASIS.TRS), expr: 'σ(TRS)', op: (_,v) => v },
], q.sigma(BASIS.TRS), 'σ(TRS)')

// Round 3: Norm = rational meeting point
console.log('\n══ ROUND 3: TRS × σ(TRS) = N(TRS) ∈ Q ══')
const norm_val = [0, q.norm(BASIS.TRS)]
countdown([
  { val: BASIS.TRS, expr: 'TRS' },
  { val: q.sigma(BASIS.TRS), expr: 'σ(TRS)', op: (_,v) => v },
  { val: norm_val, expr: 'TRS × σ(TRS)', op: (a,b) => [0, q.norm(BASIS.TRS)] },
], norm_val, 'N(TRS)')

// Round 4: Recover φ from TRS
console.log('\n══ ROUND 4: (TRS − 106.8) ÷ 174.4 = φ ══')
const phi_check = q.div(q.sub(BASIS.TRS, [0, 106.8]), [0, 174.4])
countdown([
  { val: BASIS.TRS, expr: 'TRS' },
  { val: q.sub(BASIS.TRS,[0,106.8]), expr: 'TRS − 106.8', op: (a,_) => q.sub(a,[0,106.8]) },
  { val: phi_check, expr: '(TRS − 106.8) ÷ 174.4', op: (a,_) => q.div(a,[0,174.4]) },
], BASIS.PHI, 'φ')

// ── LMG Vector output ─────────────────────────────────────────────────────────

console.log('\n══ LMG VECTOR ══')
console.log('  id  name           vector            value')
console.log('  ' + '─'.repeat(58))
const LMG_VECTOR = LMG.map(rule => {
  const val = q.eval(rule.vector)
  console.log(`  ${String(rule.id).padEnd(4)}${rule.name.padEnd(15)}[${rule.vector.map(x=>String(x).padStart(8)).join(',')}]  ${val.toFixed(6)}`)
  return { ...rule, numeric: val }
})

console.log('\n  Formula for LMG (SnapKitty Algebra Grammar):')
console.log('  S → ELEMENT | ADD(S,S) | MUL(S,S) | SIGMA(S) | NORM(S) | PHI_WEIGHT(n)')
console.log('  ELEMENT → [a, b]  where a,b ∈ Q')
console.log('  NORM(S) → Q  (rational — the bridge)')
console.log('  σ∘σ = id  (involution)')
console.log('  MUL(PHI, PHI) = [1,1] = φ+1  (φ²=φ+1, the sovereign law)')
console.log('\n  Basis vector for LMG:')
console.log(' ', JSON.stringify(LMG_VECTOR.map(r => [r.id, r.name, r.vector])))

export { q, BASIS, LMG, LMG_VECTOR }
