// Front-end app logic for the Sovereign Array playground.
import { SOVArray, broadcast, softmax, nandGate, nandAttention } from "./array-lang.js";

const $ = (id) => document.getElementById(id);

function renderArray(a) {
  return a.shape.join("×") + " = [" + a.data.map(x => (Math.round(x * 1000) / 1000)).join(", ") + "]";
}

function demoPmap2() {
  const a = new SOVArray([2, 2], [1, 2, 3, 4]);
  const b = new SOVArray([2, 2], [10, 20, 30, 40]);
  const c = a.pmap2((x, y) => x + y, b);
  $("out-pmap2").textContent = renderArray(c);
}

function demoBroadcast() {
  const mat = new SOVArray([2, 3], [1, 2, 3, 4, 5, 6]);
  const row = new SOVArray([3], [10, 20, 30]);
  const bc = broadcast([2, 3], mat, row);
  $("out-broadcast").textContent = renderArray(bc);
}

function demoSoftmax() {
  const v = new SOVArray([4], [1, 2, 3, 4]);
  const sm = softmax(v);
  const sum = sm.data.reduce((a, x) => a + x, 0);
  $("out-softmax").textContent = renderArray(sm) + "  (Σ = " + (Math.round(sum * 1000) / 1000) + ")";
}

function demoNand() {
  const rows = [
    `nand(T,T) = ${nandGate(true, true)}`,
    `nand(T,F) = ${nandGate(true, false)}`,
    `nand(F,F) = ${nandGate(false, false)}`,
    `and(T,T) = ${nandGate(nandGate(true, true), nandGate(true, true))}`,
  ];
  $("out-nand").textContent = rows.join("\n");
}

function demoAttention() {
  const q = new SOVArray([3], [1, 0, 0]);
  const k = new SOVArray([3], [1, 1, 1]);
  const v = new SOVArray([3], [2, 4, 6]);
  const att = nandAttention(q, k, v);
  $("out-attention").textContent = renderArray(att);
}

function runAll() {
  demoPmap2();
  demoBroadcast();
  demoSoftmax();
  demoNand();
  demoAttention();
  $("status").textContent = "✅ All kernels executed — zero Abjad, zero digital root, zero NP-magic.";
}

window.addEventListener("DOMContentLoaded", () => {
  $("run").addEventListener("click", runAll);
  runAll();
});
