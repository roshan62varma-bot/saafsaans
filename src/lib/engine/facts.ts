import { cigarettesEquivalent, computeAqi, pm25Aqi } from "@/lib/engine/aqi";
import { commuteSwaps, householdSwaps } from "@/lib/engine/impact";
import { indoorHacks, purifierAdvice } from "@/lib/engine/indoor";
import { assessMember } from "@/lib/engine/risk";
import { planWindows } from "@/lib/engine/windows";
import type { AirSnapshot, FactSheet, Profile } from "@/lib/types";

/**
 * Turns live air data and a family profile into the complete set of computed facts.
 * This is the single source of truth for every number the UI or the AI may show.
 */
export function buildFacts(profile: Profile, air: AirSnapshot, nowEpoch: number): FactSheet {
  const pm25 = Math.round(air.current.pm25 ?? 0);
  const aqi = computeAqi(air.current) ?? pm25Aqi(pm25);
  const windows = planWindows(air.hourly, nowEpoch);
  const purifier = purifierAdvice(profile.bedroomAreaM2, profile.sealing, pm25);
  const peak = pm25Aqi(Math.max(windows.peakPm25, pm25));

  return {
    place: air.place.name,
    localTime: air.current.time,
    aqi,
    pm25,
    cigarettesPerDay: cigarettesEquivalent(pm25),
    usAqi: air.current.usAqi,
    peakAqi: peak.value > aqi.value ? peak : aqi,
    bestWindow: windows.best,
    worstWindow: windows.worst,
    ventilationWindow: windows.ventilation,
    memberRisks: profile.members.map((m) => assessMember(m, aqi.category)),
    commute: profile.commute,
    commuteSwaps: commuteSwaps(profile.commute, pm25),
    indoorHacks: indoorHacks({
      profile,
      outdoorPm25: pm25,
      purifier,
      ventilation: windows.ventilation,
    }),
    householdSwaps: householdSwaps(profile),
    purifier,
  };
}
