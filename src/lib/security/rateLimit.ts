import { RATE_LIMIT } from "@/lib/constants";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Sliding-window rate limiter keyed by client. Protects the Gemini quota from abuse.
 * Per-instance memory is adequate for this app's scale; swap in a shared store
 * (e.g. Redis from the Vercel Marketplace) if it needs strict global limits.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number = RATE_LIMIT.max,
    private readonly windowMs: number = RATE_LIMIT.windowMs,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string): RateLimitResult {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      const oldest = recent[0] as number;
      this.hits.set(key, recent);
      return {
        ok: false,
        remaining: 0,
        retryAfterSec: Math.ceil((oldest + this.windowMs - now) / 1000),
      };
    }
    recent.push(now);
    this.hits.delete(key);
    if (this.hits.size >= this.maxKeys) this.hits.delete(this.hits.keys().next().value as string);
    this.hits.set(key, recent);
    return { ok: true, remaining: this.max - recent.length, retryAfterSec: 0 };
  }

  reset(): void {
    this.hits.clear();
  }
}

/** Best-effort client identifier from proxy headers set by the hosting platform. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "anonymous";
}

/** Per-minute AI request budget; operators can tune it with `RATE_LIMIT_MAX`. */
export function configuredMax(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.RATE_LIMIT_MAX);
  return Number.isInteger(n) && n > 0 ? n : RATE_LIMIT.max;
}

/** Limiter for AI-backed routes (protects the Gemini quota). */
export const aiRateLimiter = new RateLimiter(configuredMax());
/** Looser limiter for cheap data routes (geocoding, air insights). */
export const dataRateLimiter = new RateLimiter(configuredMax() * 5);
