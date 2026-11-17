"use client";

import { PlacePicker } from "@/components/PlacePicker";
import { CommuteFields } from "@/components/profile/CommuteFields";
import { HomeFields } from "@/components/profile/HomeFields";
import { MemberFieldset } from "@/components/profile/MemberFieldset";
import { useProfileForm } from "@/components/profile/useProfileForm";
import { ErrorSummary } from "@/components/ui/ErrorSummary";
import { LIMITS } from "@/lib/constants";
import { SAMPLE_PROFILE } from "@/lib/client/profileForm";
import type { Profile } from "@/lib/types";

interface Props {
  initial: Profile | null;
  onSave: (profile: Profile) => void;
  onCancel?: () => void;
}

/** Household setup. Everything stays in the browser; nothing is sent until a plan is requested. */
export function ProfileForm({ initial, onSave, onCancel }: Props) {
  const {
    form,
    errors,
    summaryRef,
    update,
    updateMember,
    toggleCondition,
    addMember,
    removeMember,
    handleSubmit,
  } = useProfileForm(initial, onSave);

  return (
    <section aria-labelledby="setup-title" className="space-y-6">
      <div className="space-y-3">
        <h1 id="setup-title" className="text-3xl font-bold sm:text-4xl">
          {initial ? "Edit your household" : "Protect your family from winter smog"}
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Tell us a little about your home and routine. We combine live air-quality forecasts with
          your family&apos;s needs to plan a lower-exposure day — and show the real impact of every
          change.
        </p>
        {!initial && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onSave(SAMPLE_PROFILE)}
          >
            Try a sample Delhi family
          </button>
        )}
      </div>

      <ErrorSummary ref={summaryRef} errors={errors} />

      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="card space-y-3">
          <legend className="px-1 text-xl font-bold">1. Where do you live?</legend>
          <PlacePicker
            value={form.place}
            onChange={(place) => update("place", place)}
            error={errors["place-search"]}
          />
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="px-1 text-xl font-bold">2. Who lives with you?</legend>
          <p className="hint">
            Children, older adults and people with lung or heart conditions need extra protection.
          </p>
          <ol className="space-y-4">
            {form.members.map((member, i) => (
              <li key={member.id}>
                <MemberFieldset
                  index={i}
                  member={member}
                  labelError={errors[`members-${i}-label`]}
                  removable={form.members.length > 1}
                  onChange={(patch) => updateMember(i, patch)}
                  onToggleCondition={(condition) => toggleCondition(i, condition)}
                  onRemove={() => removeMember(i)}
                />
              </li>
            ))}
          </ol>
          {errors["add-member"] && <p className="error-text">Error: {errors["add-member"]}</p>}
          <button
            id="add-member"
            type="button"
            className="btn btn-secondary"
            onClick={addMember}
            disabled={form.members.length >= LIMITS.maxMembers}
          >
            + Add a person
          </button>
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="px-1 text-xl font-bold">3. Your daily commute</legend>
          <CommuteFields form={form} errors={errors} update={update} />
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="px-1 text-xl font-bold">4. Your home</legend>
          <HomeFields form={form} errors={errors} update={update} />
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn btn-primary text-lg">
            {initial ? "Save changes" : "Build my family's plan"}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
