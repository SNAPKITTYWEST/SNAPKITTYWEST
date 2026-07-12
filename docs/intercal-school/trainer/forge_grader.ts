/**
 * forge_grader.ts
 * 
 * INTERCAL School Policy Chain:
 * NO PROOF -> NO SAT -> NO BORROW CHAIN -> NO INTERCAL PASS -> NO RECEIPT -> NO RELEASE
 * 
 * This module enforces the immutable certification gate.
 * All three conditions must pass: engineering threshold, politeness threshold, tripwire seal.
 * Failure in any dimension blocks certification and yields explicit reason.
 */

/**
 * Grades an engineering submission against INTERCAL School standards.
 * 
 * @param engineering - Score from 0 to 1 representing code quality, architecture, and rigor
 * @param politeness - Score from 0 to 1 representing communication clarity and collaboration
 * @param tripwire - Seal string; must equal "PASS" to authorize certification
 * @returns Object with certified boolean and reason string explaining any failure
 */
export function grade(
  engineering: number,
  politeness: number,
  tripwire: string
): { certified: boolean; reason: string } {
  if (engineering < 0.80) {
    return {
      certified: false,
      reason: "engineering score below 0.80 threshold",
    };
  }

  if (politeness < 0.80) {
    return {
      certified: false,
      reason: "politeness score below 0.80 threshold",
    };
  }

  if (tripwire !== "PASS") {
    return {
      certified: false,
      reason: "tripwire seal not engaged (expected PASS)",
    };
  }

  return {
    certified: true,
    reason: "all thresholds met; certification approved",
  };
}

export default grade;
