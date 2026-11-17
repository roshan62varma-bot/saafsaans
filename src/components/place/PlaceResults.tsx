import type { Place } from "@/lib/types";

/** "Pune, Maharashtra, India" style label. */
export const describePlace = (p: Place) => [p.name, p.region, p.country].filter(Boolean).join(", ");

const samePlace = (a: Place | null, b: Place) =>
  a?.latitude === b.latitude && a.longitude === b.longitude;

interface Props {
  results: readonly Place[];
  selected: Place | null;
  onSelect: (place: Place) => void;
}

/** Search results as a native radio group: simple and reliable for keyboard and screen readers. */
export function PlaceResults({ results, selected, onSelect }: Props) {
  if (results.length === 0) return null;
  return (
    <fieldset>
      <legend className="sr-only">Search results</legend>
      <ul className="space-y-1">
        {results.map((place, i) => {
          const id = `place-result-${i}`;
          return (
            <li key={id} className="relative">
              <input
                type="radio"
                id={id}
                name="place-result"
                className="choice-input"
                checked={samePlace(selected, place)}
                onChange={() => onSelect(place)}
              />
              <label htmlFor={id} className="choice">
                {describePlace(place)}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
