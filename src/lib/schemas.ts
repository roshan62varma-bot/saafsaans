/**
 * Runtime validation. Every byte that crosses a trust boundary — request bodies,
 * query strings, upstream API payloads and model output — is parsed through these.
 */
import { z } from "zod";
import { LIMITS } from "@/lib/constants";

/** Names and labels: letters (any script, incl. Devanagari), digits, spaces, light punctuation. */
const SAFE_TEXT = /^[\p{L}\p{M}\p{N} .,'()&/-]+$/u;

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Required")
    .max(max, `Use at most ${max} characters`)
    .regex(SAFE_TEXT, "Use letters, numbers and basic punctuation only");

export const latitudeSchema = z.coerce.number().finite().min(-90).max(90);
export const longitudeSchema = z.coerce.number().finite().min(-180).max(180);

export const placeSchema = z.object({
  name: safeText(LIMITS.maxPlaceNameLength),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  country: safeText(LIMITS.maxPlaceNameLength).optional(),
  region: safeText(LIMITS.maxPlaceNameLength).optional(),
});

export const memberSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,36}$/i),
  label: safeText(LIMITS.maxLabelLength),
  ageGroup: z.enum(["infant", "child", "adult", "elderly"]),
  conditions: z.array(z.enum(["asthma", "copd", "heart", "pregnancy"])).max(4),
});

export const commuteSchema = z.object({
  mode: z.enum([
    "walk",
    "cycle",
    "metro",
    "bus",
    "auto",
    "two_wheeler",
    "car_petrol",
    "car_diesel",
    "car_ev",
    "none",
  ]),
  distanceKm: z.number().finite().min(0).max(LIMITS.maxDistanceKm),
  daysPerWeek: z.number().int().min(0).max(7),
});

export const profileSchema = z.object({
  place: placeSchema,
  members: z.array(memberSchema).min(1, "Add at least one person").max(LIMITS.maxMembers),
  commute: commuteSchema,
  cookingFuel: z.enum(["lpg", "png", "electric", "biomass", "kerosene"]),
  hasPurifier: z.boolean(),
  bedroomAreaM2: z.number().finite().min(LIMITS.minBedroomAreaM2).max(LIMITS.maxBedroomAreaM2),
  sealing: z.enum(["leaky", "average", "sealed"]),
  budget: z.enum(["low", "medium", "high"]),
  language: z.enum(["en", "hi"]),
});

export const airQuerySchema = z.object({
  lat: latitudeSchema,
  lon: longitudeSchema,
});

export const geocodeQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Type at least 2 characters")
    .max(LIMITS.maxQueryLength)
    .regex(SAFE_TEXT, "Use letters, numbers and basic punctuation only"),
});

export const chatRequestSchema = z.object({
  profile: profileSchema,
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(LIMITS.maxChatMessageLength),
      }),
    )
    .min(1)
    .max(LIMITS.maxChatMessages)
    .refine((m) => m.at(-1)?.role === "user", "Last message must be from the user"),
});

export const advisoryRequestSchema = z.object({
  profile: profileSchema,
  audience: z.enum(["school", "society", "workplace", "family_group"]),
  language: z.enum(["en", "hi"]),
});

/** Shape Gemini must return for a plan. Validated before anything reaches the browser. */
export const planSchema = z.object({
  headline: z.string().describe("One line: AQI category, value and place."),
  summary: z
    .string()
    .describe(
      "2–3 sentences: what today's air means for this family, using the cigarette equivalence.",
    ),
  routine: z
    .array(
      z.object({
        time: z.string().describe("Time span such as '07:00–08:00' or a label such as 'Commute'."),
        activity: z.string(),
        advice: z.string().describe("Concrete, specific instruction."),
        why: z.string().describe("One-sentence reason."),
        impact: z.string().describe("Quantified effect using only numbers from FACTS."),
      }),
    )
    .min(4)
    .max(8),
  memberNotes: z
    .array(z.object({ member: z.string(), advice: z.string() }))
    .describe("One entry per household member, using their label."),
  topActions: z
    .array(z.object({ action: z.string(), impact: z.string() }))
    .min(1)
    .max(3)
    .describe("The three highest-impact changes this week."),
});

export const advisorySchema = z.object({
  message: z.string().describe("The ready-to-share advisory text."),
});

export type ProfileInput = z.infer<typeof profileSchema>;
