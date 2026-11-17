import { enforceRateLimit, handleRouteError, jsonOk, parseJsonBody } from "@/lib/api";
import { advisoryRequestSchema } from "@/lib/schemas";
import { aiRateLimiter } from "@/lib/security/rateLimit";
import { getAdvisory } from "@/lib/services/assistant";

/** POST /api/advisory — shareable community advisory in English or Hindi. */
export async function POST(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, aiRateLimiter);
  if (limited) return limited;

  const body = await parseJsonBody(request, advisoryRequestSchema);
  if (!body.ok) return body.response;
  try {
    const { profile, audience, language } = body.data;
    return jsonOk(await getAdvisory(profile, audience, language));
  } catch (error) {
    return handleRouteError(error);
  }
}
