import { enforceRateLimit, handleRouteError, jsonError, jsonOk, toIssues } from "@/lib/api";
import { searchPlaces } from "@/lib/air/geocode";
import { geocodeQuerySchema } from "@/lib/schemas";
import { dataRateLimiter } from "@/lib/security/rateLimit";

/** GET /api/geocode?q=Delhi — up to 5 matching places. */
export async function GET(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, dataRateLimiter);
  if (limited) return limited;

  const query = geocodeQuerySchema.safeParse({
    q: new URL(request.url).searchParams.get("q") ?? "",
  });
  if (!query.success) {
    return jsonError(400, "Please enter a valid city name.", { issues: toIssues(query.error) });
  }
  try {
    const places = await searchPlaces(query.data.q);
    // Place names change rarely: let the CDN and browser reuse results.
    return jsonOk({ places }, { "Cache-Control": "public, max-age=3600, s-maxage=86400" });
  } catch (error) {
    return handleRouteError(error);
  }
}
