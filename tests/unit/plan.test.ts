import { describe, expect, it } from "vitest";
import { buildFacts } from "@/lib/engine/facts";
import { buildRulePlan, exposureAvoidedUg } from "@/lib/engine/routine";
import type { FactSheet, TimeWindow } from "@/lib/types";
import { NOW, makeAir, makeHourly, makeProfile, reading } from "../fixtures";

const win = (
  avgPm25: number,
  category: TimeWindow["aqi"]["category"] = "moderate",
): TimeWindow => ({
  start: "2026-11-17T13:00",
  end: "2026-11-17T15:00",
  avgPm25,
  aqi: { value: 150, category, dominant: "pm25" },
});

describe("buildFacts", () => {
  const facts = buildFacts(makeProfile(), makeAir(), NOW);

  it("computes current AQI, cigarette equivalence and the forecast peak", () => {
    expect(facts.place).toBe("New Delhi");
    expect(facts.pm25).toBe(250);
    expect(facts.aqi).toEqual({ value: 400, category: "very_poor", dominant: "pm25" });
    expect(facts.cigarettesPerDay).toBe(11.4);
    expect(facts.peakAqi.value).toBeGreaterThan(facts.aqi.value);
  });

  it("assesses every household member", () => {
    expect(facts.memberRisks.map((r) => r.label)).toEqual(["Me", "Aarav", "Dadi"]);
    expect(facts.memberRisks.every((r) => r.level === "very_high")).toBe(true);
  });

  it("includes commute swaps, indoor hacks, household swaps and purifier sizing", () => {
    expect(facts.commuteSwaps[0]?.to).toBe("metro");
    expect(facts.indoorHacks.length).toBeGreaterThan(0);
    expect(facts.householdSwaps.length).toBeGreaterThan(0);
    expect(facts.purifier.recommendedCadrM3h).toBe(160);
  });

  it("falls back to PM2.5 when other pollutants are missing and keeps the current AQI as peak when higher", () => {
    const air = makeAir({
      current: reading("2026-11-17T08:00", null, { pm10: null, no2: null, o3: null }),
      hourly: makeHourly(() => 10),
    });
    const f = buildFacts(makeProfile(), air, NOW);
    expect(f.pm25).toBe(0);
    expect(f.aqi).toEqual({ value: 0, category: "good", dominant: "pm25" });
    expect(f.peakAqi.value).toBe(17);
  });

  it("keeps the current AQI as peak when it exceeds the forecast", () => {
    const air = makeAir({ hourly: makeHourly(() => 20) });
    const f = buildFacts(makeProfile(), air, NOW);
    expect(f.peakAqi).toEqual(f.aqi);
  });
});

describe("exposureAvoidedUg", () => {
  it("is the PM2.5 difference × breathing rate × hours", () => {
    expect(exposureAvoidedUg(win(250), win(100), 1)).toBe(270);
    expect(exposureAvoidedUg(win(250), win(100), 2, 1)).toBe(300);
  });

  it("is zero when a window is unknown or the best is not cleaner", () => {
    expect(exposureAvoidedUg(null, win(100), 1)).toBe(0);
    expect(exposureAvoidedUg(win(100), null, 1)).toBe(0);
    expect(exposureAvoidedUg(win(50), win(100), 1)).toBe(0);
  });
});

describe("buildRulePlan", () => {
  const profile = makeProfile();
  const facts = buildFacts(profile, makeAir(), NOW);

  it("produces a complete, quantified plan", () => {
    const plan = buildRulePlan(facts, profile);
    expect(plan.headline).toBe("Very Poor air in New Delhi (AQI 400)");
    expect(plan.summary).toMatch(/11.4 cigarettes/);
    expect(plan.summary).toMatch(/very high/);
    expect(plan.routine.map((b) => b.activity)).toEqual([
      "Keep the house sealed in the morning",
      "Safer school run",
      "Try metro instead of petrol car",
      "Exercise indoors",
      "Air out the home",
      "Cook with the exhaust on",
      "Sleep in the clean room",
    ]);
    expect(plan.routine.every((b) => b.impact.length > 0)).toBe(true);
    expect(plan.memberNotes).toHaveLength(3);
    expect(plan.topActions).toHaveLength(3);
  });

  it("schedules outdoor exercise in the best window when air allows", () => {
    const clean: FactSheet = {
      ...facts,
      aqi: { value: 150, category: "moderate", dominant: "pm25" },
      bestWindow: win(70),
      worstWindow: win(200),
    };
    const block = buildRulePlan(clean, profile).routine.find(
      (b) => b.activity === "Outdoor exercise or play",
    );
    expect(block?.time).toBe("13:00–15:00");
    expect(block?.impact).toBe(
      "About 234 µg less PM2.5 inhaled per hour than in the dirtiest window.",
    );
  });

  it("keeps exercise indoors when even the best window is poor", () => {
    const f: FactSheet = {
      ...facts,
      aqi: { value: 150, category: "moderate", dominant: "pm25" },
      bestWindow: win(100, "poor"),
    };
    expect(buildRulePlan(f, profile).routine.some((b) => b.activity === "Exercise indoors")).toBe(
      true,
    );
  });

  it("handles households without children, commute or forecast windows", () => {
    const adultsOnly = makeProfile({
      members: [{ id: "a", label: "Me", ageGroup: "adult", conditions: [] }],
      commute: { mode: "none", distanceKm: 0, daysPerWeek: 0 },
    });
    const f = buildFacts(adultsOnly, makeAir({ hourly: [] }), NOW);
    const plan = buildRulePlan(f, adultsOnly);
    const activities = plan.routine.map((b) => b.activity);
    expect(activities).not.toContain("Safer school run");
    expect(activities).not.toContain("Air out the home");
    expect(activities.some((a) => a.startsWith("Try"))).toBe(false);
    expect(plan.routine[0]?.impact).toBe("Avoids letting the morning smog peak indoors.");
    expect(plan.topActions.map((a) => a.action)).not.toContain("Commute by metro");
  });

  it("acknowledges an already-clean commute", () => {
    const cyclist = makeProfile({ commute: { mode: "walk", distanceKm: 1, daysPerWeek: 5 } });
    const f = buildFacts(cyclist, makeAir(), NOW);
    const block = buildRulePlan(f, cyclist).routine.find((b) => b.time === "Commute");
    expect(block?.impact).toBe("No cleaner swap available for your route.");
  });

  it("omits the personal-exposure clause when a swap raises exposure", () => {
    const f: FactSheet = {
      ...facts,
      commuteSwaps: [
        {
          from: "car_petrol",
          to: "cycle",
          weeklyCo2KgSaved: 10,
          weeklyPmGramsSaved: 1,
          exposureChangePct: 40,
        },
      ],
    };
    const block = buildRulePlan(f, profile).routine.find((b) => b.time === "Commute");
    expect(block?.impact).toBe("Saves 10 kg CO2 and 1 g PM2.5 a week.");
  });

  it("drops empty top actions", () => {
    const f: FactSheet = { ...facts, indoorHacks: [], commuteSwaps: [], householdSwaps: [] };
    expect(buildRulePlan(f, profile).topActions).toEqual([]);
  });
});
