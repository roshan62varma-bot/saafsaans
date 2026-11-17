import { jsonError, jsonRoute } from "@/lib/api";
import { streamChat } from "@/lib/ai/generate";
import { chatRequestSchema } from "@/lib/schemas";
import { aiRateLimiter } from "@/lib/security/rateLimit";
import { getChatContext } from "@/lib/services/assistant";

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

const logStreamError = (error: unknown) =>
  console.warn("Gemini chat stream failed", error instanceof Error ? error.message : "unknown");

/** POST /api/chat — streams a plain-text answer grounded in the household's facts. */
export const POST = jsonRoute({
  limiter: aiRateLimiter,
  schema: chatRequestSchema,
  handle: async ({ profile, messages }) => {
    const { facts, model } = await getChatContext(profile);
    if (!model) {
      return jsonError(
        503,
        "The AI assistant is not configured. Your plan and dashboard still work.",
      );
    }
    const stream = streamChat({ model, facts, profile, messages, onError: logStreamError });
    return new Response(stream, { headers: STREAM_HEADERS });
  },
});
