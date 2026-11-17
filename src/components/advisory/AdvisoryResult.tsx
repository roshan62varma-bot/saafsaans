"use client";

import { useState } from "react";
import type { Language } from "@/lib/types";

const COPY_STATUS = {
  done: "Copied to clipboard.",
  failed: "Copy failed — select the text and copy it manually.",
} as const;

interface Props {
  message: string;
  language: Language;
}

/** The generated advisory with copy and WhatsApp share actions. */
export function AdvisoryResult({ message, language }: Props) {
  const [copyStatus, setCopyStatus] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyStatus(COPY_STATUS.done);
    } catch {
      setCopyStatus(COPY_STATUS.failed);
    }
  }

  return (
    <>
      <h3 className="text-lg font-bold">Ready to share</h3>
      <p
        lang={language}
        className="whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-4"
      >
        {message}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
          Copy text
        </button>
        <a
          className="btn btn-secondary"
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <p role="status" className="hint">
        {copyStatus}
      </p>
    </>
  );
}
