import {
  AQI_CATEGORIES,
  AQI_MAX,
  CPCB_BREAKPOINTS,
  O3_HOURLY_TO_8H,
  PM25_PER_CIGARETTE,
} from "@/lib/constants";
import type { AirReading, AqiCategory, AqiResult, Pollutant } from "@/lib/types";

const POLLUTANTS: readonly Pollutant[] = ["pm25", "pm10", "no2", "o3"];

/**
 * CPCB sub-index for one pollutant by linear interpolation within its breakpoint segment.
 * Concentrations beyond the last segment are capped at {@link AQI_MAX}.
 */
export function subIndex(pollutant: Pollutant, concentration: number): number {
  const c = Math.max(0, concentration);
  for (const bp of CPCB_BREAKPOINTS[pollutant]) {
    if (c <= bp.cHigh) {
      const ratio = (c - bp.cLow) / (bp.cHigh - bp.cLow);
      return Math.round(bp.iLow + ratio * (bp.iHigh - bp.iLow));
    }
  }
  return AQI_MAX;
}

/** Maps an AQI value to its CPCB category. */
export function categorize(aqi: number): AqiCategory {
  for (const { category, max } of AQI_CATEGORIES) {
    if (aqi <= max) return category;
  }
  return "severe";
}

/** Zero-based severity rank of a category (good = 0 … severe = 5). */
export function categoryRank(category: AqiCategory): number {
  return AQI_CATEGORIES.findIndex((c) => c.category === category);
}

/**
 * Overall CPCB AQI for a reading: the maximum sub-index across available pollutants.
 * Returns `null` when no pollutant is reported.
 *
 * Note: CPCB defines PM sub-indices on 24-hour averages; applying them to hourly values
 * gives an "instantaneous" AQI, which is what people need to plan the next few hours.
 */
export function computeAqi(reading: Pick<AirReading, Pollutant>): AqiResult | null {
  let best: { value: number; dominant: Pollutant } | null = null;
  for (const pollutant of POLLUTANTS) {
    const c = reading[pollutant];
    if (c === null || !Number.isFinite(c)) continue;
    const value = subIndex(pollutant, pollutant === "o3" ? c * O3_HOURLY_TO_8H : c);
    if (best === null || value > best.value) best = { value, dominant: pollutant };
  }
  return best && { ...best, category: categorize(best.value) };
}

/** AQI from PM2.5 alone, used when ranking forecast hours. */
export function pm25Aqi(pm25: number): AqiResult {
  const value = subIndex("pm25", pm25);
  return { value, category: categorize(value), dominant: "pm25" };
}

/** Breathing this PM2.5 for a day ≈ smoking this many cigarettes (one decimal). */
export function cigarettesEquivalent(pm25: number): number {
  return Math.round((Math.max(0, pm25) / PM25_PER_CIGARETTE) * 10) / 10;
}
