"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITS } from "@/lib/constants";
import { isAbort, messageOf, postRaw, readTextStream } from "@/lib/client/api";
import type { ChatMessage, Profile } from "@/lib/types";

/** Most recent turns sent with each question (the server enforces the same cap). */
const withQuestion = (messages: readonly ChatMessage[], content: string): ChatMessage[] =>
  [...messages, { role: "user" as const, content }].slice(-LIMITS.maxChatMessages);

/**
 * Conversation state for the assistant: sends the history, streams the answer into the
 * last message, and on failure restores the question so nothing typed is lost.
 */
export function useChat(profile: Profile) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function ask(question: string) {
    const content = question.trim();
    if (!content || streaming) return;
    const history = withQuestion(messages, content);
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setError(null);
    setStreaming(true);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const response = await postRaw(
        "/api/chat",
        { profile, messages: history },
        controller.signal,
      );
      const answer = await readTextStream(response, (text) =>
        setMessages([...history, { role: "assistant", content: text }]),
      );
      if (!answer.trim()) throw new Error("Empty answer");
    } catch (e) {
      if (isAbort(e)) return;
      setMessages(history.slice(0, -1));
      setDraft(content);
      setError(messageOf(e));
    } finally {
      setStreaming(false);
    }
  }

  return { messages, draft, setDraft, streaming, error, ask };
}
