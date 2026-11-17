import { jsonOk, jsonRoute } from "@/lib/api";
import { advisoryRequestSchema } from "@/lib/schemas";
import { aiRateLimiter } from "@/lib/security/rateLimit";
import { getAdvisory } from "@/lib/services/assistant";

/** POST /api/advisory — shareable community advisory in English or Hindi. */
export const POST = jsonRoute({
  limiter: aiRateLimiter,
  schema: advisoryRequestSchema,
  handle: async ({ profile, audience, language }) =>
    jsonOk(await getAdvisory(profile, audience, language)),
});
