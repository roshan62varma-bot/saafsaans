/**
 * Hallucination guard: every significant number in a model answer must already exist
 * in the fact sheet the engine computed. Small counts ("2 hours", "10–15 minutes"),
 * clock times and well-known constants are allowed.
 */

/** Numbers that may appear without being in FACTS: N95, PM2.5, PM10, emergency 112, 24 h, 100%. */
const ALLOWED = new Set(["95", "2.5", "10", "2", "112", "15", "100", "24"]);
/** Anything up to this value counts as an everyday quantity rather than a data point. */
const SMALL_NUMBER = 20;

const NUMBER = /\d+(?:\.\d+)?/g;
/** Clock times such as 07:30 are scheduling, not data claims. */
const CLOCK_TIME = /\b\d{1,2}:\d{2}\b/g;

export function extractNumbers(text: string): string[] {
  return text.match(NUMBER) ?? [];
}

/** Returns numbers in `output` that are neither in `facts`, allowed, nor small. */
export function ungroundedNumbers(output: string, facts: string): string[] {
  const known = new Set(extractNumbers(facts));
  return [...new Set(extractNumbers(output.replace(CLOCK_TIME, " ")))].filter(
    (n) => !known.has(n) && !ALLOWED.has(n) && Number(n) > SMALL_NUMBER,
  );
}

/** Tolerates a couple of harmless misses (e.g. a re-phrased percentage) but rejects fabrication. */
export const MAX_UNGROUNDED = 2;

export function isGrounded(output: string, facts: string): boolean {
  return ungroundedNumbers(output, facts).length <= MAX_UNGROUNDED;
}
