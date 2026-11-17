import type { Language } from "@/lib/types";

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
