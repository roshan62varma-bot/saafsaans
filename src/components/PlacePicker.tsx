"use client";

import { useId, useState } from "react";
import { getJson, messageOf } from "@/lib/client/api";
import type { Place } from "@/lib/types";

interface Props {
  value: Place | null;
  onChange: (place: Place) => void;
  error?: string;
}

type Status = { kind: "idle" } | { kind: "searching" } | { kind: "message"; text: string };

const describe = (p: Place) => [p.name, p.region, p.country].filter(Boolean).join(", ");

/**
 * City search with explicit results (a radio group) instead of an auto-complete popup,
 * which is simpler and more reliable for keyboard and screen-reader users.
 */
export function PlacePicker({ value, onChange, error }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const hintId = useId();
  const errorId = useId();
  const statusId = useId();

  async function search() {
    const q = query.trim();
    if (q.length < 2) {
      setStatus({ kind: "message", text: "Type at least 2 letters of your city." });
      return;
    }
    setStatus({ kind: "searching" });
    try {
      const { places } = await getJson<{ places: Place[] }>(
        `/api/geocode?q=${encodeURIComponent(q)}`,
      );
      setResults(places);
      setStatus({
        kind: "message",
        text: places.length
          ? `${places.length} places found. Choose one below.`
          : "No places found. Try another spelling.",
      });
    } catch (e) {
      setStatus({ kind: "message", text: messageOf(e) });
    }
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setStatus({
        kind: "message",
        text: "Location is not available in this browser. Please search instead.",
      });
      return;
    }
    setStatus({ kind: "searching" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Round to ~1 km: enough for air data, without sharing a precise address.
        const round = (n: number) => Math.round(n * 100) / 100;
        onChange({
          name: "My location",
          latitude: round(pos.coords.latitude),
          longitude: round(pos.coords.longitude),
        });
        setResults([]);
        setStatus({ kind: "message", text: "Using your current location." });
      },
      () =>
        setStatus({
          kind: "message",
          text: "We couldn't get your location. Please search for your city.",
        }),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-3">
      <label htmlFor="place-search" className="label">
        City or town
      </label>
      <span id={hintId} className="hint">
        Search by name, then pick the right match. We only use it to fetch local air data.
      </span>
      {error && (
        <span id={errorId} className="error-text">
          Error: {error}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          id="place-search"
          className="field max-w-sm flex-1"
          type="search"
          autoComplete="address-level2"
          value={query}
          maxLength={60}
          aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(" ")}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void search()}
          disabled={status.kind === "searching"}
        >
          Search
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={useMyLocation}
          disabled={status.kind === "searching"}
        >
          Use my location
        </button>
      </div>

      <p id={statusId} role="status" className="hint min-h-6">
        {status.kind === "searching" ? "Searching…" : status.kind === "message" ? status.text : ""}
      </p>

      {results.length > 0 && (
        <fieldset>
          <legend className="sr-only">Search results</legend>
          <ul className="space-y-1">
            {results.map((place, i) => {
              const id = `place-result-${i}`;
              const checked =
                value?.latitude === place.latitude && value.longitude === place.longitude;
              return (
                <li key={id} className="relative">
                  <input
                    type="radio"
                    id={id}
                    name="place-result"
                    className="choice-input"
                    checked={checked}
                    onChange={() => onChange(place)}
                  />
                  <label htmlFor={id} className="choice">
                    {describe(place)}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {value && (
        <p className="font-bold">
          Selected: <span className="font-normal">{describe(value)}</span>
        </p>
      )}
    </div>
  );
}
