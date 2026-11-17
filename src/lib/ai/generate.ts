import "server-only";
import { generateText, Output, streamText, type LanguageModel } from "ai";
import { AI_TIMEOUT_MS } from "@/lib/constants";
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

/** Shown in place of a silent cut-off, in the family's language. */
export const CHAT_NOTICES: Record<Language, { interrupted: string; declined: string }> = {
  en: {
    interrupted: "(The answer was interrupted — please ask again.)",
    declined:
      "I can't help with that one. Ask me about today's air, your family's health or cleaner habits.",
  },
  hi: {
    interrupted: "(जवाब बीच में रुक गया — कृपया दोबारा पूछें।)",
    declined: "मैं इसमें मदद नहीं कर सकता। आज की हवा, परिवार की सेहत या साफ़ आदतों के बारे में पूछें।",
  },
};

/** Minimal view of the AI SDK stream parts this module consumes. */
type ChatPart =
  | { type: "text-delta"; text: string }
  | { type: "error"; error: unknown }
  | { type: "finish"; finishReason: string }
  | { type: string };

/**
 * Converts model stream parts into UTF-8 text for the browser. Instead of stopping
 * silently, an interrupted stream (overload, token limit) or a safety block ends with a
 * short, honest notice.
 */
export function toChatTextStream(
  parts: AsyncIterable<ChatPart>,
  language: Language,
  onError: (error: unknown) => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const notices = CHAT_NOTICES[language];
  return new ReadableStream({
    async start(controller) {
      let wrote = false;
      let notice: string | null = null;
      try {
        for await (const part of parts) {
          if (part.type === "text-delta" && "text" in part) {
            controller.enqueue(encoder.encode(part.text));
            wrote ||= part.text.length > 0;
          } else if (part.type === "error" && "error" in part) {
            onError(part.error);
            notice = notices.interrupted;
          } else if (part.type === "finish" && "finishReason" in part) {
            if (part.finishReason === "content-filter")
              notice = wrote ? notices.interrupted : notices.declined;
            else if (part.finishReason !== "stop" || !wrote) notice ??= notices.interrupted;
          }
        }
      } catch (error) {
        // A thrown stream error (e.g. an abort) must still end in a readable answer.
        onError(error);
        notice = notices.interrupted;
      }
      if (notice)
        controller.enqueue(
          encoder.encode(
            wrote
              ? `

${notice}`
              : notice,
          ),
        );
      controller.close();
    },
  });
}

/** Streams a chat answer grounded in the household's facts, as plain UTF-8 text. */
export function streamChat(
  model: LanguageModel,
  facts: FactSheet,
  profile: Profile,
  messages: readonly ChatMessage[],
  onError: (error: unknown) => void,
): ReadableStream<Uint8Array> {
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
