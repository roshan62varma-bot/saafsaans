import { afterEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "@/lib/cache";
import { UpstreamError, fetchJson } from "@/lib/http";
import { RateLimiter, clientKey, configuredMax } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";

afterEach(() => vi.unstubAllGlobals());

describe("TtlCache", () => {
  it("returns values until they expire", () => {
    let now = 0;
    const cache = new TtlCache<string>(100, 10, () => now);
    cache.set("a", "x");
    expect(cache.get("a")).toBe("x");
    now = 100;
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("evicts the oldest entry when full", () => {
    const cache = new TtlCache<number>(1000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 3); // refresh moves "a" to newest
    cache.set("c", 4);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(3);
    expect(cache.get("c")).toBe(4);
  });

  it("de-duplicates concurrent loads and caches the result", async () => {
    const cache = new TtlCache<number>(1000);
    const load = vi.fn(async () => 42);
    const [a, b] = await Promise.all([cache.getOrLoad("k", load), cache.getOrLoad("k", load)]);
    expect([a, b]).toEqual([42, 42]);
    expect(await cache.getOrLoad("k", load)).toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const cache = new TtlCache<number>(1000);
    await expect(cache.getOrLoad("k", () => Promise.reject(new Error("boom")))).rejects.toThrow(
      "boom",
    );
    expect(await cache.getOrLoad("k", async () => 7)).toBe(7);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe("fetchJson", () => {
  it("returns parsed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: 1 })),
    );
    await expect(fetchJson("https://example.test")).resolves.toEqual({ ok: 1 });
  });

  it("maps network failures to a 504 UpstreamError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("offline"))),
    );
    await expect(fetchJson("https://example.test")).rejects.toMatchObject({
      name: "UpstreamError",
      status: 504,
    });
  });

  it("maps HTTP errors to a 502 without exposing the upstream body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("secret stack", { status: 500 })),
    );
    const error = await fetchJson("https://example.test").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).status).toBe(502);
    expect((error as UpstreamError).message).not.toContain("secret");
  });
});

describe("RateLimiter", () => {
  it("allows up to the limit then blocks with a retry hint", () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect(limiter.check("ip").ok).toBe(true);
    expect(limiter.check("ip")).toMatchObject({ ok: true, remaining: 0 });
    expect(limiter.check("ip")).toEqual({ ok: false, remaining: 0, retryAfterSec: 1 });
    expect(limiter.check("other").ok).toBe(true);
    now = 1000;
    expect(limiter.check("ip").ok).toBe(true);
  });

  it("bounds memory by evicting the oldest client", () => {
    const limiter = new RateLimiter(1, 1000, () => 0, 2);
    limiter.check("a");
    limiter.check("b");
    limiter.check("c");
    expect(limiter.check("a").ok).toBe(true); // "a" was evicted, so it starts fresh
    limiter.reset();
    expect(limiter.check("b").ok).toBe(true);
  });

  it("identifies clients by platform-set headers, never the spoofable left-most XFF entry", () => {
    expect(clientKey(new Headers({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "9.9.9.9" }))).toBe(
      "2.2.2.2",
    );
    expect(clientKey(new Headers({ "x-forwarded-for": "6.6.6.6, 1.1.1.1" }))).toBe("1.1.1.1");
    expect(clientKey(new Headers())).toBe("anonymous");
  });

  it("reads an operator override and ignores invalid values", () => {
    expect(configuredMax({ RATE_LIMIT_MAX: "30" })).toBe(30);
    expect(configuredMax({ RATE_LIMIT_MAX: "-1" })).toBe(12);
    expect(configuredMax({})).toBe(12);
  });
});

describe("sanitizeText", () => {
  it("strips control, zero-width and bidi characters", () => {
    expect(sanitizeText("he\u0000llo​ wo‮rld", 100)).toBe("hello world");
  });

  it("collapses whitespace and caps length", () => {
    expect(sanitizeText("  a    b\n\n\n\nc  ", 100)).toBe("a b\n\nc");
    expect(sanitizeText("abcdef", 3)).toBe("abc");
  });
});
