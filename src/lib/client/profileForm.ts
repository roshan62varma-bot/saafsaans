import { profileSchema } from "@/lib/schemas";
import type {
  AgeGroup,
  Budget,
  CommuteMode,
  CookingFuel,
  HealthCondition,
  HomeSealing,
  Language,
  Member,
  Place,
  Profile,
} from "@/lib/types";

/** Form state keeps numbers as strings so partially typed values are preserved. */
export interface FormMember {
  id: string;
  label: string;
  ageGroup: AgeGroup;
  conditions: HealthCondition[];
}

export interface FormState {
  place: Place | null;
  members: FormMember[];
  commuteMode: CommuteMode;
  distanceKm: string;
  daysPerWeek: string;
  cookingFuel: CookingFuel;
  hasPurifier: boolean;
  bedroomAreaM2: string;
  sealing: HomeSealing;
  budget: Budget;
  language: Language;
}

/** A realistic Delhi household, used for the one-click demo. */
export const SAMPLE_PROFILE: Profile = {
  place: {
    name: "New Delhi",
    latitude: 28.61,
    longitude: 77.21,
    country: "India",
    region: "Delhi",
  },
  members: [
    { id: "sample-1", label: "Priya", ageGroup: "adult", conditions: [] },
    { id: "sample-2", label: "Aarav", ageGroup: "child", conditions: ["asthma"] },
    { id: "sample-3", label: "Dadi", ageGroup: "elderly", conditions: ["heart"] },
  ],
  commute: { mode: "car_petrol", distanceKm: 12, daysPerWeek: 5 },
  cookingFuel: "lpg",
  hasPurifier: false,
  bedroomAreaM2: 12,
  sealing: "average",
  budget: "medium",
  language: "en",
};

export function newMember(id: string, index: number): FormMember {
  return { id, label: index === 0 ? "Me" : "", ageGroup: "adult", conditions: [] };
}

export function toFormState(profile: Profile | null, firstMemberId: string): FormState {
  if (!profile) {
    return {
      place: null,
      members: [newMember(firstMemberId, 0)],
      commuteMode: "metro",
      distanceKm: "10",
      daysPerWeek: "5",
      cookingFuel: "lpg",
      hasPurifier: false,
      bedroomAreaM2: "12",
      sealing: "average",
      budget: "low",
      language: "en",
    };
  }
  return {
    place: profile.place,
    members: profile.members.map((m) => ({ ...m, conditions: [...m.conditions] })),
    commuteMode: profile.commute.mode,
    distanceKm: String(profile.commute.distanceKm),
    daysPerWeek: String(profile.commute.daysPerWeek),
    cookingFuel: profile.cookingFuel,
    hasPurifier: profile.hasPurifier,
    bedroomAreaM2: String(profile.bedroomAreaM2),
    sealing: profile.sealing,
    budget: profile.budget,
    language: profile.language,
  };
}

/** Parses a typed number; blank or malformed input becomes NaN so validation reports it. */
const num = (s: string) => (s.trim() === "" ? Number.NaN : Number(s));

/** DOM id of the input that a validation path refers to. */
export function fieldId(path: readonly PropertyKey[]): string {
  const [head, index, field] = path.map(String);
  if (head === "place") return "place-search";
  if (head === "members")
    return index === undefined ? "add-member" : `members-${index}-${field ?? "label"}`;
  if (head === "commute") return `commute-${index ?? "mode"}`;
  return head ?? "form";
}

export type FieldErrors = Record<string, string>;

export type FormResult = { ok: true; profile: Profile } | { ok: false; errors: FieldErrors };

const FRIENDLY: Record<string, string> = {
  "place-search": "Choose your city or use your current location",
  "commute-distanceKm": "Enter a one-way distance between 0 and 100 km",
  "commute-daysPerWeek": "Enter a whole number of days from 0 to 7",
  bedroomAreaM2: "Enter a bedroom area between 4 and 60 m²",
};

/** Validates the form with the same schema the server uses. */
export function fromFormState(form: FormState): FormResult {
  const commuting = form.commuteMode !== "none";
  const candidate = {
    place: form.place,
    members: form.members.map<Member>((m) => ({ ...m, label: m.label.trim() })),
    commute: {
      mode: form.commuteMode,
      distanceKm: commuting ? num(form.distanceKm) : 0,
      daysPerWeek: commuting ? num(form.daysPerWeek) : 0,
    },
    cookingFuel: form.cookingFuel,
    hasPurifier: form.hasPurifier,
    bedroomAreaM2: num(form.bedroomAreaM2),
    sealing: form.sealing,
    budget: form.budget,
    language: form.language,
  };
  const result = profileSchema.safeParse(candidate);
  if (result.success) return { ok: true, profile: result.data };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const id = fieldId(issue.path);
    errors[id] ??=
      FRIENDLY[id] ?? (id.endsWith("-label") ? `Name: ${issue.message}` : issue.message);
  }
  return { ok: false, errors };
}
