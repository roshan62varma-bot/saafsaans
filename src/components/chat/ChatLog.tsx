import type { ChatMessage, Language } from "@/lib/types";

const BUBBLE = {
  user: "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2 text-accent-ink",
  assistant: "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-2",
} as const;

const SPEAKER = { user: "You said: ", assistant: "Assistant: " } as const;

function ChatBubble({ message, pending }: { message: ChatMessage; pending: boolean }) {
  return (
    <div className={BUBBLE[message.role]}>
      <span className="sr-only">{SPEAKER[message.role]}</span>
      {message.content || (pending ? "Thinking…" : "")}
    </div>
  );
}

interface Props {
  messages: readonly ChatMessage[];
  streaming: boolean;
  language: Language;
}

/** The conversation as a focusable live log; announced once each answer completes. */
export function ChatLog({ messages, streaming, language }: Props) {
  return (
    <div
      role="log"
      tabIndex={0}
      aria-live="polite"
      aria-busy={streaming}
      aria-label="Conversation with the assistant"
      className="max-h-[28rem] space-y-3 overflow-y-auto"
      lang={language}
    >
      {messages.length === 0 ? (
        <p className="text-muted">
          Ask anything about today&apos;s air, your family&apos;s health or cleaner habits.
        </p>
      ) : (
        messages.map((m, i) => (
          <ChatBubble key={i} message={m} pending={streaming && i === messages.length - 1} />
        ))
      )}
    </div>
  );
}
