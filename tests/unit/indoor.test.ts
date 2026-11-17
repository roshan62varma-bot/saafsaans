import { describe, expect, it } from "vitest";
import { affordable, indoorHacks, indoorPm25, purifierAdvice } from "@/lib/engine/indoor";
import type { TimeWindow } from "@/lib/types";
import { makeProfile } from "../fixtures";

describe("indoorPm25 (mass balance)", () => {
  it("lets less smog in through a sealed shell than a leaky one", () => {
    const leaky = indoorPm25(200, "leaky", 30, 0);
    const sealed = indoorPm25(200, "sealed", 30, 0);
    expect(sealed).toBeLessThan(leaky);
  });

  it("drops sharply with filtration", () => {
    expect(indoorPm25(200, "average", 30, 150)).toBeLessThan(indoorPm25(200, "average", 30, 0) / 4);
  });
});

describe("purifierAdvice", () => {
  it("sizes CADR at 5 air changes per hour and predicts indoor PM2.5", () => {
    expect(purifierAdvice(12, "average", 250)).toEqual({
      roomVolumeM3: 32,
      recommendedCadrM3h: 160,
      recommendedCadrCfm: 94,
      indoorPm25Without: 160,
      indoorPm25With: 27,
    });
  });
});

describe("affordable", () => {
  it.each([
    ["free", "low", true],
    ["low", "low", true],
    ["medium", "low", false],
    ["medium", "medium", true],
    ["high", "medium", false],
    ["high", "high", true],
  ] as const)("%s within %s budget: %s", (cost, budget, expected) => {
    expect(affordable(cost, budget)).toBe(expected);
  });
});

const ventilation: TimeWindow = {
  start: "2026-11-17T13:00",
  end: "2026-11-17T14:00",
  avgPm25: 90,
  aqi: { value: 200, category: "moderate", dominant: "pm25" },
};

const ctx = (overrides: Parameters<typeof makeProfile>[0] = {}, vent: TimeWindow | null = ventilation) => {
  const profile = makeProfile(overrides);
  return {
    profile,
    outdoorPm25: 250,
    purifier: purifierAdvice(profile.bedroomAreaM2, profile.sealing, 250),
    ventilation: vent,
  };
};

describe("indoorHacks", () => {
  it("never suggests something over budget", () => {
    const hacks = indoorHacks(ctx({ budget: "low", hasPurifier: false }));
    expect(hacks.map((h) => h.id)).not.toContain("clean-room");
    expect(hacks.every((h) => h.cost === "free" || h.cost === "low")).toBe(true);
  });

  it("puts the clean room first when the family already owns a purifier", () => {
    const hacks = indoorHacks(ctx({ hasPurifier: true, budget: "low" }));
    expect(hacks[0]).toMatchObject({ id: "clean-room", cost: "free" });
    expect(hacks[0]?.title).toBe("Turn the bedroom into a clean room");
    expect(hacks[0]?.impact).toMatch(/drops from about \d+ to \d+ µg\/m³/);
  });

  it("recommends buying a purifier on a high budget", () => {
    const hacks = indoorHacks(ctx({ budget: "high" }), 8);
    expect(hacks.find((h) => h.id === "clean-room")?.title).toMatch(/HEPA purifier/);
  });

  it("prioritises sealing for leaky homes and kitchen exhaust for biomass cooking", () => {
    const leaky = indoorHacks(ctx({ sealing: "leaky", budget: "low", cookingFuel: "biomass" }));
    expect(leaky.slice(0, 3).map((h) => h.id)).toEqual(["kitchen-exhaust", "diy-box-fan", "seal-gaps"]);
    expect(leaky.find((h) => h.id === "seal-gaps")?.impact).toMatch(/Cuts the outdoor smog/);
  });

  it("ranks sealing low for an already sealed home", () => {
    const hacks = indoorHacks(ctx({ sealing: "sealed" }), 8);
    expect(hacks.map((h) => h.id).indexOf("seal-gaps")).toBeGreaterThan(4);
  });

  it("uses the forecast ventilation hour when known, a generic tip otherwise", () => {
    const known = indoorHacks(ctx({}), 8).find((h) => h.id === "smart-ventilation");
    expect(known?.steps[0]).toMatch(/13:00–14:00/);
    const unknown = indoorHacks(ctx({}, null), 8).find((h) => h.id === "smart-ventilation");
    expect(unknown?.steps[0]).toMatch(/early afternoon/);
  });

  it("respects the limit", () => {
    expect(indoorHacks(ctx({ budget: "high" }), 3)).toHaveLength(3);
  });
});
