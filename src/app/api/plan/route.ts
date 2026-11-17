import { enforceRateLimit, handleRouteError, jsonOk, parseJsonBody } from "@/lib/api";
import { profileSchema } from "@/lib/schemas";
import { aiRateLimiter } from "@/lib/security/rateLimit";
import { getPlan } from "@/lib/services/assistant";

/** POST /api/plan — Gemini-written daily plan grounded in engine facts (rule-based fallback). */
export async function POST(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, aiRateLimiter);
  if (limited) return limited;

  const body = await parseJsonBody(request, profileSchema);
  if (!body.ok) return body.response;
  try {
    return jsonOk(await getPlan(body.data));
  } catch (error) {
    return handleRouteError(error);
  }
}
