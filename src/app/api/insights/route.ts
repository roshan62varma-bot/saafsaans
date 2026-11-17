import { enforceRateLimit, handleRouteError, jsonOk, parseJsonBody } from "@/lib/api";
import { profileSchema } from "@/lib/schemas";
import { dataRateLimiter } from "@/lib/security/rateLimit";
import { getInsights } from "@/lib/services/assistant";

/** POST /api/insights — live AQI, forecast windows, risks and impact figures (no AI, fast). */
export async function POST(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, dataRateLimiter);
  if (limited) return limited;

  const body = await parseJsonBody(request, profileSchema);
  if (!body.ok) return body.response;
  try {
    return jsonOk(await getInsights(body.data));
  } catch (error) {
    return handleRouteError(error);
  }
}
