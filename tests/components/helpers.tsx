import axe from "axe-core";
import { expect, vi } from "vitest";
import { buildFacts } from "@/lib/engine/facts";
import { buildRulePlan } from "@/lib/engine/routine";
import { SAMPLE_PROFILE } from "@/lib/client/profileForm";
import type { InsightsResponse, PlanResponse } from "@/lib/types";
import { NOW, makeAir } from "../fixtures";

export const facts = buildFacts(SAMPLE_PROFILE, makeAir(), NOW);
export const insights: InsightsResponse = {
  facts,
  forecast: [
    { time: "2026-11-17T08:00", pm25: 250, aqi: 400, category: "very_poor" },
    { time: "2026-11-17T12:00", pm25: 120, aqi: 300, category: "poor" },
    { time: "2026-11-17T14:00", pm25: 95, aqi: 217, category: "poor" },
  ],
};
export const planResponse: PlanResponse = {
  plan: buildRulePlan(facts, SAMPLE_PROFILE),
  facts,
  source: "ai",
};

type Handler = (init?: RequestInit) => Response | Promise<Response>;

/** Routes `fetch` calls by URL prefix to canned responses. */
export function mockFetch(routes: Record<string, Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const match = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    if (!match) throw new Error(`Unexpected fetch ${url}`);
    return (routes[match] as Handler)(init);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** Runs axe (WCAG 2.2 AA rules) against a rendered container. */
export async function expectAccessible(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
    // jsdom has no layout engine, so colour contrast is verified in the Playwright suite instead.
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** A text/plain streaming response, as returned by /api/chat. */
export function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}
