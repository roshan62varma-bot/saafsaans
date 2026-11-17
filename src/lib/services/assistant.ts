import "server-only";
import { createHash } from "node:crypto";
import type { LanguageModel } from "ai";
import { CACHE_TTL, FORECAST_LOOKAHEAD_HOURS } from "@/lib/constants";
import { TtlCache } from "@/lib/cache";
import { getAir } from "@/lib/air/openMeteo";
import { generateAdvisory, generatePlan } from "@/lib/ai/generate";
import { getModel } from "@/lib/ai/model";
import { factsForPrompt } from "@/lib/ai/prompts";
import { buildRuleAdvisory } from "@/lib/engine/advisory";
import { pm25Aqi } from "@/lib/engine/aqi";
import { buildFacts } from "@/lib/engine/facts";
import { buildRulePlan } from "@/lib/engine/routine";
import { upcoming } from "@/lib/engine/windows";
import type {
  AdvisoryResponse,
  AirSnapshot,
  Audience,
  FactSheet,
  InsightsResponse,
  Language,
  Place,
  Plan,
  PlanResponse,
  Profile,
} from "@/lib/types";

/** External dependencies, injectable for tests. */
export interface Deps {
  getAir: (place: Place) => Promise<AirSnapshot>;
  getModel: () => LanguageModel | null;
  now: () => number;
}

export const defaultDeps: Deps = { getAir, getModel: () => getModel(), now: Date.now };

// Only model output is cached; it is keyed by the exact prompt input (see cacheKey).
const planCache = new TtlCache<Plan>(CACHE_TTL.plan);
const advisoryCache = new TtlCache<string>(CACHE_TTL.advisory);

/**
 * Hash of everything a model call depends on. Because the key covers the complete prompt
 * input, a cached answer is only ever reused for an identical request — one household's
 * output can never be served to another.
 */
export function cacheKey(...parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

async function loadFacts(
  profile: Profile,
  deps: Deps,
): Promise<{ air: AirSnapshot; facts: FactSheet }> {
  const air = await deps.getAir(profile.place);
  return { air, facts: buildFacts(profile, air, deps.now()) };
}

const logAiFailure = (what: string, error: unknown) =>
  console.warn(
    `Gemini ${what} failed; using rule engine`,
    error instanceof Error ? error.message : "unknown",
  );

/** Fast, AI-free dashboard data: computed facts plus a compact forecast series. */
export async function getInsights(
  profile: Profile,
  deps: Deps = defaultDeps,
): Promise<InsightsResponse> {
  const { air, facts } = await loadFacts(profile, deps);
  const forecast = upcoming(air.hourly, deps.now(), FORECAST_LOOKAHEAD_HOURS).map((r) => {
    const aqi = pm25Aqi(r.pm25);
    return { time: r.time, pm25: Math.round(r.pm25), aqi: aqi.value, category: aqi.category };
  });
  return { facts, forecast };
}

/** Personalised plan from Gemini, falling back to the rule engine on any failure. */
export async function getPlan(profile: Profile, deps: Deps = defaultDeps): Promise<PlanResponse> {
  const { facts } = await loadFacts(profile, deps);
  const model = deps.getModel();
  const rules = (): PlanResponse => ({
    plan: buildRulePlan(facts, profile),
    facts,
    source: "rules",
  });
  if (!model) return rules();

  const key = cacheKey("plan", factsForPrompt(facts), profile.language);
  const cached = planCache.get(key);
  if (cached) return { plan: cached, facts, source: "ai" };

  try {
    const plan = await generatePlan(model, facts, profile.language);
    if (!plan) return rules();
    planCache.set(key, plan);
    return { plan, facts, source: "ai" };
  } catch (error) {
    logAiFailure("plan", error);
    return rules();
  }
}

/** Community advisory from Gemini, falling back to a bilingual template. */
export async function getAdvisory(
  profile: Profile,
  audience: Audience,
  language: Language,
  deps: Deps = defaultDeps,
): Promise<AdvisoryResponse> {
  const { facts } = await loadFacts(profile, deps);
  const model = deps.getModel();
  const rules = (): AdvisoryResponse => ({
    message: buildRuleAdvisory(facts, audience, language),
    source: "rules",
  });
  if (!model) return rules();

  const key = cacheKey("advisory", factsForPrompt(facts), audience, language);
  const cached = advisoryCache.get(key);
  if (cached) return { message: cached, source: "ai" };

  try {
    const message = await generateAdvisory(model, facts, audience, language);
    if (!message) return rules();
    advisoryCache.set(key, message);
    return { message, source: "ai" };
  } catch (error) {
    logAiFailure("advisory", error);
    return rules();
  }
}

/** Facts for chat grounding. */
export async function getChatContext(profile: Profile, deps: Deps = defaultDeps) {
  const { facts } = await loadFacts(profile, deps);
  return { facts, model: deps.getModel() };
}

/** Test hook. */
export function __clearServiceCaches(): void {
  planCache.clear();
  advisoryCache.clear();
}
