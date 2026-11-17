import {
  ACTIVE_MODE_MAX_KM,
  ALTERNATIVE_MODES,
  EXERCISE_BREATHING_M3H,
  HOUSEHOLD_CO2_KG_PER_WEEK,
  HOUSEHOLD_PM_G_PER_WEEK,
  MODE_FACTORS,
  TREE_CO2_KG_PER_YEAR,
} from "@/lib/constants";
import type {
  Commute,
  CommuteMode,
  CommuteSwap,
  HouseholdSwap,
  Profile,
  TimeWindow,
} from "@/lib/types";

const WEEKS_PER_YEAR = 52;
const CAR_MODES: readonly CommuteMode[] = ["car_petrol", "car_diesel"];

/** Rounds to a fixed number of decimals (default 1). */
export function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** PM2.5 (µg) inhaled per hour of moderate outdoor exercise at this concentration. */
export function exerciseDoseUg(pm25: number): number {
  return Math.round(Math.max(0, pm25) * EXERCISE_BREATHING_M3H);
}

/** PM2.5 (µg) not inhaled by moving an activity from the worst to the best window. */
export function exposureAvoidedUg(
  worst: TimeWindow | null,
  best: TimeWindow | null,
  hours: number,
  breathingM3h = EXERCISE_BREATHING_M3H,
): number {
  if (!worst || !best) return 0;
  return Math.max(0, Math.round((worst.avgPm25 - best.avgPm25) * breathingM3h * hours));
}

/** PM2.5 inhaled on one one-way trip, µg. */
export function tripDoseUg(mode: CommuteMode, distanceKm: number, ambientPm25: number): number {
  const f = MODE_FACTORS[mode];
  const hours = distanceKm / f.speedKmh;
  return ambientPm25 * f.exposureRatio * f.breathingM3h * hours;
}

/** Weekly CO2 (kg) and PM2.5 (g) emitted by a commute pattern (round trips). */
export function weeklyCommuteEmissions(
  mode: CommuteMode,
  distanceKm: number,
  daysPerWeek: number,
): { co2Kg: number; pmG: number } {
  const km = distanceKm * 2 * daysPerWeek;
  const f = MODE_FACTORS[mode];
  return { co2Kg: f.co2KgPerKm * km, pmG: f.pmGPerKm * km };
}

/** Whether a mode is a realistic alternative for this commute. */
export function isFeasibleAlternative(
  from: CommuteMode,
  to: CommuteMode,
  distanceKm: number,
): boolean {
  if (to === from) return false;
  if (to === "walk") return distanceKm <= ACTIVE_MODE_MAX_KM.walk;
  if (to === "cycle") return distanceKm <= ACTIVE_MODE_MAX_KM.cycle;
  if (to === "car_ev") return CAR_MODES.includes(from);
  return true;
}

/** Quantified effect of switching from the current commute mode to `to`. */
export function compareModes(commute: Commute, to: CommuteMode, ambientPm25: number): CommuteSwap {
  const { mode: from, distanceKm, daysPerWeek } = commute;
  const before = weeklyCommuteEmissions(from, distanceKm, daysPerWeek);
  const after = weeklyCommuteEmissions(to, distanceKm, daysPerWeek);
  const doseBefore = tripDoseUg(from, distanceKm, ambientPm25);
  const doseAfter = tripDoseUg(to, distanceKm, ambientPm25);
  return {
    from,
    to,
    weeklyCo2KgSaved: round(before.co2Kg - after.co2Kg),
    weeklyPmGramsSaved: round(before.pmG - after.pmG, 2),
    exposureChangePct:
      doseBefore > 0 ? Math.round(((doseAfter - doseBefore) / doseBefore) * 100) : 0,
  };
}

/**
 * Cleaner commute options that actually cut emissions, best CO2 saving first.
 * Returns an empty list for people who do not commute.
 */
export function commuteSwaps(commute: Commute, ambientPm25: number): CommuteSwap[] {
  if (commute.mode === "none" || commute.distanceKm <= 0 || commute.daysPerWeek <= 0) return [];
  return ALTERNATIVE_MODES.filter((to) =>
    isFeasibleAlternative(commute.mode, to, commute.distanceKm),
  )
    .map((to) => compareModes(commute, to, ambientPm25))
    .filter((s) => s.weeklyCo2KgSaved > 0 || s.weeklyPmGramsSaved > 0)
    .sort((a, b) => b.weeklyCo2KgSaved - a.weeklyCo2KgSaved);
}

/** Number of mature trees needed to absorb this much CO2 over a year. */
export function treesEquivalent(weeklyCo2Kg: number): number {
  return Math.round((weeklyCo2Kg * WEEKS_PER_YEAR) / TREE_CO2_KG_PER_YEAR);
}

/** Household-level swaps relevant to this profile, largest PM2.5 cut first. */
export function householdSwaps(profile: Pick<Profile, "cookingFuel">): HouseholdSwap[] {
  const cooking = cleanCookingSwap(profile.cookingFuel);
  return [...(cooking ? [cooking] : []), ...UNIVERSAL_SWAPS].sort(
    (a, b) => b.weeklyPmGramsSaved - a.weeklyPmGramsSaved,
  );
}

/** Swap to gas or induction, only for households that cook with solid fuel or kerosene. */
function cleanCookingSwap(fuel: Profile["cookingFuel"]): HouseholdSwap | null {
  if (fuel !== "biomass" && fuel !== "kerosene") return null;
  const before = fuel === "biomass" ? PM.biomassCooking : PM.keroseneCooking;
  const saved = round(before - PM.gasCooking);
  return {
    id: "clean-cooking",
    title: "Switch to LPG / PNG or induction cooking",
    change: `Replace ${fuel} with gas or electric cooking (PM Ujjwala Yojana offers subsidised LPG).`,
    weeklyPmGramsSaved: saved,
    weeklyCo2KgSaved: 0,
    impact: `Cuts about ${saved} g of PM2.5 a week released inside your kitchen — the single biggest indoor source.`,
  };
}

const PM = HOUSEHOLD_PM_G_PER_WEEK;
const CO2 = HOUSEHOLD_CO2_KG_PER_WEEK;

/** Swaps that apply to every household. */
const UNIVERSAL_SWAPS: readonly HouseholdSwap[] = [
  {
    id: "no-open-burning",
    title: "Compost or hand over leaves and waste — never burn",
    change:
      "Use the society compost pit or municipal pickup instead of burning dry leaves or garbage.",
    weeklyPmGramsSaved: PM.openBurning,
    weeklyCo2KgSaved: CO2.openBurning,
    impact: `Avoids about ${PM.openBurning} g of PM2.5 a week at street level, where children walk to school.`,
  },
  {
    id: "inverter-not-genset",
    title: "Use an inverter battery instead of a diesel generator",
    change:
      "Run essential loads on an inverter during power cuts; GRAP bans diesel gensets in severe smog.",
    weeklyPmGramsSaved: PM.dieselGenerator,
    weeklyCo2KgSaved: CO2.dieselGenerator,
    impact: `Avoids about ${PM.dieselGenerator} g of PM2.5 and ${CO2.dieselGenerator} kg of CO2 a week.`,
  },
  {
    id: "no-mosquito-coil",
    title: "Swap mosquito coils and incense for nets or plug-in repellents",
    change: "Use bed nets, window mesh or electric vaporisers indoors.",
    weeklyPmGramsSaved: PM.mosquitoCoil,
    weeklyCo2KgSaved: 0,
    impact:
      "One burning coil releases as much PM2.5 as roughly 100 cigarettes — inside a closed bedroom.",
  },
];
