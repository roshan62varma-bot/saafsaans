import { describe, expect, it } from "vitest";
import { buildRuleAdvisory } from "@/lib/engine/advisory";
import { buildFacts } from "@/lib/engine/facts";
import type { FactSheet } from "@/lib/types";
import { NOW, makeAir, makeProfile } from "../fixtures";

const facts = buildFacts(makeProfile(), makeAir(), NOW);

describe("buildRuleAdvisory", () => {
  it("writes an English advisory with AQI, timing windows and a collective action", () => {
    const text = buildRuleAdvisory(facts, "school", "en");
    expect(text).toContain("Air quality alert for New Delhi: AQI 400 (Very Poor)");
    expect(text).toContain("Cleanest hours: 13:00–15:00");
    expect(text).toContain("Dirtiest hours: 20:00–22:00");
    expect(text).toContain("Move assembly, PE and recess indoors");
    expect(text).toContain("Wear a fitted N95");
    expect(text).toContain("Do not burn leaves");
    expect(text).toContain("112");
  });

  it("writes a Hindi advisory", () => {
    const text = buildRuleAdvisory(facts, "family_group", "hi");
    expect(text).toContain("वायु गुणवत्ता चेतावनी: AQI 400 (बहुत खराब)");
    expect(text).toContain("दादा-दादी");
  });

  it("softens advice on cleaner days and skips unknown windows", () => {
    const clean: FactSheet = {
      ...facts,
      aqi: { value: 80, category: "satisfactory", dominant: "pm25" },
      bestWindow: null,
      worstWindow: null,
    };
    const text = buildRuleAdvisory(clean, "workplace", "en");
    expect(text).toContain("Sensitive people should keep outdoor exertion short");
    expect(text).not.toContain("Cleanest hours");
    expect(text).not.toContain("Dirtiest hours");
    expect(buildRuleAdvisory(clean, "society", "en")).toContain("Guards, gardeners");
  });
});
