import { AqiBadge } from "@/components/ui/AqiBadge";
import { AQI_HEALTH, WHO_PM25_24H } from "@/lib/constants";
import { hourLabel } from "@/lib/engine/windows";
import type { FactSheet, TimeWindow } from "@/lib/types";

const span = (w: TimeWindow) => `${hourLabel(w.start)}–${hourLabel(w.end)}`;
const dayOf = (w: TimeWindow, today: string) =>
  w.start.slice(0, 10) === today ? "today" : "tomorrow";

function WindowCard({
  title,
  window,
  today,
  tone,
}: {
  title: string;
  window: TimeWindow | null;
  today: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <h3 className="font-bold">{title}</h3>
      {window ? (
        <>
          <p className="mt-1 text-2xl font-bold">
            {span(window)}{" "}
            <span className="text-base font-normal text-muted">{dayOf(window, today)}</span>
          </p>
          <p className="mt-1">
            PM2.5 ≈ {window.avgPm25} µg/m³ <AqiBadge category={window.aqi.category} />
          </p>
          <p className="hint mt-1">{tone}</p>
        </>
      ) : (
        <p className="mt-1 text-muted">Not enough forecast data yet.</p>
      )}
    </div>
  );
}

/** Current conditions with plain-language meaning and the key timing windows. */
export function AirNow({ facts }: { facts: FactSheet }) {
  const today = facts.localTime.slice(0, 10);
  const whoMultiple = Math.round((facts.pm25 / WHO_PM25_24H) * 10) / 10;

  return (
    <div className="space-y-4">
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
            <div>
              <dt className="hint">PM2.5</dt>
              <dd className="font-bold">{facts.pm25} µg/m³</dd>
            </div>
            <div>
              <dt className="hint">vs WHO safe limit</dt>
              <dd className="font-bold">{whoMultiple}×</dd>
            </div>
            <div>
              <dt className="hint">Main pollutant</dt>
              <dd className="font-bold">
                {facts.aqi.dominant.toUpperCase().replace("PM25", "PM2.5")}
              </dd>
            </div>
            <div>
              <dt className="hint">US AQI (EPA)</dt>
              <dd className="font-bold">{facts.usAqi ?? "—"}</dd>
            </div>
          </dl>
          <p className="hint">
            {facts.place} · forecast for {hourLabel(facts.localTime)} local time · next-36-hour peak
            AQI {facts.peakAqi.value}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <WindowCard
          title="Cleanest time to be outside"
          window={facts.bestWindow}
          today={today}
          tone="Schedule walks, play and errands here."
        />
        <WindowCard
          title="Dirtiest time — stay in"
          window={facts.worstWindow}
          today={today}
          tone="Keep windows shut and skip outdoor exercise."
        />
        <WindowCard
          title="Best hour to air out the home"
          window={facts.ventilationWindow}
          today={today}
          tone="Open windows for 10–15 minutes, then close them."
        />
      </div>
    </div>
  );
}
