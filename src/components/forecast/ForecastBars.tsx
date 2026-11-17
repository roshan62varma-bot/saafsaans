import { AQI_MAX } from "@/lib/constants";
import { AQI_STYLE } from "@/lib/client/aqiStyle";
import { hourLabel, localHour } from "@/lib/engine/windows";
import type { ForecastPoint } from "@/lib/types";

const BAR = 14;
const GAP = 4;
const HEIGHT = 160;
const AXIS = 22;
const GUIDES = [100, 200, 300, 400] as const;
/** Label the time axis every 6 hours. */
const TICK_EVERY_HOURS = 6;

const barX = (i: number) => i * (BAR + GAP);
const barY = (aqi: number) => HEIGHT - (Math.min(aqi, AQI_MAX) / AQI_MAX) * HEIGHT;

/** Hand-drawn SVG bars (no chart library); `summary` is the image's text alternative. */
export function ForecastBars({
  points,
  summary,
}: {
  points: readonly ForecastPoint[];
  summary: string;
}) {
  const width = points.length * (BAR + GAP);
  return (
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
            y1={barY(g)}
            y2={barY(g)}
            stroke="currentColor"
            strokeDasharray="3 4"
            strokeWidth={0.6}
          />
          <text x={width + 4} y={barY(g) + 4} fontSize={10} fill="currentColor">
            {g}
          </text>
        </g>
      ))}
      {points.map((p, i) => (
        <g key={p.time}>
          <rect
            x={barX(i)}
            y={barY(p.aqi)}
            width={BAR}
            height={HEIGHT - barY(p.aqi)}
            rx={3}
            className={AQI_STYLE[p.category].bar}
          />
          {localHour(p.time) % TICK_EVERY_HOURS === 0 && (
            <text x={barX(i)} y={HEIGHT + 16} fontSize={10} fill="currentColor">
              {hourLabel(p.time)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
