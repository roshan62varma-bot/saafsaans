import "server-only";
import { generateText, Output, streamText, type LanguageModel } from "ai";
import { AI_TIMEOUT_MS } from "@/lib/constants";
import { toChatTextStream } from "@/lib/ai/chatStream";
import { isGrounded } from "@/lib/ai/grounding";
import { PROVIDER_OPTIONS } from "@/lib/ai/model";
import {
  advisorySystemPrompt,
  chatSystemPrompt,
  factsForPrompt,
  planSystemPrompt,
  planUserPrompt,
} from "@/lib/ai/prompts";
import { planSchema } from "@/lib/schemas";
import { sanitizeText } from "@/lib/security/sanitize";
import type { Audience, ChatMessage, FactSheet, Language, Plan, Profile } from "@/lib/types";

const COMMON = {
  maxRetries: 1,
  timeout: AI_TIMEOUT_MS,
  providerOptions: PROVIDER_OPTIONS,
} as const;

const MAX_ADVISORY_CHARS = 1500;

/**
 * Asks Gemini for a structured plan. Returns `null` (so callers use the rule engine)
 * if the output fails schema validation or cites numbers not present in FACTS.
 */
export async function generatePlan(
  model: LanguageModel,
  facts: FactSheet,
  language: Language,
): Promise<Plan | null> {
  const { output } = await generateText({
    ...COMMON,
    model,
    temperature: 0.4,
    system: planSystemPrompt(language),
    prompt: planUserPrompt(facts),
    output: Output.object({ schema: planSchema }),
  });
  const parsed = planSchema.safeParse(output);
  if (!parsed.success) return null;
  return isGrounded(JSON.stringify(parsed.data), factsForPrompt(facts)) ? parsed.data : null;
}

/** Short shareable advisory; `null` if empty or ungrounded. */
export async function generateAdvisory(
  model: LanguageModel,
  facts: FactSheet,
  audience: Audience,
  language: Language,
): Promise<string | null> {
  const { text } = await generateText({
    ...COMMON,
    model,
    temperature: 0.5,
    system: advisorySystemPrompt(audience, language),
    prompt: `FACTS:\n${factsForPrompt(facts)}`,
  });
  const message = sanitizeText(text, MAX_ADVISORY_CHARS);
  if (!message || !isGrounded(message, factsForPrompt(facts))) return null;
  return message;
}

export interface ChatRequest {
  model: LanguageModel;
  facts: FactSheet;
  profile: Profile;
  messages: readonly ChatMessage[];
  onError: (error: unknown) => void;
}

/** Streams a chat answer grounded in the household's facts, as plain UTF-8 text. */
export function streamChat({
  model,
  facts,
  profile,
  messages,
  onError,
}: ChatRequest): ReadableStream<Uint8Array> {
  const result = streamText({
    ...COMMON,
    model,
    temperature: 0.5,
    // Gemini counts hidden reasoning tokens against this cap; the prompt bounds visible length.
    maxOutputTokens: 2048,
    system: chatSystemPrompt(facts, profile),
    messages: messages.map((m) => ({
      role: m.role,
      content:
        m.role === "user"
          ? `<user_message>${sanitizeText(m.content, 1000)}</user_message>`
          : sanitizeText(m.content, 2000),
    })),
  });
  return toChatTextStream(result.fullStream, profile.language, onError);
}
