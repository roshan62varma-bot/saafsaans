"use client";

import { useState } from "react";
import { ChoiceGroup } from "@/components/ui/ChoiceGroup";
import { AUDIENCE_LABELS, LANGUAGE_LABELS } from "@/lib/client/labels";
import { messageOf, postJson } from "@/lib/client/api";
import { typedEntries as entries } from "@/lib/utils";
import type { AdvisoryResponse, Audience, Language, Profile } from "@/lib/types";

/** Generates a shareable advisory for a school, society, workplace or family group. */
export function CommunityAdvisory({ profile }: { profile: Profile }) {
  const [audience, setAudience] = useState<Audience>("society");
  const [language, setLanguage] = useState<Language>(profile.language);
  const [result, setResult] = useState<(AdvisoryResponse & { language: Language }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  async function generate() {
    setBusy(true);
    setError(null);
    setCopied("");
    try {
      const data = await postJson<AdvisoryResponse>("/api/advisory", {
        profile,
        audience,
        language,
      });
      setResult({ ...data, language });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.message);
      setCopied("Copied to clipboard.");
    } catch {
      setCopied("Copy failed — select the text and copy it manually.");
    }
  }

  return (
    <div className="card space-y-4">
      <ChoiceGroup
        name="audience"
        legend="Who is it for?"
        columns={2}
        value={audience}
        onChange={setAudience}
        options={entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <ChoiceGroup
        name="advisory-language"
        legend="Language"
        columns={2}
        value={language}
        onChange={setLanguage}
        options={entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void generate()}
        disabled={busy}
      >
        {busy ? "Writing advisory…" : "Write advisory"}
      </button>

      <div aria-live="polite" className="space-y-3">
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        {result && (
          <>
            <h3 className="text-lg font-bold">Ready to share</h3>
            <p
              lang={result.language}
              className="whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-4"
            >
              {result.message}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
                Copy text
              </button>
              <a
                className="btn btn-secondary"
                href={`https://wa.me/?text=${encodeURIComponent(result.message)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            <p role="status" className="hint">
              {copied}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
