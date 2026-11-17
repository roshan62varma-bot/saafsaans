import { ForecastBars } from "@/components/forecast/ForecastBars";
import { ForecastTable } from "@/components/forecast/ForecastTable";
import { AQI_LABELS } from "@/lib/constants";
import { hourLabel } from "@/lib/engine/windows";
import type { ForecastPoint } from "@/lib/types";

const describe = (p: ForecastPoint) =>
  `${p.aqi} (${AQI_LABELS[p.category]}) at ${hourLabel(p.time)}`;

/** Text alternative: where the forecast peaks and dips (earliest low, latest high on ties). */
export function summarizeForecast(points: readonly ForecastPoint[]): string {
  const [first, ...rest] = points;
  if (!first) return "No forecast available.";
  const low = rest.reduce((min, p) => (p.aqi < min.aqi ? p : min), first);
  const high = rest.reduce((max, p) => (p.aqi >= max.aqi ? p : max), first);
  return `Hourly AQI forecast for the next ${points.length} hours. Lowest ${describe(low)}; highest ${describe(high)}.`;
}

/**
 * Lightweight forecast chart with a text summary and an equivalent data table for
 * screen-reader and keyboard users. Both scroll areas are focusable (WCAG 2.1.1).
 */
export function ForecastChart({ points }: { points: readonly ForecastPoint[] }) {
  if (points.length === 0) {
    return <p className="text-muted">No forecast available for this location.</p>;
  }
  return (
    <figure className="card space-y-3">
      <figcaption className="font-bold">AQI hour by hour (from PM2.5)</figcaption>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Forecast chart, scrolls sideways"
      >
        <ForecastBars points={points} summary={summarizeForecast(points)} />
      </div>
      <details>
        <summary className="cursor-pointer font-bold underline">Show forecast as a table</summary>
        <div
          className="mt-3 max-h-80 overflow-y-auto"
          tabIndex={0}
          role="region"
          aria-label="Forecast table, scrollable"
        >
          <ForecastTable points={points} />
        </div>
      </details>
    </figure>
  );
}
