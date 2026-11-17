import { AQI_LABELS } from "@/lib/constants";
import { hourLabel } from "@/lib/engine/windows";
import type { ForecastPoint } from "@/lib/types";

/** The forecast as an accessible data table (equivalent to the chart). */
export function ForecastTable({ points }: { points: readonly ForecastPoint[] }) {
  return (
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
  );
}
