import { describe, expect, it } from "vitest";
import {
  assessMember,
  householdRisk,
  maskAdvice,
  riskLevel,
  sensitivityBoost,
} from "@/lib/engine/risk";
import type { Member, MemberRisk } from "@/lib/types";

const member = (overrides: Partial<Member> = {}): Member => ({
  id: "x",
  label: "X",
  ageGroup: "adult",
  conditions: [],
  ...overrides,
});

describe("sensitivityBoost", () => {
  it("is zero for a healthy adult", () => {
    expect(sensitivityBoost(member())).toBe(0);
  });

  it.each([
    [{ ageGroup: "infant" }, 2],
    [{ ageGroup: "child" }, 1],
    [{ ageGroup: "elderly" }, 1],
    [{ conditions: ["asthma"] }, 2],
    [{ conditions: ["copd"] }, 2],
    [{ conditions: ["heart"] }, 1],
    [{ conditions: ["pregnancy"] }, 1],
  ] as const)("%o → %d", (overrides, expected) => {
    expect(sensitivityBoost(member(overrides as Partial<Member>))).toBe(expected);
  });

  it("caps combined vulnerabilities at 2", () => {
    expect(sensitivityBoost(member({ ageGroup: "elderly", conditions: ["copd", "heart"] }))).toBe(
      2,
    );
  });
});

describe("riskLevel", () => {
  it.each([
    ["good", 0, "low"],
    ["satisfactory", 0, "low"],
    ["moderate", 0, "moderate"],
    ["poor", 0, "high"],
    ["very_poor", 0, "very_high"],
    ["severe", 0, "very_high"],
    ["satisfactory", 1, "moderate"],
    ["moderate", 1, "high"],
    ["moderate", 2, "very_high"],
  ] as const)("%s with boost %d → %s", (category, boost, expected) => {
    expect(riskLevel(category, boost)).toBe(expected);
  });
});

describe("maskAdvice", () => {
  it("never recommends masks for infants", () => {
    expect(maskAdvice({ ageGroup: "infant" }, "very_high")).toMatch(/No masks under age 2/);
  });

  it("scales with risk for everyone else", () => {
    expect(maskAdvice({ ageGroup: "adult" }, "low")).toBe("No mask needed.");
    expect(maskAdvice({ ageGroup: "adult" }, "moderate")).toMatch(/Carry/);
    expect(maskAdvice({ ageGroup: "child" }, "high")).toMatch(/N95\/FFP2/);
  });
});

describe("assessMember / householdRisk", () => {
  it("flags sensitive members and gives matching advice", () => {
    const risk = assessMember(member({ label: "Aarav", ageGroup: "child" }), "moderate");
    expect(risk).toMatchObject({ label: "Aarav", level: "high", sensitive: true });
    expect(risk.outdoorAdvice).toMatch(/Avoid outdoor exercise/);
  });

  it("returns the worst level in the household", () => {
    const risks = [
      assessMember(member(), "satisfactory"),
      assessMember(member({ conditions: ["asthma"] }), "moderate"),
      assessMember(member(), "moderate"),
    ];
    expect(householdRisk(risks)).toBe("very_high");
  });

  it("defaults to low for an empty household", () => {
    expect(householdRisk([] as MemberRisk[])).toBe("low");
  });
});
