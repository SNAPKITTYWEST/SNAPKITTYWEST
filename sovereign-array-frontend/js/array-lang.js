// Sovereign Array Language — browser reference implementation
// Denotational model (valid isomorphisms only):
//   Array I α  ≃  I → α            (dependent function, row-major storage)
//   Shape      ≃  finite type I    (number[] index space)
//   Broadcast  ≃  pullback π : J → I
//   VecOp      ≃  Π-map over I
// No Abjad, no digital root, no NP-magic.

export class SOVArray {
  constructor(shape, data) {
    this.shape = shape;
    this.data = data;
    if (this.prod(shape) !== data.length)
      throw new Error("SOVArray: shape/data size mismatch");
  }

  prod(s) { return s.reduce((a, b) => a * b, 1); }
  rank() { return this.shape.length; }
  size() { return this.data.length; }
  raw() { return this.data.slice(); }

  at(idx) { return this.data[this.stride(idx)]; }

  stride(idx) {
    if (idx.length !== this.shape.length) throw new Error("rank mismatch");
    let off = 0, st = 1;
    for (let d = this.shape.length; d-- > 0;) {
      off += idx[d] * st;
      st *= this.shape[d];
    }
    return off;
  }

  // pmap₂: pointwise binary op (the Π-map over the index space I)
  pmap2(op, other) {
    if (JSON.stringify(this.shape) !== JSON.stringify(other.shape))
      throw new Error("pmap2: shape mismatch");
    return new SOVArray(
      this.shape,
      this.data.map((x, i) => op(x, other.data[i]))
    );
  }
}

// Broadcasting = pullback along projection π : J → I (NumPy-style right-align)
export function broadcast(targetShape, v, w) {
  const out = new Array(v.prod(targetShape)).fill(0);
  const vRank = v.rank(), wRank = w.rank();
  for (let flat = 0; flat < out.length; ++flat) {
    const idx = unravel(flat, targetShape);
    const vi = idx.slice(targetShape.length - vRank);
    const wi = idx.slice(targetShape.length - wRank);
    out[flat] = v.at(vi) + w.at(wi);
  }
  return new SOVArray(targetShape, out);
}

// Softmax as Π-map: out_i = exp(v_i) / Σ_j exp(v_j)
export function softmax(v) {
  const s = v.data.reduce((a, x) => a + Math.exp(x), 0);
  return new SOVArray(v.shape, v.data.map(x => Math.exp(x) / s));
}

// NAND gate — universal boolean connective
export function nandGate(a, b) { return !(a && b); }

// Attention spec over floats: scores = q·k, weights = softmax(scores), out = w·v
export function nandAttention(q, k, v) {
  const n = q.shape[0];
  const scores = new Array(n).fill(0).map((_, i) =>
    new Array(n).fill(0).reduce((acc, _, j) => acc + q.at([i]) * k.at([j]), 0)
  );
  const w = softmax(new SOVArray([n], scores));
  const out = new Array(n).fill(0).map((_, i) =>
    new Array(n).fill(0).reduce((acc, _, j) => acc + w.at([i]) * v.at([j]), 0)
  );
  return new SOVArray([n], out);
}

function unravel(flat, shape) {
  const idx = new Array(shape.length).fill(0);
  let st = 1;
  for (let d = shape.length; d-- > 0;) {
    idx[d] = Math.floor(flat / st) % shape[d];
    st *= shape[d];
  }
  return idx;
}
