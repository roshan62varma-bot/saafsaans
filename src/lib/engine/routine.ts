import { AQI_LABELS, MODE_FACTORS } from "@/lib/constants";
import { categoryRank } from "@/lib/engine/aqi";
import { round } from "@/lib/engine/impact";
import { householdRisk } from "@/lib/engine/risk";
import { windowSpan as span } from "@/lib/engine/windows";
import type { FactSheet, Plan, Profile, RoutineBlock } from "@/lib/types";

const POOR_RANK = categoryRank("poor");

function exerciseBlock(facts: FactSheet): RoutineBlock {
  const tooPolluted = categoryRank(facts.aqi.category) >= POOR_RANK;
  const best = facts.bestWindow;
  if (tooPolluted || !best || categoryRank(best.aqi.category) >= POOR_RANK) {
    return {
      time: "Any time",
      activity: "Exercise indoors",
      advice:
        "Do yoga, skipping or a home workout in your cleanest room instead of a run or walk outside.",
      why: "Hard exercise makes you breathe 3–4× more air, pulling much more PM2.5 deep into the lungs.",
      impact: `Skips roughly ${facts.exposure.outdoorExerciseUgPerHour} µg of PM2.5 per hour of outdoor exercise.`,
    };
  }
  return {
    time: span(best),
    activity: "Outdoor exercise or play",
    advice: `Schedule walks, runs and children's play for ${span(best)}, the cleanest window (PM2.5 ≈ ${best.avgPm25} µg/m³).`,
    why: "Pollution swings a lot within a day; timing alone changes how much you breathe in.",
    impact: `About ${facts.exposure.timingSavingUgPerHour} µg less PM2.5 inhaled per hour than in the dirtiest window.`,
  };
}

function commuteBlock(facts: FactSheet): RoutineBlock | null {
  const { commute } = facts;
  if (commute.mode === "none") return null;
  const swap = facts.commuteSwaps[0];
  const current = MODE_FACTORS[commute.mode].label;
  if (!swap) {
    return {
      time: "Commute",
      activity: `Commute by ${current.toLowerCase()}`,
      advice: "Keep it up, and avoid the most congested roads at peak hour.",
      why: "Your commute is already among the cleanest options for this distance.",
      impact: "No cleaner swap available for your route.",
    };
  }
  const exposure =
    swap.exposureChangePct < 0
      ? ` and lowers your own PM2.5 dose by ${Math.abs(swap.exposureChangePct)}%`
      : "";
  return {
    time: "Commute",
    activity: `Try ${MODE_FACTORS[swap.to].label.toLowerCase()} instead of ${current.toLowerCase()}`,
    advice: "Even switching two or three days a week makes a measurable difference.",
    why: "Vehicle exhaust is the largest local source of winter PM2.5 and NO2 in Indian cities.",
    impact: `Saves ${swap.weeklyCo2KgSaved} kg CO2 and ${swap.weeklyPmGramsSaved} g PM2.5 a week${exposure}.`,
  };
}

function morningBlock(facts: FactSheet): RoutineBlock {
  const worst = facts.worstWindow;
  return {
    time: "06:00–09:00",
    activity: "Keep the house sealed in the morning",
    advice: "Keep windows shut and run any purifier; postpone sweeping and outdoor chores.",
    why: "Cold, still morning air traps smoke near the ground — usually the dirtiest part of a winter day.",
    impact: worst
      ? `Dirtiest window ahead: ${span(worst)} at PM2.5 ≈ ${worst.avgPm25} µg/m³.`
      : "Avoids letting the morning smog peak indoors.",
  };
}

function schoolRunBlock(facts: FactSheet, profile: Profile): RoutineBlock | null {
  const hasChild = profile.members.some((m) => m.ageGroup === "child" || m.ageGroup === "infant");
  if (!hasChild) return null;
  return {
    time: "School run",
    activity: "Safer school run",
    advice:
      "Walk on side lanes away from traffic; in a car keep windows up with air on recirculate; children over 2 can wear a fitted N95.",
    why: "Children breathe faster and are closer to exhaust height, so roadside air hits them harder.",
    impact: `Roadside PM2.5 can be ${facts.reference.roadsideExcessPct}% higher than one street back.`,
  };
}

function ventilationBlock(facts: FactSheet): RoutineBlock | null {
  const window = facts.ventilationWindow;
  if (!window) return null;
  return {
    time: span(window),
    activity: "Air out the home",
    advice: "Open windows for 10–15 minutes, then close them again.",
    why: "Mid-day sunshine lifts the smog layer; this is when outdoor air is cleanest.",
    impact: `Forecast PM2.5 then: ≈ ${window.avgPm25} µg/m³ versus ${facts.pm25} now.`,
  };
}

const COOKING_BLOCK: RoutineBlock = {
  time: "19:00–21:00",
  activity: "Cook with the exhaust on",
  advice: "Run the chimney or exhaust fan, use lids and keep the kitchen door shut.",
  why: "Evening cooking adds to outdoor smog that is already building after sunset.",
  impact: "Halves the cooking smoke that spreads through the home.",
};

function sleepBlock(facts: FactSheet): RoutineBlock {
  const { purifier } = facts;
  return {
    time: "Night",
    activity: "Sleep in the clean room",
    advice: `Close the bedroom door and run a purifier of at least ${purifier.recommendedCadrM3h} m³/h CADR.`,
    why: "You spend about a third of the day asleep — the easiest hours to protect.",
    impact: `Bedroom PM2.5 ≈ ${purifier.indoorPm25With} instead of ${purifier.indoorPm25Without} µg/m³.`,
  };
}

/** The (up to) three changes with the largest quantified impact. */
function topActions(facts: FactSheet): Plan["topActions"] {
  const [hack] = facts.indoorHacks;
  const [swap] = facts.commuteSwaps;
  const [household] = facts.householdSwaps;
  const actions: Plan["topActions"] = [];
  if (hack) actions.push({ action: hack.title, impact: hack.impact });
  if (swap) {
    actions.push({
      action: `Commute by ${MODE_FACTORS[swap.to].label.toLowerCase()}`,
      impact: `${swap.weeklyCo2KgSaved} kg CO2 and ${swap.weeklyPmGramsSaved} g PM2.5 saved per week.`,
    });
  }
  if (household) actions.push({ action: household.title, impact: household.impact });
  return actions;
}

/** Builds a complete plan from facts alone — used when Gemini is unavailable. */
export function buildRulePlan(facts: FactSheet, profile: Profile): Plan {
  const routine = [
    morningBlock(facts),
    schoolRunBlock(facts, profile),
    commuteBlock(facts),
    exerciseBlock(facts),
    ventilationBlock(facts),
    COOKING_BLOCK,
    sleepBlock(facts),
  ].filter((block): block is RoutineBlock => block !== null);
  const risk = householdRisk(facts.memberRisks).replace("_", " ");

  return {
    headline: `${AQI_LABELS[facts.aqi.category]} air in ${facts.place} (AQI ${facts.aqi.value})`,
    summary: `Breathing today's air is like smoking about ${round(facts.cigarettesPerDay)} cigarettes a day. Your household risk is ${risk} — follow the plan below to cut your family's exposure.`,
    routine,
    memberNotes: facts.memberRisks.map((r) => ({
      member: r.label,
      advice: `${r.outdoorAdvice} ${r.maskAdvice}`,
    })),
    topActions: topActions(facts),
  };
}
