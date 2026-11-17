"use client";

import { useRef, useState, type FormEvent } from "react";
import { PlacePicker } from "@/components/PlacePicker";
import { ChoiceGroup } from "@/components/ui/ChoiceGroup";
import { TextField } from "@/components/ui/TextField";
import { LIMITS, MODE_FACTORS } from "@/lib/constants";
import {
  AGE_LABELS,
  BUDGET_LABELS,
  CONDITION_LABELS,
  FUEL_LABELS,
  LANGUAGE_LABELS,
  SEALING_LABELS,
} from "@/lib/client/labels";
import {
  SAMPLE_PROFILE,
  fromFormState,
  newMember,
  toFormState,
  type FieldErrors,
  type FormMember,
  type FormState,
} from "@/lib/client/profileForm";
import type { AgeGroup, CommuteMode, CookingFuel, HealthCondition, Profile } from "@/lib/types";

interface Props {
  initial: Profile | null;
  onSave: (profile: Profile) => void;
  onCancel?: () => void;
}

const newId = () => crypto.randomUUID();
const entries = <K extends string, V>(record: Record<K, V>) => Object.entries(record) as [K, V][];

/** Household setup. Everything stays in the browser; nothing is sent until a plan is requested. */
export function ProfileForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial, newId()));
  const [errors, setErrors] = useState<FieldErrors>({});
  const summaryRef = useRef<HTMLDivElement>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateMember = (index: number, patch: Partial<FormMember>) =>
    setForm((f) => ({
      ...f,
      members: f.members.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));

  const toggleCondition = (index: number, condition: HealthCondition) =>
    setForm((f) => ({
      ...f,
      members: f.members.map((m, i) =>
        i !== index
          ? m
          : {
              ...m,
              conditions: m.conditions.includes(condition)
                ? m.conditions.filter((c) => c !== condition)
                : [...m.conditions, condition],
            },
      ),
    }));

  const addMember = () =>
    setForm((f) => ({ ...f, members: [...f.members, newMember(newId(), f.members.length)] }));

  const removeMember = (index: number) => {
    setForm((f) => ({ ...f, members: f.members.filter((_, i) => i !== index) }));
    // Keep keyboard users oriented after the row disappears.
    requestAnimationFrame(() => document.getElementById("add-member")?.focus());
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = fromFormState(form);
    if (result.ok) {
      setErrors({});
      onSave(result.profile);
      return;
    }
    setErrors(result.errors);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  const errorList = Object.entries(errors);
  const commuting = form.commuteMode !== "none";

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

      {errorList.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="error-summary-title"
          className="card border-2 border-danger"
        >
          <h2 id="error-summary-title" className="text-xl font-bold">
            Please fix {errorList.length === 1 ? "1 problem" : `${errorList.length} problems`}
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errorList.map(([id, message]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="font-bold text-danger underline"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.focus();
                  }}
                >
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="card space-y-3">
          <legend className="px-1 text-xl font-bold">1. Where do you live?</legend>
          <PlacePicker
            value={form.place}
            onChange={(p) => update("place", p)}
            error={errors["place-search"]}
          />
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="px-1 text-xl font-bold">2. Who lives with you?</legend>
          <p className="hint">
            Children, older adults and people with lung or heart conditions need extra protection.
          </p>
          <ol className="space-y-4">
            {form.members.map((m, i) => (
              <li key={m.id}>
                <fieldset className="space-y-3 rounded-xl border border-line p-4">
                  <legend className="px-1 font-bold">Person {i + 1}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      id={`members-${i}-label`}
                      label="Name or nickname"
                      value={m.label}
                      maxLength={LIMITS.maxLabelLength}
                      autoComplete="off"
                      error={errors[`members-${i}-label`]}
                      onChange={(e) => updateMember(i, { label: e.target.value })}
                    />
                    <div>
                      <label htmlFor={`members-${i}-ageGroup`} className="label">
                        Age group
                      </label>
                      <select
                        id={`members-${i}-ageGroup`}
                        className="field mt-1"
                        value={m.ageGroup}
                        onChange={(e) => updateMember(i, { ageGroup: e.target.value as AgeGroup })}
                      >
                        {entries(AGE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <fieldset>
                    <legend className="label">Health conditions (optional)</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {entries(CONDITION_LABELS).map(([value, label]) => {
                        const id = `members-${i}-${value}`;
                        return (
                          <div key={value} className="relative">
                            <input
                              type="checkbox"
                              id={id}
                              className="choice-input"
                              checked={m.conditions.includes(value)}
                              onChange={() => toggleCondition(i, value)}
                            />
                            <label htmlFor={id} className="choice">
                              {label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </fieldset>
                  {form.members.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => removeMember(i)}
                    >
                      Remove person {i + 1}
                      <span className="sr-only"> ({m.label || "unnamed"})</span>
                    </button>
                  )}
                </fieldset>
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
          <div>
            <label htmlFor="commute-mode" className="label">
              Main way you travel to work or college
            </label>
            <select
              id="commute-mode"
              className="field mt-1 max-w-md"
              value={form.commuteMode}
              onChange={(e) => update("commuteMode", e.target.value as CommuteMode)}
            >
              {entries(MODE_FACTORS).map(([value, f]) => (
                <option key={value} value={value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          {commuting && (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id="commute-distanceKm"
                label="One-way distance (km)"
                type="number"
                inputMode="decimal"
                min={0}
                max={LIMITS.maxDistanceKm}
                step="0.5"
                value={form.distanceKm}
                error={errors["commute-distanceKm"]}
                onChange={(e) => update("distanceKm", e.target.value)}
              />
              <TextField
                id="commute-daysPerWeek"
                label="Days per week"
                type="number"
                inputMode="numeric"
                min={0}
                max={7}
                step="1"
                value={form.daysPerWeek}
                error={errors["commute-daysPerWeek"]}
                onChange={(e) => update("daysPerWeek", e.target.value)}
              />
            </div>
          )}
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="px-1 text-xl font-bold">4. Your home</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cookingFuel" className="label">
                Main cooking fuel
              </label>
              <select
                id="cookingFuel"
                className="field mt-1"
                value={form.cookingFuel}
                onChange={(e) => update("cookingFuel", e.target.value as CookingFuel)}
              >
                {entries(FUEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <TextField
              id="bedroomAreaM2"
              label="Main bedroom size (m²)"
              hint="A 10 × 12 ft room is about 11 m²."
              type="number"
              inputMode="decimal"
              min={LIMITS.minBedroomAreaM2}
              max={LIMITS.maxBedroomAreaM2}
              value={form.bedroomAreaM2}
              error={errors.bedroomAreaM2}
              onChange={(e) => update("bedroomAreaM2", e.target.value)}
            />
          </div>
          <div className="relative">
            <input
              type="checkbox"
              id="hasPurifier"
              className="choice-input"
              checked={form.hasPurifier}
              onChange={(e) => update("hasPurifier", e.target.checked)}
            />
            <label htmlFor="hasPurifier" className="choice max-w-md">
              We already own an air purifier
            </label>
          </div>
          <ChoiceGroup
            name="sealing"
            legend="How draughty are your doors and windows?"
            value={form.sealing}
            onChange={(v) => update("sealing", v)}
            options={entries(SEALING_LABELS).map(([value, o]) => ({ value, ...o }))}
          />
          <ChoiceGroup
            name="budget"
            legend="Budget for air-quality improvements"
            value={form.budget}
            onChange={(v) => update("budget", v)}
            options={entries(BUDGET_LABELS).map(([value, o]) => ({ value, ...o }))}
          />
          <ChoiceGroup
            name="language"
            legend="Language for your plan"
            columns={2}
            value={form.language}
            onChange={(v) => update("language", v)}
            options={entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
          />
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
