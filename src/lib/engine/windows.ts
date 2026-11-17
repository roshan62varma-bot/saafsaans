import {
  FORECAST_LOOKAHEAD_HOURS,
  OUTDOOR_WINDOW_HOURS,
  VENTILATION_HOURS,
  VENTILATION_WINDOW_HOURS,
  WAKING_HOURS,
} from "@/lib/constants";
import { pm25Aqi } from "@/lib/engine/aqi";
import type { AirReading, TimeWindow } from "@/lib/types";

const HOUR_MS = 3_600_000;

type Pm25Reading = AirReading & { pm25: number };

/** Local hour of day (0–23) from a local ISO time such as `2026-11-17T08:00`. */
export function localHour(time: string): number {
  return Number(time.slice(11, 13));
}

/** Adds whole hours to a local ISO time string without involving the host time zone. */
export function addHours(time: string, hours: number): string {
  const shifted = new Date(Date.parse(`${time}:00Z`) + hours * HOUR_MS);
  return shifted.toISOString().slice(0, 16);
}

/** `08:00` style label for a local ISO time. */
export function hourLabel(time: string): string {
  return time.slice(11, 16);
}

/** Readings from the current hour up to the look-ahead horizon that report PM2.5. */
export function upcoming(
  hourly: readonly AirReading[],
  nowEpoch: number,
  lookaheadHours: number = FORECAST_LOOKAHEAD_HOURS,
): Pm25Reading[] {
  const from = nowEpoch - HOUR_MS;
  const to = nowEpoch + lookaheadHours * HOUR_MS;
  return hourly.filter((r): r is Pm25Reading => r.pm25 !== null && r.epoch > from && r.epoch <= to);
}

interface WindowOptions {
  length: number;
  hours: { start: number; end: number };
  pick: "best" | "worst";
}

/**
 * Finds the contiguous run of `length` hours, all inside the allowed local-hour range,
 * with the lowest (`best`) or highest (`worst`) mean PM2.5. Ties keep the earliest run.
 */
export function findWindow(
  readings: readonly Pm25Reading[],
  { length, hours, pick }: WindowOptions,
): TimeWindow | null {
  let chosen: { index: number; mean: number } | null = null;
  for (let i = 0; i + length <= readings.length; i++) {
    const run = readings.slice(i, i + length);
    if (!isValidRun(run, hours)) continue;
    const mean = run.reduce((sum, r) => sum + r.pm25, 0) / length;
    const better =
      pick === "best" ? mean < (chosen?.mean ?? Infinity) : mean > (chosen?.mean ?? -Infinity);
    if (better) chosen = { index: i, mean };
  }
  if (!chosen) return null;
  const first = readings[chosen.index] as Pm25Reading;
  const avgPm25 = Math.round(chosen.mean);
  return {
    start: first.time,
    end: addHours(first.time, length),
    avgPm25,
    aqi: pm25Aqi(avgPm25),
  };
}

function isValidRun(run: readonly Pm25Reading[], hours: { start: number; end: number }): boolean {
  return run.every((r, idx) => {
    const h = localHour(r.time);
    const inRange = h >= hours.start && h < hours.end;
    const contiguous = idx === 0 || r.epoch - (run[idx - 1] as Pm25Reading).epoch === HOUR_MS;
    return inRange && contiguous;
  });
}

/** Cleanest and dirtiest outdoor windows plus the best hour to air the home. */
export function planWindows(hourly: readonly AirReading[], nowEpoch: number) {
  const readings = upcoming(hourly, nowEpoch);
  return {
    best: findWindow(readings, { length: OUTDOOR_WINDOW_HOURS, hours: WAKING_HOURS, pick: "best" }),
    worst: findWindow(readings, {
      length: OUTDOOR_WINDOW_HOURS,
      hours: WAKING_HOURS,
      pick: "worst",
    }),
    ventilation: findWindow(readings, {
      length: VENTILATION_WINDOW_HOURS,
      hours: VENTILATION_HOURS,
      pick: "best",
    }),
    peakPm25: readings.reduce((max, r) => Math.max(max, r.pm25), 0),
  };
}
