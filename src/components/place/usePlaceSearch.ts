"use client";

import { useState } from "react";
import { getJson, messageOf } from "@/lib/client/api";
import type { Place } from "@/lib/types";
import { roundCoord } from "@/lib/utils";

const MIN_QUERY_LENGTH = 2;
const GEOLOCATION_OPTIONS: PositionOptions = { maximumAge: 600_000, timeout: 10_000 };

export const PLACE_MESSAGES = {
  tooShort: "Type at least 2 letters of your city.",
  searching: "Searching…",
  noResults: "No places found. Try another spelling.",
  found: (n: number) => `${n} places found. Choose one below.`,
  noGeolocation: "Location is not available in this browser. Please search instead.",
  located: "Using your current location.",
  locationFailed: "We couldn't get your location. Please search for your city.",
} as const;

/** City search and "use my location", with a single announced status message. */
export function usePlaceSearch(onSelect: (place: Place) => void) {
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const finish = (message: string) => {
    setBusy(false);
    setStatus(message);
  };

  async function search(query: string) {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) return finish(PLACE_MESSAGES.tooShort);
    setBusy(true);
    try {
      const { places } = await getJson<{ places: Place[] }>(
        `/api/geocode?q=${encodeURIComponent(q)}`,
      );
      setResults(places);
      finish(places.length ? PLACE_MESSAGES.found(places.length) : PLACE_MESSAGES.noResults);
    } catch (error) {
      finish(messageOf(error));
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) return finish(PLACE_MESSAGES.noGeolocation);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onSelect({
          name: "My location",
          latitude: roundCoord(coords.latitude),
          longitude: roundCoord(coords.longitude),
        });
        setResults([]);
        finish(PLACE_MESSAGES.located);
      },
      () => finish(PLACE_MESSAGES.locationFailed),
      GEOLOCATION_OPTIONS,
    );
  }

  return { results, busy, status: busy ? PLACE_MESSAGES.searching : status, search, locate };
}
