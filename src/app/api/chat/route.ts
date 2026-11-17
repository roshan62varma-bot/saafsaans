import { enforceRateLimit, handleRouteError, jsonError, parseJsonBody } from "@/lib/api";
import { streamChat } from "@/lib/ai/generate";
import { chatRequestSchema } from "@/lib/schemas";
import { aiRateLimiter } from "@/lib/security/rateLimit";
import { getChatContext } from "@/lib/services/assistant";

/** POST /api/chat — streams a plain-text answer grounded in the household's facts. */
export async function POST(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, aiRateLimiter);
  if (limited) return limited;

  const body = await parseJsonBody(request, chatRequestSchema);
  if (!body.ok) return body.response;
  try {
    const { profile, messages } = body.data;
    const { facts, model } = await getChatContext(profile);
    if (!model) {
      return jsonError(
        503,
        "The AI assistant is not configured. Your plan and dashboard still work.",
      );
    }
    const result = streamChat(model, facts, profile, messages, (error) =>
      console.warn("Gemini chat stream failed", error instanceof Error ? error.message : "unknown"),
    );
    return result.toTextStreamResponse({
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
