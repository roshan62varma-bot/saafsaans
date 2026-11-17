"use client";

import { PlacePicker } from "@/components/PlacePicker";
import { CommuteFields } from "@/components/profile/CommuteFields";
import { HomeFields } from "@/components/profile/HomeFields";
import { MembersSection } from "@/components/profile/MembersSection";
import { SetupIntro } from "@/components/profile/SetupIntro";
import { useProfileForm } from "@/components/profile/useProfileForm";
import { ErrorSummary } from "@/components/ui/ErrorSummary";
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
      <SetupIntro editing={initial !== null} onSample={onSave} />
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

        <MembersSection
          members={form.members}
          errors={errors}
          onChange={updateMember}
          onToggleCondition={toggleCondition}
          onAdd={addMember}
          onRemove={removeMember}
        />

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
