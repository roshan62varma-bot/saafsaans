import { MODE_FACTORS } from "@/lib/constants";
import { round, treesEquivalent } from "@/lib/engine/impact";
import type { CommuteSwap, HouseholdSwap } from "@/lib/types";

const WEEKS_PER_YEAR = 52;

/** Parses a typed number and clamps it into range; invalid input becomes `min`. */
export function clampInput(raw: string, min: number, max: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

export interface SwapSummary {
  yearlyCo2Kg: number;
  yearlyPmG: number;
  trees: number;
  /** Signed percentage label, e.g. `+12%` or `-44%`. */
  exposureLabel: string;
  message: string;
}

/** Yearly figures and a plain-language sentence for a commute comparison. */
export function summarizeSwap(swap: CommuteSwap): SwapSummary {
  const better = swap.weeklyCo2KgSaved > 0 || swap.weeklyPmGramsSaved > 0;
  const from = MODE_FACTORS[swap.from].label.toLowerCase();
  const to = MODE_FACTORS[swap.to].label.toLowerCase();
  let message = better
    ? `Switching from ${from} to ${to} saves ${swap.weeklyCo2KgSaved} kg CO2 and ${swap.weeklyPmGramsSaved} g PM2.5 every week.`
    : "That switch would not reduce emissions — try a cleaner option.";
  if (better && swap.exposureChangePct > 0) {
    message +=
      " Walking or cycling raises your own dose because you breathe harder — pick quieter streets and the cleanest hours.";
  }
  return {
    yearlyCo2Kg: round(swap.weeklyCo2KgSaved * WEEKS_PER_YEAR, 0),
    yearlyPmG: round(swap.weeklyPmGramsSaved * WEEKS_PER_YEAR, 0),
    trees: treesEquivalent(Math.max(0, swap.weeklyCo2KgSaved)),
    exposureLabel: `${swap.exposureChangePct > 0 ? "+" : ""}${swap.exposureChangePct}%`,
    message,
  };
}

/** Yearly total of the household swaps a family has pledged, as a sentence. */
export function summarizePledges(
  swaps: readonly HouseholdSwap[],
  pledged: ReadonlySet<string>,
): string {
  const chosen = swaps.filter((s) => pledged.has(s.id));
  if (chosen.length === 0) return "No pledges yet.";
  const pm = round(chosen.reduce((t, s) => t + s.weeklyPmGramsSaved, 0) * WEEKS_PER_YEAR, 0);
  const co2 = round(chosen.reduce((t, s) => t + s.weeklyCo2KgSaved, 0) * WEEKS_PER_YEAR, 0);
  const co2Part = co2 > 0 ? ` and ${co2} kg of CO2` : "";
  return `Your pledges keep about ${pm} g of PM2.5${co2Part} out of the air each year.`;
}
