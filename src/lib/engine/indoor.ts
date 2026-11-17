import {
  AIR_EXCHANGE_PER_H,
  CEILING_HEIGHT_M,
  DEPOSITION_PER_H,
  M3H_PER_CFM,
  PENETRATION,
  TARGET_FILTERED_ACH,
} from "@/lib/constants";
import { windowSpan } from "@/lib/engine/windows";
import type {
  Budget,
  Cost,
  HomeSealing,
  IndoorHack,
  Profile,
  PurifierAdvice,
  TimeWindow,
} from "@/lib/types";

/**
 * Steady-state indoor PM2.5 from a single-zone mass balance:
 * C_in = P·a·C_out / (a + k + CADR/V)  (Riley et al., 2002).
 */
export function indoorPm25(
  outdoorPm25: number,
  sealing: HomeSealing,
  volumeM3: number,
  cadrM3h: number,
): number {
  const a = AIR_EXCHANGE_PER_H[sealing];
  return (PENETRATION * a * outdoorPm25) / (a + DEPOSITION_PER_H + cadrM3h / volumeM3);
}

/** Purifier size for a bedroom and the indoor PM2.5 it should achieve. */
export function purifierAdvice(
  bedroomAreaM2: number,
  sealing: HomeSealing,
  outdoorPm25: number,
): PurifierAdvice {
  const roomVolumeM3 = Math.round(bedroomAreaM2 * CEILING_HEIGHT_M);
  const recommendedCadrM3h = Math.round(roomVolumeM3 * TARGET_FILTERED_ACH);
  return {
    roomVolumeM3,
    recommendedCadrM3h,
    recommendedCadrCfm: Math.round(recommendedCadrM3h / M3H_PER_CFM),
    indoorPm25Without: Math.round(indoorPm25(outdoorPm25, sealing, roomVolumeM3, 0)),
    indoorPm25With: Math.round(indoorPm25(outdoorPm25, sealing, roomVolumeM3, recommendedCadrM3h)),
  };
}

const COST_RANK: Record<Cost, number> = { free: 0, low: 1, medium: 2, high: 3 };
const BUDGET_CEILING: Record<Budget, number> = { low: 1, medium: 2, high: 3 };

/** Whether a hack's cost fits within the family's budget. */
export function affordable(cost: Cost, budget: Budget): boolean {
  return COST_RANK[cost] <= BUDGET_CEILING[budget];
}

interface HackContext {
  profile: Profile;
  outdoorPm25: number;
  purifier: PurifierAdvice;
  ventilation: TimeWindow | null;
}

interface CatalogEntry {
  /** Higher = bigger expected effect for this household. */
  priority: (ctx: HackContext) => number;
  build: (ctx: HackContext) => IndoorHack;
}

const pct = (from: number, to: number) => (from > 0 ? Math.round(((from - to) / from) * 100) : 0);

const CATALOG: readonly CatalogEntry[] = [
  {
    priority: ({ profile }) => (profile.hasPurifier ? 9 : 5),
    build: ({ profile, purifier }) => ({
      id: "clean-room",
      title: profile.hasPurifier
        ? "Turn the bedroom into a clean room"
        : "Create one clean room with a HEPA purifier",
      steps: [
        "Pick the bedroom where the most vulnerable person sleeps; keep its door shut.",
        `Run a HEPA purifier rated at least ${purifier.recommendedCadrM3h} m³/h (${purifier.recommendedCadrCfm} CFM) CADR on high for 30 minutes, then on medium.`,
        "Replace the filter on schedule; a clogged filter can halve its output.",
      ],
      cost: profile.hasPurifier ? "free" : "high",
      impact: `In your ${profile.bedroomAreaM2} m² bedroom, indoor PM2.5 drops from about ${purifier.indoorPm25Without} to ${purifier.indoorPm25With} µg/m³ (−${pct(purifier.indoorPm25Without, purifier.indoorPm25With)}%).`,
    }),
  },
  {
    priority: ({ profile }) => (profile.hasPurifier ? 3 : 8),
    build: ({ purifier }) => ({
      id: "diy-box-fan",
      title: "Build a DIY box-fan filter",
      steps: [
        "Tape a MERV-13 (or better) filter to the intake side of a box or table fan; four filters in a cube work even better.",
        "Point the arrow on the filter towards the fan and seal edges with tape.",
        "Run it in the room you sleep in with the door closed.",
      ],
      cost: "low",
      impact: `A well-built unit delivers roughly 300–600 m³/h of clean air — enough for a ${purifier.roomVolumeM3} m³ room — at a fraction of a purifier's price.`,
    }),
  },
  {
    priority: ({ profile }) =>
      profile.sealing === "leaky" ? 8 : profile.sealing === "average" ? 5 : 1,
    build: ({ profile, outdoorPm25, purifier }) => {
      const before = indoorPm25(outdoorPm25, profile.sealing, purifier.roomVolumeM3, 0);
      const after = indoorPm25(outdoorPm25, "sealed", purifier.roomVolumeM3, 0);
      return {
        id: "seal-gaps",
        title: "Seal gaps around doors and windows",
        steps: [
          "Fit foam weather-strips on window frames and a door sweep under the main door.",
          "Fill visible cracks with silicone sealant; tape unused AC or exhaust openings at night.",
        ],
        cost: "low",
        impact: `Cuts the outdoor smog seeping in by about ${pct(before, after)}% (≈${Math.round(before)} → ${Math.round(after)} µg/m³ indoors).`,
      };
    },
  },
  {
    priority: ({ ventilation, outdoorPm25 }) =>
      ventilation && ventilation.avgPm25 < outdoorPm25 ? 7 : 4,
    build: ({ ventilation }) => ({
      id: "smart-ventilation",
      title: "Keep windows shut — air out only in the cleanest hour",
      steps: [
        ventilation
          ? `Open windows for 10–15 minutes around ${windowSpan(ventilation)}, when PM2.5 is forecast at ${ventilation.avgPm25} µg/m³.`
          : "Open windows for 10–15 minutes in the early afternoon, when smog usually lifts.",
        "Keep them closed in the early morning and after sunset, when cold air traps smoke near the ground.",
      ],
      cost: "free",
      impact: "Lets CO2 and cooking moisture out without letting the worst of the smog in.",
    }),
  },
  {
    priority: ({ profile }) =>
      profile.cookingFuel === "biomass" || profile.cookingFuel === "kerosene" ? 9 : 6,
    build: () => ({
      id: "kitchen-exhaust",
      title: "Run the kitchen exhaust and cover pans",
      steps: [
        "Switch on the chimney or exhaust fan before you light the stove and keep it on 10 minutes after.",
        "Use lids, avoid deep-frying on smog days, and keep the kitchen door closed while cooking.",
      ],
      cost: "free",
      impact:
        "Frying and tadka can push kitchen PM2.5 above 500 µg/m³; ventilated cooking cuts this by half or more.",
    }),
  },
  {
    priority: () => 6,
    build: () => ({
      id: "wet-cleaning",
      title: "Wet-mop instead of sweeping",
      steps: [
        "Damp-dust surfaces and wet-mop floors; dry sweeping throws settled dust back into the air.",
        "Leave shoes at the door and wash curtains every few weeks.",
      ],
      cost: "free",
      impact: "Stops settled smog particles being re-suspended and breathed in a second time.",
    }),
  },
  {
    priority: () => 5,
    build: () => ({
      id: "no-indoor-smoke",
      title: "No smoke indoors: incense, coils, candles, cigarettes",
      steps: [
        "Avoid agarbatti, dhoop, mosquito coils and candles on smog days.",
        "Never allow smoking inside the home or car.",
      ],
      cost: "free",
      impact:
        "These are concentrated PM2.5 sources released straight into the room you breathe in.",
    }),
  },
  {
    priority: () => 2,
    build: () => ({
      id: "plants-myth",
      title: "Myth check: houseplants do not clean smog",
      steps: [
        "Keep plants for wellbeing, but do not rely on them — you would need hundreds per room to match one purifier.",
      ],
      cost: "free",
      impact: "Puts your money and effort where it actually lowers PM2.5.",
    }),
  },
];

/** Indoor-air hacks that fit the family's budget, most effective first. */
export function indoorHacks(ctx: HackContext, limit = 6): IndoorHack[] {
  return CATALOG.map((entry) => ({ priority: entry.priority(ctx), hack: entry.build(ctx) }))
    .filter(({ hack }) => affordable(hack.cost, ctx.profile.budget))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
    .map(({ hack }) => hack);
}
