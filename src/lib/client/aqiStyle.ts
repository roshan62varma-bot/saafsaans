import type { AqiCategory, RiskLevel } from "@/lib/types";

/**
 * Visual treatment per AQI category. Colour is never the only cue: every use also shows
 * the text label and a distinct shape, so the scale works for colour-blind users.
 */
export const AQI_STYLE: Record<AqiCategory, { badge: string; bar: string; shape: string }> = {
  good: { badge: "aqi-good", bar: "fill-aqi-good", shape: "●" },
  satisfactory: { badge: "aqi-satisfactory", bar: "fill-aqi-satisfactory", shape: "◐" },
  moderate: { badge: "aqi-moderate", bar: "fill-aqi-moderate", shape: "▲" },
  poor: { badge: "aqi-poor", bar: "fill-aqi-poor", shape: "◆" },
  very_poor: { badge: "aqi-very-poor", bar: "fill-aqi-very-poor", shape: "■" },
  severe: { badge: "aqi-severe", bar: "fill-aqi-severe", shape: "✖" },
};

export const RISK_STYLE: Record<RiskLevel, { label: string; badge: string }> = {
  low: { label: "Low risk", badge: "aqi-good" },
  moderate: { label: "Moderate risk", badge: "aqi-moderate" },
  high: { label: "High risk", badge: "aqi-poor" },
  very_high: { label: "Very high risk", badge: "aqi-severe" },
};
