import { jsonOk, jsonRoute } from "@/lib/api";
import { profileSchema } from "@/lib/schemas";
import { aiRateLimiter } from "@/lib/security/rateLimit";
import { getPlan } from "@/lib/services/assistant";

/** POST /api/plan — Gemini-written daily plan grounded in engine facts (rule-based fallback). */
export const POST = jsonRoute({
  limiter: aiRateLimiter,
  schema: profileSchema,
  handle: async (profile) => jsonOk(await getPlan(profile)),
});
