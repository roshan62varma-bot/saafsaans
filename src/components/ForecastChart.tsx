import { AQI_LABELS, AQI_MAX } from "@/lib/constants";
import { AQI_STYLE } from "@/lib/client/aqiStyle";
import { hourLabel, localHour } from "@/lib/engine/windows";
import type { ForecastPoint } from "@/lib/types";

const BAR = 14;
const GAP = 4;
const HEIGHT = 160;
const AXIS = 22;
const GUIDES = [100, 200, 300, 400] as const;

/** Text alternative: where the forecast peaks and dips. */
export function summarizeForecast(points: readonly ForecastPoint[]): string {
  if (points.length === 0) return "No forecast available.";
  const sorted = [...points].sort((a, b) => a.aqi - b.aqi);
  const low = sorted[0] as ForecastPoint;
  const high = sorted.at(-1) as ForecastPoint;
  return `Hourly AQI forecast for the next ${points.length} hours. Lowest ${low.aqi} (${AQI_LABELS[low.category]}) at ${hourLabel(low.time)}; highest ${high.aqi} (${AQI_LABELS[high.category]}) at ${hourLabel(high.time)}.`;
}

/**
 * Lightweight SVG bar chart (no chart library). The figure has a text summary and an
 * equivalent data table for screen-reader and keyboard users.
 */
export function ForecastChart({ points }: { points: readonly ForecastPoint[] }) {
  if (points.length === 0)
    return <p className="text-muted">No forecast available for this location.</p>;
  const width = points.length * (BAR + GAP);
  const y = (aqi: number) => HEIGHT - (Math.min(aqi, AQI_MAX) / AQI_MAX) * HEIGHT;
  const summary = summarizeForecast(points);

  return (
    <figure className="card space-y-3">
      <figcaption className="font-bold">AQI hour by hour (from PM2.5)</figcaption>
      {/* Scrollable on narrow screens, so it must be keyboard-reachable (WCAG 2.1.1). */}
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Forecast chart, scrolls sideways"
      >
        <svg
          viewBox={`0 0 ${width + 30} ${HEIGHT + AXIS}`}
          className="h-auto w-full min-w-[560px] text-muted"
          role="img"
          aria-label={summary}
        >
          {GUIDES.map((g) => (
            <g key={g}>
              <line
                x1={0}
                x2={width}
                y1={y(g)}
                y2={y(g)}
                stroke="currentColor"
                strokeDasharray="3 4"
                strokeWidth={0.6}
              />
              <text x={width + 4} y={y(g) + 4} fontSize={10} fill="currentColor">
                {g}
              </text>
            </g>
          ))}
          {points.map((p, i) => (
            <g key={p.time}>
              <rect
                x={i * (BAR + GAP)}
                y={y(p.aqi)}
                width={BAR}
                height={HEIGHT - y(p.aqi)}
                rx={3}
                className={AQI_STYLE[p.category].bar}
              />
              {localHour(p.time) % 6 === 0 && (
                <text x={i * (BAR + GAP)} y={HEIGHT + 16} fontSize={10} fill="currentColor">
                  {hourLabel(p.time)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <details>
        <summary className="cursor-pointer font-bold underline">Show forecast as a table</summary>
        <div
          className="mt-3 max-h-80 overflow-y-auto"
          tabIndex={0}
          role="region"
          aria-label="Forecast table, scrollable"
        >
          <table className="w-full text-left">
            <caption className="sr-only">Hourly forecast</caption>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">PM2.5 (µg/m³)</th>
                <th scope="col">AQI</th>
                <th scope="col">Category</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.time} className="border-t border-line">
                  <th scope="row" className="py-1 font-normal">
                    {p.time.slice(5, 10)} {hourLabel(p.time)}
                  </th>
                  <td>{p.pm25}</td>
                  <td>{p.aqi}</td>
                  <td>{AQI_LABELS[p.category]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
