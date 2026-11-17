import { describe, expect, it } from "vitest";
import { clampInput, summarizePledges, summarizeSwap } from "@/lib/client/impactSummary";
import { householdSwaps } from "@/lib/engine/impact";
import type { CommuteSwap } from "@/lib/types";

const swap = (overrides: Partial<CommuteSwap> = {}): CommuteSwap => ({
  from: "car_petrol",
  to: "metro",
  weeklyCo2KgSaved: 18,
  weeklyPmGramsSaved: 1.32,
  exposureChangePct: -44,
  ...overrides,
});

describe("clampInput", () => {
  it("clamps into range and treats invalid input as the minimum", () => {
    expect(clampInput("12", 0, 100)).toBe(12);
    expect(clampInput("150", 0, 100)).toBe(100);
    expect(clampInput("-5", 0, 100)).toBe(0);
    expect(clampInput("abc", 0, 7)).toBe(0);
  });
});

describe("summarizeSwap", () => {
  it("projects weekly savings over a year with a plain-language sentence", () => {
    expect(summarizeSwap(swap())).toEqual({
      yearlyCo2Kg: 936,
      yearlyPmG: 69,
      trees: 43,
      exposureLabel: "-44%",
      message: "Switching from petrol car to metro saves 18 kg CO2 and 1.32 g PM2.5 every week.",
    });
  });

  it("warns that active travel raises the traveller's own dose", () => {
    const s = summarizeSwap(swap({ to: "cycle", exposureChangePct: 40 }));
    expect(s.exposureLabel).toBe("+40%");
    expect(s.message).toMatch(/raises your own dose/);
  });

  it("explains when a switch would not help", () => {
    const s = summarizeSwap(swap({ to: "car_petrol", weeklyCo2KgSaved: 0, weeklyPmGramsSaved: 0 }));
    expect(s.message).toBe("That switch would not reduce emissions — try a cleaner option.");
    expect(s.trees).toBe(0);
  });
});

describe("summarizePledges", () => {
  const swaps = householdSwaps({ cookingFuel: "lpg" });

  it("reports no pledges", () => {
    expect(summarizePledges(swaps, new Set())).toBe("No pledges yet.");
  });

  it("totals PM2.5 and CO2 per year, omitting CO2 when zero", () => {
    expect(summarizePledges(swaps, new Set(["inverter-not-genset"]))).toBe(
      "Your pledges keep about 728 g of PM2.5 and 572 kg of CO2 out of the air each year.",
    );
    expect(summarizePledges(swaps, new Set(["no-mosquito-coil"]))).toBe(
      "Your pledges keep about 146 g of PM2.5 out of the air each year.",
    );
  });
});
