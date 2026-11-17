import { z } from "zod";
import { CACHE_TTL } from "@/lib/constants";
import { TtlCache } from "@/lib/cache";
import { UpstreamError, fetchJson } from "@/lib/http";
import { roundCoord } from "@/lib/utils";
import type { AirReading, AirSnapshot, Place } from "@/lib/types";

/** Open-Meteo Air Quality API (CAMS global forecast). Free, keyless, CC BY 4.0. */
const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const VARIABLES = "pm10,pm2_5,nitrogen_dioxide,ozone,us_aqi";

const value = z.number().nullable();
const responseSchema = z.object({
  utc_offset_seconds: z.number(),
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    pm10: value,
    pm2_5: value,
    nitrogen_dioxide: value,
    ozone: value,
    us_aqi: value,
  }),
  hourly: z.object({
    time: z.array(z.string()),
    pm10: z.array(value),
    pm2_5: z.array(value),
    nitrogen_dioxide: z.array(value),
    ozone: z.array(value),
    us_aqi: z.array(value),
  }),
});

type RawResponse = z.infer<typeof responseSchema>;

export function buildAirUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(roundCoord(latitude)),
    longitude: String(roundCoord(longitude)),
    current: VARIABLES,
    hourly: VARIABLES,
    timezone: "auto",
    forecast_days: "2",
  });
  return `${AIR_URL}?${params.toString()}`;
}

const toEpoch = (localTime: string, offsetSeconds: number) =>
  Date.parse(`${localTime}:00Z`) - offsetSeconds * 1000;

/** Air data for one grid cell; independent of who asked or what they called the place. */
export type CellData = Omit<AirSnapshot, "place">;

/** Converts Open-Meteo's column-oriented payload into typed hourly readings. */
export function parseAirResponse(raw: unknown, fetchedAt: number): CellData {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) throw new UpstreamError("Unexpected air-quality data format.");
  const data: RawResponse = parsed.data;
  const offset = data.utc_offset_seconds;
  const h = data.hourly;

  const hourly: AirReading[] = h.time.map((time, i) => ({
    time,
    epoch: toEpoch(time, offset),
    pm25: h.pm2_5[i] ?? null,
    pm10: h.pm10[i] ?? null,
    no2: h.nitrogen_dioxide[i] ?? null,
    o3: h.ozone[i] ?? null,
    usAqi: h.us_aqi[i] ?? null,
  }));

  const c = data.current;
  return {
    timezone: data.timezone,
    current: {
      time: c.time,
      epoch: toEpoch(c.time, offset),
      pm25: c.pm2_5,
      pm10: c.pm10,
      no2: c.nitrogen_dioxide,
      o3: c.ozone,
      usAqi: c.us_aqi,
    },
    hourly,
    fetchedAt,
  };
}

// Cached data depends only on coordinates; the caller's own place is attached per request.
const cache = new TtlCache<CellData>(CACHE_TTL.air);

/** Live and forecast air quality for a place, cached for 10 minutes per ~1 km cell. */
export async function getAir(place: Place): Promise<AirSnapshot> {
  const key = `${roundCoord(place.latitude)},${roundCoord(place.longitude)}`;
  const cell = await cache.getOrLoad(key, async () => {
    const raw = await fetchJson(buildAirUrl(place.latitude, place.longitude));
    return parseAirResponse(raw, Date.now());
  });
  return { ...cell, place };
}

/** Test hook. */
export const __airCache = cache;
