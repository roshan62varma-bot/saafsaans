import { SAMPLE_PROFILE } from "@/lib/client/profileForm";
import type { Profile } from "@/lib/types";

interface Props {
  editing: boolean;
  onSample: (profile: Profile) => void;
}

/** Page heading and purpose; first-time visitors can load a sample household. */
export function SetupIntro({ editing, onSample }: Props) {
  return (
    <div className="space-y-3">
      <h1 id="setup-title" className="text-3xl font-bold sm:text-4xl">
        {editing ? "Edit your household" : "Protect your family from winter smog"}
      </h1>
      <p className="max-w-2xl text-lg text-muted">
        Tell us a little about your home and routine. We combine live air-quality forecasts with
        your family&apos;s needs to plan a lower-exposure day — and show the real impact of every
        change.
      </p>
      {!editing && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onSample(SAMPLE_PROFILE)}
        >
          Try a sample Delhi family
        </button>
      )}
    </div>
  );
}
