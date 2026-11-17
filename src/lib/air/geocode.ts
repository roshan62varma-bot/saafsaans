import { z } from "zod";
import { CACHE_TTL } from "@/lib/constants";
import { TtlCache } from "@/lib/cache";
import { UpstreamError, fetchJson } from "@/lib/http";
import type { Place } from "@/lib/types";

/** Open-Meteo Geocoding API (GeoNames). Free, keyless. */
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const MAX_RESULTS = 5;

const responseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

/** Strips anything outside the characters our place schema accepts. */
const clean = (s: string | undefined) =>
  s?.replace(/[^\p{L}\p{M}\p{N} .,'()&/-]/gu, "").slice(0, 80) || undefined;

export function parseGeocodeResponse(raw: unknown): Place[] {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) throw new UpstreamError("Unexpected location data format.");
  return (parsed.data.results ?? []).slice(0, MAX_RESULTS).map((r) => ({
    name: clean(r.name) ?? "Unknown place",
    latitude: r.latitude,
    longitude: r.longitude,
    country: clean(r.country),
    region: clean(r.admin1),
  }));
}

const cache = new TtlCache<Place[]>(CACHE_TTL.geocode);

/** Searches for places by name. Results are cached for a day. */
export function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim().toLowerCase();
  return cache.getOrLoad(q, async () => {
    const params = new URLSearchParams({
      name: q,
      count: String(MAX_RESULTS),
      language: "en",
      format: "json",
    });
    return parseGeocodeResponse(await fetchJson(`${GEOCODE_URL}?${params.toString()}`));
  });
}

export const __geocodeCache = cache;
