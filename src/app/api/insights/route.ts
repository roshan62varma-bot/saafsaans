import { jsonOk, jsonRoute } from "@/lib/api";
import { profileSchema } from "@/lib/schemas";
import { dataRateLimiter } from "@/lib/security/rateLimit";
import { getInsights } from "@/lib/services/assistant";

/** POST /api/insights — live AQI, forecast windows, risks and impact figures (no AI, fast). */
export const POST = jsonRoute({
  limiter: dataRateLimiter,
  schema: profileSchema,
  handle: async (profile) => jsonOk(await getInsights(profile)),
});
