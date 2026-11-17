"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LIMITS } from "@/lib/constants";
import { isAbort, messageOf, postRaw } from "@/lib/client/api";
import type { ChatMessage, Profile } from "@/lib/types";

const SUGGESTIONS = [
  "Is it safe for my kids to play outside today?",
  "Which purifier should I buy for our bedroom?",
  "How can I make my commute less polluting?",
  "What should my grandmother avoid today?",
];

/** Streaming Q&A grounded in the household's live facts. */
export function AskAssistant({ profile }: { profile: Profile }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function ask(question: string) {
    const content = question.trim();
    if (!content || streaming) return;
    const history: ChatMessage[] = [...messages, { role: "user" as const, content }].slice(
      -LIMITS.maxChatMessages,
    );
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
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: answer }]);
      }
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <div className="card space-y-4">
      <div
        role="log"
        tabIndex={0}
        aria-live="polite"
        aria-busy={streaming}
        aria-label="Conversation with the assistant"
        className="max-h-[28rem] space-y-3 overflow-y-auto"
        lang={profile.language}
      >
        {messages.length === 0 ? (
          <p className="text-muted">
            Ask anything about today&apos;s air, your family&apos;s health or cleaner habits.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2 text-accent-ink"
                  : "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-2"
              }
            >
              <span className="sr-only">{m.role === "user" ? "You said: " : "Assistant: "}</span>
              {m.content || (streaming && i === messages.length - 1 ? "Thinking…" : "")}
            </div>
          ))
        )}
      </div>

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Suggested questions" role="group">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="btn btn-secondary text-sm"
              onClick={() => void ask(s)}
              disabled={streaming}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Your question
        </label>
        <input
          id="chat-input"
          className="field flex-1"
          value={draft}
          maxLength={LIMITS.maxChatMessageLength}
          placeholder="e.g. Can we go to the park at 4 pm?"
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={streaming || !draft.trim()}>
          {streaming ? "Answering…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
