import { AqiBadge } from "@/components/ui/AqiBadge";
import { AQI_HEALTH, WHO_PM25_24H } from "@/lib/constants";
import { hourLabel } from "@/lib/engine/windows";
import type { FactSheet, Pollutant } from "@/lib/types";

const POLLUTANT_LABEL: Record<Pollutant, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  no2: "NO2",
  o3: "O3",
};

/** How many times the WHO 24-hour PM2.5 guideline the current level is (one decimal). */
const whoMultiple = (pm25: number) => Math.round((pm25 / WHO_PM25_24H) * 10) / 10;

/** The headline AQI card: value, category, plain-language meaning and key pollutant figures. */
export function AqiSummary({ facts }: { facts: FactSheet }) {
  const figures = [
    ["PM2.5", `${facts.pm25} µg/m³`],
    ["vs WHO safe limit", `${whoMultiple(facts.pm25)}×`],
    ["Main pollutant", POLLUTANT_LABEL[facts.aqi.dominant]],
    ["US AQI (EPA)", facts.usAqi ?? "—"],
  ] as const;

  return (
    <div className="card grid gap-6 md:grid-cols-[auto_1fr]">
      <div className="text-center md:text-left">
        <p className="text-sm font-bold uppercase tracking-wide text-muted">AQI (CPCB)</p>
        <p className="font-display text-7xl font-bold leading-none">{facts.aqi.value}</p>
        <p className="mt-2">
          <AqiBadge category={facts.aqi.category} />
        </p>
      </div>
      <div className="space-y-3">
        <p className="text-lg">{AQI_HEALTH[facts.aqi.category]}</p>
        <p className="text-lg">
          Breathing this air all day is like smoking{" "}
          <strong className="text-2xl">{facts.cigarettesPerDay} cigarettes</strong>.
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          {figures.map(([label, value]) => (
            <div key={label}>
              <dt className="hint">{label}</dt>
              <dd className="font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="hint">
          {facts.place} · forecast for {hourLabel(facts.localTime)} local time · next-36-hour peak
          AQI {facts.peakAqi.value}
        </p>
      </div>
    </div>
  );
}
