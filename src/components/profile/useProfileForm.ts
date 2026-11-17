"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  fromFormState,
  newMember,
  toFormState,
  type FieldErrors,
  type FormMember,
  type FormState,
} from "@/lib/client/profileForm";
import type { HealthCondition, Profile } from "@/lib/types";

const newId = () => crypto.randomUUID();

/** Focuses an element after React has committed the current update. */
const focusSoon = (getElement: () => HTMLElement | null | undefined) =>
  requestAnimationFrame(() => getElement()?.focus());

/** State, member editing and validated submission for the household form. */
export function useProfileForm(initial: Profile | null, onSave: (profile: Profile) => void) {
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
      members: f.members.map((m, i) => {
        if (i !== index) return m;
        const conditions = m.conditions.includes(condition)
          ? m.conditions.filter((c) => c !== condition)
          : [...m.conditions, condition];
        return { ...m, conditions };
      }),
    }));

  const addMember = () =>
    setForm((f) => ({ ...f, members: [...f.members, newMember(newId(), f.members.length)] }));

  const removeMember = (index: number) => {
    setForm((f) => ({ ...f, members: f.members.filter((_, i) => i !== index) }));
    // Keep keyboard users oriented after the row disappears.
    focusSoon(() => document.getElementById("add-member"));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = fromFormState(form);
    if (result.ok) {
      setErrors({});
      onSave(result.profile);
      return;
    }
    setErrors(result.errors);
    focusSoon(() => summaryRef.current);
  };

  return {
    form,
    errors,
    summaryRef,
    update,
    updateMember,
    toggleCondition,
    addMember,
    removeMember,
    handleSubmit,
  };
}
