/**
 * Every number the engine relies on lives here, with its source, so estimates are
 * auditable and easy to update. Figures are deliberately conservative, rounded
 * estimates suitable for household decision-making — not regulatory reporting.
 */
import type { AqiCategory, CommuteMode, Pollutant } from "@/lib/types";

/** A linear AQI segment: concentrations [cLow, cHigh] map to index [iLow, iHigh]. */
export interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

/**
 * CPCB National Air Quality Index breakpoints (µg/m³), Central Pollution Control Board,
 * "National Air Quality Index" (2014). Segment boundaries are made contiguous so that
 * fractional concentrations interpolate without gaps.
 */
export const CPCB_BREAKPOINTS: Record<Pollutant, readonly Breakpoint[]> = {
  pm25: [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 30, cHigh: 60, iLow: 50, iHigh: 100 },
    { cLow: 60, cHigh: 90, iLow: 100, iHigh: 200 },
    { cLow: 90, cHigh: 120, iLow: 200, iHigh: 300 },
    { cLow: 120, cHigh: 250, iLow: 300, iHigh: 400 },
    { cLow: 250, cHigh: 500, iLow: 400, iHigh: 500 },
  ],
  pm10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 50, cHigh: 100, iLow: 50, iHigh: 100 },
    { cLow: 100, cHigh: 250, iLow: 100, iHigh: 200 },
    { cLow: 250, cHigh: 350, iLow: 200, iHigh: 300 },
    { cLow: 350, cHigh: 430, iLow: 300, iHigh: 400 },
    { cLow: 430, cHigh: 600, iLow: 400, iHigh: 500 },
  ],
  no2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 40, cHigh: 80, iLow: 50, iHigh: 100 },
    { cLow: 80, cHigh: 180, iLow: 100, iHigh: 200 },
    { cLow: 180, cHigh: 280, iLow: 200, iHigh: 300 },
    { cLow: 280, cHigh: 400, iLow: 300, iHigh: 400 },
    { cLow: 400, cHigh: 800, iLow: 400, iHigh: 500 },
  ],
  o3: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 50, cHigh: 100, iLow: 50, iHigh: 100 },
    { cLow: 100, cHigh: 168, iLow: 100, iHigh: 200 },
    { cLow: 168, cHigh: 208, iLow: 200, iHigh: 300 },
    { cLow: 208, cHigh: 748, iLow: 300, iHigh: 400 },
    { cLow: 748, cHigh: 1000, iLow: 400, iHigh: 500 },
  ],
};

export const AQI_MAX = 500;

/** Upper AQI bound (inclusive) of each CPCB category, in ascending order. */
export const AQI_CATEGORIES: readonly { category: AqiCategory; max: number }[] = [
  { category: "good", max: 50 },
  { category: "satisfactory", max: 100 },
  { category: "moderate", max: 200 },
  { category: "poor", max: 300 },
  { category: "very_poor", max: 400 },
  { category: "severe", max: AQI_MAX },
];

export const AQI_LABELS: Record<AqiCategory, string> = {
  good: "Good",
  satisfactory: "Satisfactory",
  moderate: "Moderate",
  poor: "Poor",
  very_poor: "Very Poor",
  severe: "Severe",
};

/** CPCB health-impact statements, abridged. */
export const AQI_HEALTH: Record<AqiCategory, string> = {
  good: "Minimal impact.",
  satisfactory: "Minor breathing discomfort for sensitive people.",
  moderate: "Breathing discomfort for people with lung or heart disease, children and older adults.",
  poor: "Breathing discomfort for most people on prolonged exposure.",
  very_poor: "Respiratory illness on prolonged exposure.",
  severe: "Affects healthy people and seriously impacts those with existing disease.",
};

/**
 * PM2.5 that is roughly equivalent to smoking one cigarette per day:
 * 22 µg/m³ over 24 h (Berkeley Earth, Muller & Muller, 2015).
 */
export const PM25_PER_CIGARETTE = 22;

/** WHO 2021 Air Quality Guideline, 24-hour PM2.5 (µg/m³). */
export const WHO_PM25_24H = 15;

/** Hours counted as "waking" when choosing outdoor windows (local time, inclusive start). */
export const WAKING_HOURS = { start: 6, end: 22 } as const;
/** Daytime hours suitable for airing the home (boundary layer is highest mid-day). */
export const VENTILATION_HOURS = { start: 11, end: 17 } as const;
export const OUTDOOR_WINDOW_HOURS = 2;
export const VENTILATION_WINDOW_HOURS = 1;
/** Look-ahead used for windows: today and tomorrow. */
export const FORECAST_LOOKAHEAD_HOURS = 36;

/** Per-mode transport factors. */
export interface ModeFactor {
  label: string;
  /** kg CO2e per passenger-km. */
  co2KgPerKm: number;
  /** g PM2.5 (exhaust + brake/tyre wear) per passenger-km. */
  pmGPerKm: number;
  /** Typical door-to-door urban speed, km/h. */
  speedKmh: number;
  /** In-transit PM2.5 relative to ambient (micro-environment ratio). */
  exposureRatio: number;
  /** Breathing rate during the trip, m³/h (adult). */
  breathingM3h: number;
}

/**
 * Sources: India GHG Platform transport emission factors (2015); ICCT India fleet
 * PM estimates; DMRC sustainability report (metro ≈ 0.02 kg/pkm); exposure ratios
 * from Goel et al., "On-road PM2.5 pollution exposure in multiple transport
 * microenvironments in Delhi", Atmospheric Environment (2015); breathing rates from
 * US EPA Exposure Factors Handbook (2011), ch. 6.
 */
export const MODE_FACTORS: Record<CommuteMode, ModeFactor> = {
  walk: {
    label: "Walking",
    co2KgPerKm: 0,
    pmGPerKm: 0,
    speedKmh: 5,
    exposureRatio: 1.1,
    breathingM3h: 1.3,
  },
  cycle: {
    label: "Cycling",
    co2KgPerKm: 0,
    pmGPerKm: 0,
    speedKmh: 12,
    exposureRatio: 1.1,
    breathingM3h: 2.0,
  },
  metro: {
    label: "Metro",
    co2KgPerKm: 0.02,
    pmGPerKm: 0.001,
    speedKmh: 30,
    exposureRatio: 0.65,
    breathingM3h: 0.6,
  },
  bus: {
    label: "Bus",
    co2KgPerKm: 0.03,
    pmGPerKm: 0.003,
    speedKmh: 16,
    exposureRatio: 1.2,
    breathingM3h: 0.6,
  },
  auto: {
    label: "Auto-rickshaw (CNG)",
    co2KgPerKm: 0.07,
    pmGPerKm: 0.006,
    speedKmh: 20,
    exposureRatio: 1.5,
    breathingM3h: 0.6,
  },
  two_wheeler: {
    label: "Two-wheeler",
    co2KgPerKm: 0.05,
    pmGPerKm: 0.02,
    speedKmh: 25,
    exposureRatio: 1.4,
    breathingM3h: 0.7,
  },
  car_petrol: {
    label: "Petrol car",
    co2KgPerKm: 0.17,
    pmGPerKm: 0.012,
    speedKmh: 22,
    exposureRatio: 0.85,
    breathingM3h: 0.6,
  },
  car_diesel: {
    label: "Diesel car",
    co2KgPerKm: 0.18,
    pmGPerKm: 0.05,
    speedKmh: 22,
    exposureRatio: 0.85,
    breathingM3h: 0.6,
  },
  car_ev: {
    label: "Electric car",
    co2KgPerKm: 0.09,
    pmGPerKm: 0.008,
    speedKmh: 22,
    exposureRatio: 0.85,
    breathingM3h: 0.6,
  },
  none: {
    label: "No commute / work from home",
    co2KgPerKm: 0,
    pmGPerKm: 0,
    speedKmh: 1,
    exposureRatio: 0,
    breathingM3h: 0,
  },
};

/** Modes offered as cleaner alternatives, in order of preference. */
export const ALTERNATIVE_MODES: readonly CommuteMode[] = [
  "metro",
  "bus",
  "cycle",
  "walk",
  "car_ev",
];

/** Longest one-way trip we suggest walking / cycling for, km. */
export const ACTIVE_MODE_MAX_KM = { walk: 2, cycle: 8 } as const;

/** Average CO2 absorbed by one mature tree per year, kg (EEA estimate). */
export const TREE_CO2_KG_PER_YEAR = 22;

/** Indoor air-mass-balance parameters (per hour). Sources: Riley et al. (2002); US EPA. */
export const AIR_EXCHANGE_PER_H = { leaky: 1.5, average: 0.8, sealed: 0.4 } as const;
export const DEPOSITION_PER_H = 0.2;
/** Fraction of outdoor PM2.5 that penetrates the building shell. */
export const PENETRATION = 0.8;
export const CEILING_HEIGHT_M = 2.7;
/** Target clean-air delivery: 5 air changes per hour of filtered air (AHAM/CARB guidance). */
export const TARGET_FILTERED_ACH = 5;
export const M3H_PER_CFM = 1.699;
/** CADR assumed for a typical household purifier when the family owns one, m³/h. */
export const TYPICAL_PURIFIER_CADR_M3H = 250;

/**
 * Household PM2.5 emission factors (g PM2.5 per week).
 * - Biomass cooking: ~8 g/kg fuel, ~3 kg/day (Smith et al., WHO household fuel review, 2014).
 * - Kerosene cooking/lighting: ~1 g/day (Lam et al., 2012).
 * - LPG/PNG: ~0.05 g/day.
 * - Open burning of leaves/waste: ~8 g/kg, ~2 kg/week of garden waste (Akagi et al., 2011).
 * - Mosquito coil: one coil ≈ PM of 75–137 cigarettes (Liu et al., 2003); ~0.4 g/coil.
 * - Small diesel generator: ~1 g/kWh, ~2 kWh/day during power cuts (CPCB DG-set norms).
 */
export const HOUSEHOLD_PM_G_PER_WEEK = {
  biomassCooking: 168,
  keroseneCooking: 7,
  gasCooking: 0.35,
  openBurning: 16,
  mosquitoCoil: 2.8,
  dieselGenerator: 14,
} as const;

/** Household CO2 factors (kg CO2 per week). Diesel: 2.68 kg/L, ~0.3 L/kWh. */
export const HOUSEHOLD_CO2_KG_PER_WEEK = {
  dieselGenerator: 11,
  openBurning: 3,
} as const;

/** Limits that bound user input and model calls. */
export const LIMITS = {
  maxMembers: 8,
  maxLabelLength: 40,
  maxPlaceNameLength: 80,
  maxDistanceKm: 100,
  maxBedroomAreaM2: 60,
  minBedroomAreaM2: 4,
  maxChatMessages: 12,
  maxChatMessageLength: 1000,
  maxQueryLength: 60,
} as const;

/** Cache lifetimes in milliseconds. */
export const CACHE_TTL = {
  air: 10 * 60 * 1000,
  geocode: 24 * 60 * 60 * 1000,
  plan: 30 * 60 * 1000,
  advisory: 30 * 60 * 1000,
} as const;

/** Rate limits for AI-backed endpoints: requests per IP per window. */
export const RATE_LIMIT = { windowMs: 60_000, max: 12 } as const;

export const UPSTREAM_TIMEOUT_MS = 8_000;
export const AI_TIMEOUT_MS = 20_000;
