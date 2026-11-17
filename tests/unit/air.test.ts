import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __geocodeCache, parseGeocodeResponse, searchPlaces } from "@/lib/air/geocode";
import { __airCache, buildAirUrl, getAir, parseAirResponse } from "@/lib/air/openMeteo";
import { roundCoord } from "@/lib/utils";
import { rawAir } from "../fixtures";

const place = { name: "New Delhi", latitude: 28.6139, longitude: 77.209 };

beforeEach(() => {
  __airCache.clear();
  __geocodeCache.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("Open-Meteo air quality", () => {
  it("rounds coordinates to ~1 km and requests the needed variables", () => {
    expect(roundCoord(28.6139)).toBe(28.61);
    const url = new URL(buildAirUrl(place.latitude, place.longitude));
    expect(url.searchParams.get("latitude")).toBe("28.61");
    expect(url.searchParams.get("hourly")).toContain("pm2_5");
    expect(url.searchParams.get("timezone")).toBe("auto");
  });

  it("parses columns into hourly readings with correct UTC epochs", () => {
    const snap = parseAirResponse(rawAir, 123);
    expect(snap.current).toMatchObject({ pm25: 180, no2: 60, usAqi: 230 });
    expect(snap.current.epoch).toBe(Date.parse("2026-11-17T02:30:00Z"));
    expect(snap.hourly).toHaveLength(2);
    expect(snap.hourly[1]?.pm25).toBeNull();
    expect(snap.fetchedAt).toBe(123);
  });

  it("treats missing array entries as null", () => {
    const raw = {
      ...rawAir,
      hourly: { ...rawAir.hourly, pm10: [], nitrogen_dioxide: [], ozone: [], us_aqi: [] },
    };
    expect(parseAirResponse(raw, 0).hourly[0]).toMatchObject({
      pm10: null,
      no2: null,
      o3: null,
      usAqi: null,
    });
  });

  it("rejects malformed payloads", () => {
    expect(() => parseAirResponse({ nope: true }, 0)).toThrow(
      "Unexpected air-quality data format.",
    );
  });

  it("fetches once and serves neighbours from cache", async () => {
    const fetchMock = vi.fn(async () => Response.json(rawAir));
    vi.stubGlobal("fetch", fetchMock);
    await getAir(place);
    const neighbour = await getAir({ ...place, name: "Connaught Place", latitude: 28.6141 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The cached cell never leaks the first requester's place name.
    expect(neighbour.place.name).toBe("Connaught Place");
  });
});

describe("geocoding", () => {
  it("maps results and strips unsafe characters", () => {
    const places = parseGeocodeResponse({
      results: [
        {
          name: "Pune<script>",
          latitude: 18.5,
          longitude: 73.8,
          country: "India",
          admin1: "Maharashtra",
        },
        { name: "<>", latitude: 1, longitude: 2 },
      ],
    });
    expect(places[0]).toEqual({
      name: "Punescript",
      latitude: 18.5,
      longitude: 73.8,
      country: "India",
      region: "Maharashtra",
    });
    expect(places[1]).toMatchObject({ name: "Unknown place", country: undefined });
  });

  it("returns an empty list when there are no matches", () => {
    expect(parseGeocodeResponse({})).toEqual([]);
  });

  it("rejects malformed payloads", () => {
    expect(() => parseGeocodeResponse({ results: "x" })).toThrow(
      "Unexpected location data format.",
    );
  });

  it("caches case-insensitively", async () => {
    const fetchMock = vi.fn(async () => Response.json({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await searchPlaces("Delhi");
    await searchPlaces(" delhi ");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
