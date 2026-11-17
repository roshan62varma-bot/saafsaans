import type { AirReading, AirSnapshot, Profile } from "@/lib/types";

/** IST offset used by fixtures: local time = UTC + 5:30. */
export const IST_OFFSET_MS = 5.5 * 3_600_000;

export const toEpoch = (localTime: string) => Date.parse(`${localTime}:00Z`) - IST_OFFSET_MS;

/** Typical Delhi winter diurnal PM2.5 curve: dirty nights and mornings, cleaner afternoons. */
export function winterPm25(hour: number): number {
  if (hour >= 13 && hour <= 16) return 90 + (hour - 13) * 5;
  if (hour >= 10 && hour <= 12) return 160 - (hour - 10) * 20;
  if (hour >= 17 && hour <= 20) return 180 + (hour - 17) * 30;
  return 250;
}

export function reading(time: string, pm25: number | null, extra: Partial<AirReading> = {}): AirReading {
  return {
    time,
    epoch: toEpoch(time),
    pm25,
    pm10: pm25 === null ? null : Math.round(pm25 * 1.6),
    no2: 60,
    o3: 20,
    usAqi: pm25 === null ? null : 300,
    ...extra,
  };
}

/** 48 hourly readings starting at local midnight on 2026-11-17. */
export function makeHourly(pm25ForHour: (h: number) => number | null = winterPm25): AirReading[] {
  return Array.from({ length: 48 }, (_, i) => {
    const day = i < 24 ? "17" : "18";
    const hour = String(i % 24).padStart(2, "0");
    return reading(`2026-11-${day}T${hour}:00`, pm25ForHour(i % 24));
  });
}

export const NOW_LOCAL = "2026-11-17T08:00";
export const NOW = toEpoch(NOW_LOCAL);

export function makeAir(overrides: Partial<AirSnapshot> = {}): AirSnapshot {
  const hourly = makeHourly();
  return {
    place: { name: "New Delhi", latitude: 28.61, longitude: 77.21, country: "India" },
    timezone: "Asia/Kolkata",
    current: reading(NOW_LOCAL, 250),
    hourly,
    fetchedAt: NOW,
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    place: { name: "New Delhi", latitude: 28.61, longitude: 77.21, country: "India" },
    members: [
      { id: "m1", label: "Me", ageGroup: "adult", conditions: [] },
      { id: "m2", label: "Aarav", ageGroup: "child", conditions: ["asthma"] },
      { id: "m3", label: "Dadi", ageGroup: "elderly", conditions: ["heart"] },
    ],
    commute: { mode: "car_petrol", distanceKm: 12, daysPerWeek: 5 },
    cookingFuel: "lpg",
    hasPurifier: false,
    bedroomAreaM2: 12,
    sealing: "average",
    budget: "medium",
    language: "en",
    ...overrides,
  };
}
