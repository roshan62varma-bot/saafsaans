"use client";

import { useState } from "react";
import { AdvisoryResult } from "@/components/advisory/AdvisoryResult";
import { ChoiceGroup } from "@/components/ui/ChoiceGroup";
import { AUDIENCE_LABELS, LANGUAGE_LABELS } from "@/lib/client/labels";
import { messageOf, postJson } from "@/lib/client/api";
import type { AdvisoryResponse, Audience, Language, Profile } from "@/lib/types";
import { typedEntries } from "@/lib/utils";

const AUDIENCE_OPTIONS = typedEntries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }));
const LANGUAGE_OPTIONS = typedEntries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }));

type Advisory = AdvisoryResponse & { language: Language };

/** Generates a shareable advisory for a school, society, workplace or family group. */
export function CommunityAdvisory({ profile }: { profile: Profile }) {
  const [audience, setAudience] = useState<Audience>("society");
  const [language, setLanguage] = useState<Language>(profile.language);
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const body = { profile, audience, language };
      const data = await postJson<AdvisoryResponse>("/api/advisory", body);
      setAdvisory({ ...data, language });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
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
        options={AUDIENCE_OPTIONS}
      />
      <ChoiceGroup
        name="advisory-language"
        legend="Language"
        columns={2}
        value={language}
        onChange={setLanguage}
        options={LANGUAGE_OPTIONS}
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
        {advisory && (
          <AdvisoryResult
            key={advisory.message}
            message={advisory.message}
            language={advisory.language}
          />
        )}
      </div>
    </div>
  );
}
