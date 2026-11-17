import type {
  AgeGroup,
  Audience,
  Budget,
  CookingFuel,
  HealthCondition,
  HomeSealing,
  Language,
} from "@/lib/types";

export const AGE_LABELS: Record<AgeGroup, string> = {
  infant: "Baby (under 2)",
  child: "Child (2–17)",
  adult: "Adult (18–64)",
  elderly: "Older adult (65+)",
};

export const CONDITION_LABELS: Record<HealthCondition, string> = {
  asthma: "Asthma",
  copd: "COPD / chronic lung disease",
  heart: "Heart disease",
  pregnancy: "Pregnant",
};

export const FUEL_LABELS: Record<CookingFuel, string> = {
  lpg: "LPG cylinder",
  png: "Piped gas (PNG)",
  electric: "Electric / induction",
  biomass: "Wood, coal or dung (chulha)",
  kerosene: "Kerosene",
};

export const SEALING_LABELS: Record<HomeSealing, { label: string; hint: string }> = {
  leaky: { label: "Draughty", hint: "Gaps around doors/windows, you can feel air moving" },
  average: { label: "Average", hint: "Typical flat or house" },
  sealed: { label: "Well sealed", hint: "Weather-stripped, double-glazed or new build" },
};

export const BUDGET_LABELS: Record<Budget, { label: string; hint: string }> = {
  low: { label: "Free or under ₹3,000", hint: "Habits and DIY fixes" },
  medium: { label: "Up to ₹10,000", hint: "Adds sealing and filters" },
  high: { label: "Above ₹10,000", hint: "Includes HEPA purifiers" },
};

export const LANGUAGE_LABELS: Record<Language, string> = { en: "English", hi: "हिन्दी (Hindi)" };

export const AUDIENCE_LABELS: Record<Audience, string> = {
  school: "School",
  society: "Housing society / RWA",
  workplace: "Workplace",
  family_group: "Family WhatsApp group",
};
