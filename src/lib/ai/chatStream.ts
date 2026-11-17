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

type Notices = (typeof CHAT_NOTICES)[Language];

/**
 * Tracks what has been sent to the browser and which closing notice (if any) is owed.
 * Each stream event is handled by one small method.
 */
class ChatTranscript {
  private wrote = false;
  private notice: string | null = null;

  constructor(
    private readonly notices: Notices,
    private readonly write: (text: string) => void,
    private readonly onError: (error: unknown) => void,
  ) {}

  accept(part: ChatPart): void {
    if (part.type === "text-delta" && "text" in part) this.text(part.text);
    else if (part.type === "error" && "error" in part) this.fail(part.error);
    else if (part.type === "finish" && "finishReason" in part) this.finish(part.finishReason);
  }

  /** A thrown or reported stream error still ends in a readable answer. */
  fail(error: unknown): void {
    this.onError(error);
    this.notice = this.notices.interrupted;
  }

  close(): void {
    if (!this.notice) return;
    this.write(this.wrote ? `\n\n${this.notice}` : this.notice);
  }

  private text(text: string): void {
    this.write(text);
    this.wrote ||= text.length > 0;
  }

  private finish(reason: string): void {
    if (reason === "content-filter") {
      this.notice = this.wrote ? this.notices.interrupted : this.notices.declined;
    } else if (reason !== "stop" || !this.wrote) {
      this.notice ??= this.notices.interrupted;
    }
  }
}

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
  return new ReadableStream({
    async start(controller) {
      const transcript = new ChatTranscript(
        CHAT_NOTICES[language],
        (text) => controller.enqueue(encoder.encode(text)),
        onError,
      );
      try {
        for await (const part of parts) transcript.accept(part);
      } catch (error) {
        transcript.fail(error);
      }
      transcript.close();
      controller.close();
    },
  });
}
