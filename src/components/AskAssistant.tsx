"use client";

import type { FormEvent } from "react";
import { ChatLog } from "@/components/chat/ChatLog";
import { useChat } from "@/components/chat/useChat";
import { LIMITS } from "@/lib/constants";
import type { Profile } from "@/lib/types";

const SUGGESTIONS = [
  "Is it safe for my kids to play outside today?",
  "Which purifier should I buy for our bedroom?",
  "How can I make my commute less polluting?",
  "What should my grandmother avoid today?",
];

/** Streaming Q&A grounded in the household's live facts. */
export function AskAssistant({ profile }: { profile: Profile }) {
  const { messages, draft, setDraft, streaming, error, ask } = useChat(profile);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  return (
    <div className="card space-y-4">
      <ChatLog messages={messages} streaming={streaming} language={profile.language} />

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Suggested questions" role="group">
          {SUGGESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              className="btn btn-secondary text-sm"
              onClick={() => void ask(question)}
              disabled={streaming}
            >
              {question}
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
