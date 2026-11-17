/**
 * Shared domain types. Runtime validation lives in `@/lib/schemas`; these are the
 * compile-time shapes the engine, API routes and UI agree on.
 */

/** One hour of pollutant concentrations, all in µg/m³. `null` = not reported. */
export interface AirReading {
  /** Local wall-clock time at the location, ISO without offset, e.g. `2026-11-17T08:00`. */
  time: string;
  /** Unix epoch milliseconds for the same instant. */
  epoch: number;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  /** US EPA AQI as reported by the upstream model, for cross-reference. */
  usAqi: number | null;
}

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  region?: string;
}

/** Live + forecast air data for one place. */
export interface AirSnapshot {
  place: Place;
  timezone: string;
  current: AirReading;
  /** Hourly forecast, oldest first. */
  hourly: AirReading[];
  fetchedAt: number;
}

export type AqiCategory = "good" | "satisfactory" | "moderate" | "poor" | "very_poor" | "severe";

export type Pollutant = "pm25" | "pm10" | "no2" | "o3";

export interface AqiResult {
  /** CPCB National AQI value, 0–500. */
  value: number;
  category: AqiCategory;
  /** The pollutant with the highest sub-index. */
  dominant: Pollutant;
}

export type AgeGroup = "infant" | "child" | "adult" | "elderly";
export type HealthCondition = "asthma" | "copd" | "heart" | "pregnancy";

export interface Member {
  id: string;
  label: string;
  ageGroup: AgeGroup;
  conditions: HealthCondition[];
}

export type CommuteMode =
  | "walk"
  | "cycle"
  | "metro"
  | "bus"
  | "auto"
  | "two_wheeler"
  | "car_petrol"
  | "car_diesel"
  | "car_ev"
  | "none";

export type CookingFuel = "lpg" | "png" | "electric" | "biomass" | "kerosene";
export type HomeSealing = "leaky" | "average" | "sealed";
export type Budget = "low" | "medium" | "high";
export type Language = "en" | "hi";

export interface Commute {
  mode: CommuteMode;
  /** One-way distance in km. */
  distanceKm: number;
  daysPerWeek: number;
}

export interface Profile {
  place: Place;
  members: Member[];
  commute: Commute;
  cookingFuel: CookingFuel;
  hasPurifier: boolean;
  /** Bedroom floor area in m², used for purifier sizing. */
  bedroomAreaM2: number;
  sealing: HomeSealing;
  budget: Budget;
  language: Language;
}

export type RiskLevel = "low" | "moderate" | "high" | "very_high";

export interface MemberRisk {
  memberId: string;
  label: string;
  level: RiskLevel;
  /** Whether the member falls in a sensitive group (children, elderly, respiratory/heart, pregnancy). */
  sensitive: boolean;
  outdoorAdvice: string;
  maskAdvice: string;
}

/** A contiguous span of forecast hours. */
export interface TimeWindow {
  start: string;
  end: string;
  avgPm25: number;
  aqi: AqiResult;
}

export interface CommuteSwap {
  from: CommuteMode;
  to: CommuteMode;
  weeklyCo2KgSaved: number;
  weeklyPmGramsSaved: number;
  /** Percentage change in the commuter's own PM2.5 dose; negative = less exposure. */
  exposureChangePct: number;
}

export type Cost = "free" | "low" | "medium" | "high";

export interface IndoorHack {
  id: string;
  title: string;
  steps: string[];
  cost: Cost;
  /** Plain-language, quantified effect. */
  impact: string;
}

export interface HouseholdSwap {
  id: string;
  title: string;
  change: string;
  weeklyPmGramsSaved: number;
  weeklyCo2KgSaved: number;
  impact: string;
}

/**
 * Everything the deterministic engine knows. Shown in the UI directly and passed
 * to Gemini as the only allowed source of numbers.
 */
export interface FactSheet {
  place: string;
  localTime: string;
  aqi: AqiResult;
  pm25: number;
  cigarettesPerDay: number;
  usAqi: number | null;
  peakAqi: AqiResult;
  bestWindow: TimeWindow | null;
  worstWindow: TimeWindow | null;
  ventilationWindow: TimeWindow | null;
  memberRisks: MemberRisk[];
  commute: Commute;
  commuteSwaps: CommuteSwap[];
  indoorHacks: IndoorHack[];
  householdSwaps: HouseholdSwap[];
  purifier: PurifierAdvice;
  exposure: {
    /** µg PM2.5 inhaled per hour of outdoor exercise right now. */
    outdoorExerciseUgPerHour: number;
    /** µg PM2.5 avoided per hour by exercising in the best instead of the worst window. */
    timingSavingUgPerHour: number;
  };
  /** Cited constants the assistant may quote. */
  reference: {
    whoPm25Guideline: number;
    pm25PerCigarette: number;
    roadsideExcessPct: string;
  };
}

export interface PurifierAdvice {
  roomVolumeM3: number;
  recommendedCadrM3h: number;
  recommendedCadrCfm: number;
  indoorPm25Without: number;
  indoorPm25With: number;
}

export interface RoutineBlock {
  time: string;
  activity: string;
  advice: string;
  why: string;
  impact: string;
}

export interface Plan {
  headline: string;
  summary: string;
  routine: RoutineBlock[];
  memberNotes: { member: string; advice: string }[];
  topActions: { action: string; impact: string }[];
}

export type Source = "ai" | "rules";

export interface PlanResponse {
  plan: Plan;
  facts: FactSheet;
  source: Source;
}

export type Audience = "school" | "society" | "workplace" | "family_group";

export interface AdvisoryResponse {
  message: string;
  source: Source;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ForecastPoint {
  time: string;
  pm25: number;
  aqi: number;
  category: AqiCategory;
}

/** Fast, AI-free dashboard payload. */
export interface InsightsResponse {
  facts: FactSheet;
  forecast: ForecastPoint[];
}
