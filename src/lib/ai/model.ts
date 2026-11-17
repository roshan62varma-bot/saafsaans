import "server-only";
import { createGoogle, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import type { LanguageModelV4, LanguageModelV4CallOptions } from "@ai-sdk/provider";

/**
 * Fast, low-cost Flash-Lite model: the engine has already done the reasoning, so the model
 * only phrases pre-computed facts. Measured at ~1 s per call.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
/** Used automatically when the primary model errors, is overloaded or times out. */
export const FALLBACK_GEMINI_MODEL = "gemini-3-flash-preview";
/** Budget for one model attempt before failing over to the next. */
export const PER_MODEL_TIMEOUT_MS = 12_000;

/**
 * Wraps several models into one that tries each in turn. Failover happens on any error,
 * including a per-attempt connection timeout, but never when the caller itself aborted.
 * Works for both `doGenerate` and `doStream` (errors raised before the stream starts).
 */
export function withFailover(
  models: readonly [LanguageModelV4, ...LanguageModelV4[]],
  perModelTimeoutMs = PER_MODEL_TIMEOUT_MS,
): LanguageModelV4 {
  const [primary] = models;

  async function attempt<R>(
    options: LanguageModelV4CallOptions,
    call: (m: LanguageModelV4, o: LanguageModelV4CallOptions) => PromiseLike<R>,
  ): Promise<R> {
    let lastError: unknown;
    for (const model of models) {
      // The budget covers connecting to the model only. Once a call resolves (for a stream:
      // once it has started) the timer is cleared, so a slow but healthy answer is never cut.
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(new Error("model timeout")),
        perModelTimeoutMs,
      );
      const forwardAbort = () => controller.abort(options.abortSignal?.reason);
      options.abortSignal?.addEventListener("abort", forwardAbort, { once: true });
      if (options.abortSignal?.aborted) forwardAbort();
      try {
        return await call(model, { ...options, abortSignal: controller.signal });
      } catch (error) {
        options.abortSignal?.removeEventListener("abort", forwardAbort);
        if (options.abortSignal?.aborted) throw error;
        lastError = error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  }

  return {
    specificationVersion: "v4",
    provider: primary.provider,
    modelId: models.map((m) => m.modelId).join(" → "),
    supportedUrls: primary.supportedUrls,
    doGenerate: (options) => attempt(options, (m, o) => m.doGenerate(o)),
    doStream: (options) => attempt(options, (m, o) => m.doStream(o)),
  };
}

/**
 * Returns the configured Gemini model chain, or `null` when no API key is set — callers
 * then fall back to the deterministic engine so the app keeps working.
 */
export function getModel(
  env: Readonly<Record<string, string | undefined>> = process.env,
): LanguageModelV4 | null {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) return null;
  const google = createGoogle({ apiKey });
  const primary = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const ids = [...new Set([primary, FALLBACK_GEMINI_MODEL])];
  return withFailover(ids.map((id) => google(id)) as [LanguageModelV4, ...LanguageModelV4[]]);
}

/**
 * Provider options for every call:
 * - low thinking keeps latency and cost down (supported by every Gemini 3 Flash model);
 * - safety filters block content with a high probability of harm. (Medium-and-above was
 *   measured to block ordinary child-health questions such as "can my asthmatic son play
 *   outside?", which is exactly what families need to ask.)
 */
export const PROVIDER_OPTIONS = {
  google: {
    thinkingConfig: { thinkingLevel: "low" },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  } satisfies GoogleLanguageModelOptions,
};
