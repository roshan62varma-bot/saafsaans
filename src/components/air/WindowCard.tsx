import { AqiBadge } from "@/components/ui/AqiBadge";
import { windowSpan } from "@/lib/engine/windows";
import type { TimeWindow } from "@/lib/types";

const dayOf = (w: TimeWindow, today: string) =>
  w.start.slice(0, 10) === today ? "today" : "tomorrow";

interface Props {
  title: string;
  window: TimeWindow | null;
  /** Local date (`YYYY-MM-DD`) used to label the window "today" or "tomorrow". */
  today: string;
  tone: string;
}

/** One forecast window (cleanest, dirtiest, ventilation) with its PM2.5 and category. */
export function WindowCard({ title, window, today, tone }: Props) {
  return (
    <div className="rounded-xl border border-line p-4">
      <h3 className="font-bold">{title}</h3>
      {window ? (
        <>
          <p className="mt-1 text-2xl font-bold">
            {windowSpan(window)}{" "}
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
