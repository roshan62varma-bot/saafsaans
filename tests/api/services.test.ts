// @vitest-environment node
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFacts } from "@/lib/engine/facts";
import { buildRulePlan } from "@/lib/engine/routine";
import {
  __clearServiceCaches,
  cacheKey,
  getAdvisory,
  getChatContext,
  getInsights,
  getPlan,
  type Deps,
} from "@/lib/services/assistant";
import { NOW, makeAir, makeProfile } from "../fixtures";
import { textModel } from "../helpers";

const profile = makeProfile();
const air = makeAir();
const groundedPlan = buildRulePlan(buildFacts(profile, air, NOW), profile);

const deps = (model: unknown = null): Deps => ({
  getAir: vi.fn(async () => air),
  getModel: () => model as ReturnType<Deps["getModel"]>,
  now: () => NOW,
});

const failingModel = () =>
  new MockLanguageModelV4({
    doGenerate: async () => {
      throw new Error("quota exceeded");
    },
  });

beforeEach(() => __clearServiceCaches());

describe("cacheKey", () => {
  it("is stable for equal input and differs otherwise", () => {
    expect(cacheKey("a", { x: 1 })).toBe(cacheKey("a", { x: 1 }));
    expect(cacheKey("a", { x: 1 })).not.toBe(cacheKey("a", { x: 2 }));
  });
});

describe("getInsights", () => {
  it("returns facts and a 36-hour forecast", async () => {
    const { facts, forecast } = await getInsights(profile, deps());
    expect(facts.aqi.value).toBe(400);
    expect(forecast[0]).toEqual({
      time: "2026-11-17T08:00",
      pm25: 250,
      aqi: 400,
      category: "very_poor",
    });
    expect(forecast.length).toBe(37);
  });
});

describe("getPlan", () => {
  it("uses the rule engine without a model", async () => {
    expect((await getPlan(profile, deps())).source).toBe("rules");
  });

  it("returns Gemini's plan and caches it for identical requests", async () => {
    const model = textModel(JSON.stringify(groundedPlan));
    const d = deps(model);
    const first = await getPlan(profile, d);
    const second = await getPlan(profile, d);
    expect(first).toMatchObject({ source: "ai", plan: groundedPlan });
    expect(second.source).toBe("ai");
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("does not share cached plans between different households", async () => {
    const model = textModel(JSON.stringify(groundedPlan));
    await getPlan(profile, deps(model));
    await getPlan(
      makeProfile({ members: [{ id: "z", label: "Zoya", ageGroup: "adult", conditions: [] }] }),
      deps(model),
    );
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it("falls back when the plan is ungrounded", async () => {
    const fake = { ...groundedPlan, summary: "AQI 777, 888 and 999" };
    expect((await getPlan(profile, deps(textModel(JSON.stringify(fake))))).source).toBe("rules");
  });

  it("falls back and logs (without details) when Gemini fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect((await getPlan(profile, deps(failingModel()))).source).toBe("rules");
    expect(warn).toHaveBeenCalledWith("Gemini plan failed; using rule engine", expect.any(String));
  });
});

describe("getAdvisory", () => {
  it("uses the template without a model", async () => {
    const res = await getAdvisory(profile, "school", "en", deps());
    expect(res.source).toBe("rules");
    expect(res.message).toContain("AQI 400");
  });

  it("returns and caches Gemini's advisory", async () => {
    const model = textModel("AQI 400 in New Delhi — keep children indoors.");
    const d = deps(model);
    expect(await getAdvisory(profile, "school", "en", d)).toEqual({
      message: "AQI 400 in New Delhi — keep children indoors.",
      source: "ai",
    });
    expect((await getAdvisory(profile, "school", "en", d)).source).toBe("ai");
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("falls back on empty output or errors", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect((await getAdvisory(profile, "school", "en", deps(textModel("")))).source).toBe("rules");
    expect((await getAdvisory(profile, "school", "en", deps(failingModel()))).source).toBe("rules");
  });
});

describe("getChatContext", () => {
  it("returns facts and the model", async () => {
    const ctx = await getChatContext(profile, deps("m"));
    expect(ctx.facts.place).toBe("New Delhi");
    expect(ctx.model).toBe("m");
  });
});
