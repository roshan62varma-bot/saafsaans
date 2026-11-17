import { categoryRank } from "@/lib/engine/aqi";
import type { AqiCategory, Member, MemberRisk, RiskLevel } from "@/lib/types";

/**
 * How much more vulnerable a member is than a healthy adult, in AQI-category steps.
 * Children breathe more air per kg of body weight; elderly people and those with
 * asthma, COPD, heart disease or pregnancy are recognised sensitive groups (WHO, CPCB).
 */
export function sensitivityBoost(member: Pick<Member, "ageGroup" | "conditions">): number {
  let boost = 0;
  if (member.ageGroup === "infant") boost += 2;
  else if (member.ageGroup === "child" || member.ageGroup === "elderly") boost += 1;
  if (member.conditions.includes("asthma") || member.conditions.includes("copd")) boost += 2;
  if (member.conditions.includes("heart")) boost += 1;
  if (member.conditions.includes("pregnancy")) boost += 1;
  return Math.min(boost, 2);
}

/** Severity order used to compare risk levels. */
export const RISK_RANK: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, very_high: 3 };

/**
 * Combines the AQI category with personal sensitivity into a single risk level.
 * Healthy adults reach "high" at Poor and "very high" at Very Poor; each boost step
 * shifts a sensitive person one category earlier.
 */
export function riskLevel(category: AqiCategory, boost: number): RiskLevel {
  const score = categoryRank(category) + boost;
  if (score <= 1) return "low";
  if (score === 2) return "moderate";
  if (score === 3) return "high";
  return "very_high";
}

const OUTDOOR_ADVICE: Record<RiskLevel, string> = {
  low: "Normal outdoor activity is fine.",
  moderate: "Keep outdoor exercise light and short; prefer the cleanest hours.",
  high: "Avoid outdoor exercise; limit time outside to essential trips in the cleanest window.",
  very_high: "Stay indoors in the cleanest room; go out only if essential.",
};

/** Mask guidance. Masks are unsafe for children under 2 (suffocation risk, per AAP/WHO). */
export function maskAdvice(member: Pick<Member, "ageGroup">, level: RiskLevel): string {
  if (member.ageGroup === "infant") {
    return "No masks under age 2 — keep the baby indoors with filtered air instead.";
  }
  if (level === "low") return "No mask needed.";
  if (level === "moderate") return "Carry a well-fitted N95 for traffic-heavy stretches.";
  return "Wear a well-fitted N95/FFP2 whenever outside; cloth and surgical masks do not stop PM2.5.";
}

/** Per-member risk assessment for the current AQI category. */
export function assessMember(member: Member, category: AqiCategory): MemberRisk {
  const boost = sensitivityBoost(member);
  const level = riskLevel(category, boost);
  return {
    memberId: member.id,
    label: member.label,
    level,
    sensitive: boost > 0,
    outdoorAdvice: OUTDOOR_ADVICE[level],
    maskAdvice: maskAdvice(member, level),
  };
}

/** Highest risk level in the household; drives the overall tone of advice. */
export function householdRisk(risks: readonly MemberRisk[]): RiskLevel {
  return risks.reduce<RiskLevel>(
    (worst, r) => (RISK_RANK[r.level] > RISK_RANK[worst] ? r.level : worst),
    "low",
  );
}
