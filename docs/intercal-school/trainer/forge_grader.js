/**
 * forge_grader.js — runnable mirror of forge_grader.ts (the FORGE sovereign grader).
 *
 * INTERCAL School Policy Chain:
 * NO PROOF -> NO SAT -> NO BORROW CHAIN -> NO INTERCAL PASS -> NO RECEIPT -> NO RELEASE
 *
 * The TypeScript file is the ERE-verified canonical source (FORGE seal 7d5220...).
 * This JavaScript mirror carries the identical pure logic so the trainer can execute
 * the cross-check without a TS toolchain: `node forge_grader.js <eng> <pol> <tripwire>`.
 */
function grade(engineering, politeness, tripwire) {
  if (engineering < 0.80) {
    return { certified: false, reason: "engineering score below 0.80 threshold" };
  }
  if (politeness < 0.80) {
    return { certified: false, reason: "politeness score below 0.80 threshold" };
  }
  if (tripwire !== "PASS") {
    return { certified: false, reason: "tripwire seal not engaged (expected PASS)" };
  }
  return { certified: true, reason: "all thresholds met; certification approved" };
}

const [, , e, p, t] = process.argv;
if (e !== undefined) {
  const r = grade(Number(e), Number(p), String(t));
  console.log(JSON.stringify(r));
}

export { grade };
