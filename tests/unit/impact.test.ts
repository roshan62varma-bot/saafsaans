import { describe, expect, it } from "vitest";
import {
  commuteSwaps,
  compareModes,
  householdSwaps,
  isFeasibleAlternative,
  round,
  treesEquivalent,
  tripDoseUg,
  weeklyCommuteEmissions,
} from "@/lib/engine/impact";

describe("round", () => {
  it("rounds to the requested decimals", () => {
    expect(round(1.26)).toBe(1.3);
    expect(round(1.256, 2)).toBe(1.26);
  });
});

describe("weeklyCommuteEmissions", () => {
  it("counts round trips on each commuting day", () => {
    // 10 km × 2 × 5 days = 100 km; petrol car 0.17 kg/km, 0.012 g/km
    const e = weeklyCommuteEmissions("car_petrol", 10, 5);
    expect(e.co2Kg).toBeCloseTo(17);
    expect(e.pmG).toBeCloseTo(1.2);
  });
});

describe("tripDoseUg", () => {
  it("multiplies concentration, micro-environment ratio, breathing rate and time", () => {
    // metro: 30 km in 1 h, ratio 0.65, 0.6 m³/h → 100 × 0.65 × 0.6 × 1
    expect(tripDoseUg("metro", 30, 100)).toBeCloseTo(39);
  });
});

describe("isFeasibleAlternative", () => {
  it.each([
    ["car_petrol", "car_petrol", 5, false],
    ["car_petrol", "walk", 2, true],
    ["car_petrol", "walk", 3, false],
    ["bus", "cycle", 8, true],
    ["bus", "cycle", 9, false],
    ["car_diesel", "car_ev", 20, true],
    ["two_wheeler", "car_ev", 20, false],
    ["car_petrol", "metro", 40, true],
  ] as const)("%s → %s over %d km: %s", (from, to, km, expected) => {
    expect(isFeasibleAlternative(from, to, km)).toBe(expected);
  });
});

describe("compareModes", () => {
  it("quantifies CO2, PM and personal-exposure change", () => {
    const swap = compareModes({ mode: "car_petrol", distanceKm: 12, daysPerWeek: 5 }, "metro", 200);
    expect(swap.weeklyCo2KgSaved).toBe(18);
    expect(swap.weeklyPmGramsSaved).toBe(1.32);
    expect(swap.exposureChangePct).toBeLessThan(0);
  });

  it("reports zero exposure change when the starting dose is zero", () => {
    const swap = compareModes({ mode: "none", distanceKm: 5, daysPerWeek: 5 }, "walk", 200);
    expect(swap.exposureChangePct).toBe(0);
  });
});

describe("commuteSwaps", () => {
  it("lists cleaner, feasible modes with the biggest CO2 saving first", () => {
    const swaps = commuteSwaps({ mode: "car_petrol", distanceKm: 6, daysPerWeek: 5 }, 150);
    const modes = swaps.map((s) => s.to);
    expect(modes).toContain("cycle");
    expect(modes).not.toContain("walk");
    expect(swaps[0]?.weeklyCo2KgSaved).toBeGreaterThanOrEqual(swaps.at(-1)?.weeklyCo2KgSaved ?? 0);
  });

  it("drops options that would not cut emissions", () => {
    const swaps = commuteSwaps({ mode: "metro", distanceKm: 6, daysPerWeek: 5 }, 150);
    expect(swaps.map((s) => s.to)).toEqual(["cycle"]);
  });

  it.each([
    [{ mode: "none", distanceKm: 10, daysPerWeek: 5 }],
    [{ mode: "car_petrol", distanceKm: 0, daysPerWeek: 5 }],
    [{ mode: "car_petrol", distanceKm: 10, daysPerWeek: 0 }],
  ] as const)("is empty when there is no commute: %o", (commute) => {
    expect(commuteSwaps(commute, 150)).toEqual([]);
  });
});

describe("treesEquivalent", () => {
  it("converts weekly CO2 into trees absorbing it for a year", () => {
    expect(treesEquivalent(18)).toBe(43);
  });
});

describe("householdSwaps", () => {
  it("puts clean cooking first for biomass households", () => {
    const swaps = householdSwaps({ cookingFuel: "biomass" });
    expect(swaps[0]).toMatchObject({ id: "clean-cooking", weeklyPmGramsSaved: 167.7 });
  });

  it("includes a kerosene-specific saving", () => {
    const swaps = householdSwaps({ cookingFuel: "kerosene" });
    expect(swaps.find((s) => s.id === "clean-cooking")?.weeklyPmGramsSaved).toBe(6.7);
  });

  it("omits clean cooking for gas households", () => {
    const swaps = householdSwaps({ cookingFuel: "lpg" });
    expect(swaps.map((s) => s.id)).toEqual([
      "no-open-burning",
      "inverter-not-genset",
      "no-mosquito-coil",
    ]);
  });
});
