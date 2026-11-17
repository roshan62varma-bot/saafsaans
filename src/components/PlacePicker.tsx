"use client";

import { useId, useState } from "react";
import { PlaceResults, describePlace } from "@/components/place/PlaceResults";
import { usePlaceSearch } from "@/components/place/usePlaceSearch";
import type { Place } from "@/lib/types";

interface Props {
  value: Place | null;
  onChange: (place: Place) => void;
  error?: string;
}

/**
 * City search with explicit results (a radio group) instead of an auto-complete popup,
 * which is simpler and more reliable for keyboard and screen-reader users.
 */
export function PlacePicker({ value, onChange, error }: Props) {
  const [query, setQuery] = useState("");
  const { results, busy, status, search, locate } = usePlaceSearch(onChange);
  const hintId = useId();
  const errorId = useId();
  const describedBy = error ? `${hintId} ${errorId}` : hintId;

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
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            void search(query);
          }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void search(query)}
          disabled={busy}
        >
          Search
        </button>
        <button type="button" className="btn btn-secondary" onClick={locate} disabled={busy}>
          Use my location
        </button>
      </div>

      <p role="status" className="hint min-h-6">
        {status}
      </p>

      <PlaceResults results={results} selected={value} onSelect={onChange} />

      {value && (
        <p className="font-bold">
          Selected: <span className="font-normal">{describePlace(value)}</span>
        </p>
      )}
    </div>
  );
}
