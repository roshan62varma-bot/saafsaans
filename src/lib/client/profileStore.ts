"use client";

import { useSyncExternalStore } from "react";
import { profileSchema } from "@/lib/schemas";
import type { Profile } from "@/lib/types";

/**
 * The household profile lives only in this browser (localStorage) — it is never stored
 * on the server. Reads are validated, so a tampered or outdated entry is ignored.
 */
export const PROFILE_KEY = "saafsaans.profile.v1";

const listeners = new Set<() => void>();
let snapshot: { raw: string | null; value: Profile | null } = { raw: null, value: null };

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
}

/** Current profile, memoised on the raw string so React sees a stable reference. */
export function readProfile(): Profile | null {
  const raw = readRaw();
  if (raw === snapshot.raw) return snapshot.value;
  let value: Profile | null = null;
  if (raw) {
    try {
      const parsed = profileSchema.safeParse(JSON.parse(raw));
      value = parsed.success ? parsed.data : null;
    } catch {
      value = null;
    }
  }
  snapshot = { raw, value };
  return value;
}

const emit = () => listeners.forEach((l) => l());

export function saveProfile(profile: Profile): void {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Storage blocked (private mode): keep the profile in memory for this session.
    snapshot = { raw: JSON.stringify(profile), value: profile };
  }
  emit();
}

export function clearProfile(): void {
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Ignore: nothing persisted.
  }
  snapshot = { raw: null, value: null };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** React hook: the saved profile, or `null` before setup (and during server rendering). */
export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, readProfile, () => null);
}
