import { describe, expect, it } from "vitest";
import {
  categorize,
  categoryRank,
  cigarettesEquivalent,
  computeAqi,
  pm25Aqi,
  subIndex,
} from "@/lib/engine/aqi";

describe("subIndex (CPCB breakpoints)", () => {
  it.each([
    [0, 0],
    [30, 50],
    [60, 100],
    [90, 200],
    [120, 300],
    [250, 400],
    [500, 500],
  ])("PM2.5 %d µg/m³ → %d at each breakpoint boundary", (c, expected) => {
    expect(subIndex("pm25", c)).toBe(expected);
  });

  it("interpolates linearly inside a segment", () => {
    expect(subIndex("pm25", 45)).toBe(75);
    expect(subIndex("pm10", 175)).toBe(150);
  });

  it("clamps negative concentrations to zero", () => {
    expect(subIndex("no2", -10)).toBe(0);
  });

  it("caps concentrations beyond the scale at 500", () => {
    expect(subIndex("pm25", 999)).toBe(500);
    expect(subIndex("o3", 5000)).toBe(500);
  });
});

describe("categorize", () => {
  it.each([
    [0, "good"],
    [50, "good"],
    [51, "satisfactory"],
    [100, "satisfactory"],
    [101, "moderate"],
    [200, "moderate"],
    [201, "poor"],
    [300, "poor"],
    [301, "very_poor"],
    [400, "very_poor"],
    [401, "severe"],
    [500, "severe"],
  ] as const)("AQI %d → %s", (aqi, category) => {
    expect(categorize(aqi)).toBe(category);
  });

  it("treats out-of-scale values as severe", () => {
    expect(categorize(650)).toBe("severe");
  });

  it("ranks categories from good (0) to severe (5)", () => {
    expect(categoryRank("good")).toBe(0);
    expect(categoryRank("severe")).toBe(5);
  });
});

describe("computeAqi", () => {
  it("reports the highest sub-index and its pollutant", () => {
    const result = computeAqi({ pm25: 45, pm10: 300, no2: 10, o3: 10 });
    expect(result).toEqual({ value: 250, category: "poor", dominant: "pm10" });
  });

  it("skips missing and non-finite pollutants", () => {
    expect(computeAqi({ pm25: null, pm10: Number.NaN, no2: 40, o3: null })).toEqual({
      value: 50,
      category: "good",
      dominant: "no2",
    });
  });

  it("returns null when nothing is reported", () => {
    expect(computeAqi({ pm25: null, pm10: null, no2: null, o3: null })).toBeNull();
  });
});

describe("pm25Aqi / cigarettesEquivalent", () => {
  it("derives AQI from PM2.5 alone", () => {
    expect(pm25Aqi(150)).toEqual({ value: 323, category: "very_poor", dominant: "pm25" });
  });

  it("converts PM2.5 to cigarettes per day (22 µg/m³ ≈ 1 cigarette)", () => {
    expect(cigarettesEquivalent(22)).toBe(1);
    expect(cigarettesEquivalent(250)).toBe(11.4);
    expect(cigarettesEquivalent(-5)).toBe(0);
  });
});
