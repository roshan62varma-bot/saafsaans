import "server-only";
import { createGoogle, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Returns the configured Gemini model, or `null` when no API key is set — callers then
 * fall back to the deterministic engine so the app keeps working.
 */
export function getModel(
  env: Readonly<Record<string, string | undefined>> = process.env,
): LanguageModel | null {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) return null;
  const modelId = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  return createGoogle({ apiKey })(modelId);
}

/** Block harmful content at medium probability and above in every category. */
export const SAFETY_OPTIONS = {
  google: {
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  } satisfies GoogleLanguageModelOptions,
};
