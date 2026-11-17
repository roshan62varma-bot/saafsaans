import { AqiSummary } from "@/components/air/AqiSummary";
import { WindowCard } from "@/components/air/WindowCard";
import type { FactSheet } from "@/lib/types";

const WINDOWS = [
  {
    key: "bestWindow",
    title: "Cleanest time to be outside",
    tone: "Schedule walks, play and errands here.",
  },
  {
    key: "worstWindow",
    title: "Dirtiest time — stay in",
    tone: "Keep windows shut and skip outdoor exercise.",
  },
  {
    key: "ventilationWindow",
    title: "Best hour to air out the home",
    tone: "Open windows for 10–15 minutes, then close them.",
  },
] as const;

/** Current conditions with plain-language meaning and the key timing windows. */
export function AirNow({ facts }: { facts: FactSheet }) {
  const today = facts.localTime.slice(0, 10);
  return (
    <div className="space-y-4">
      <AqiSummary facts={facts} />
      <div className="grid gap-3 md:grid-cols-3">
        {WINDOWS.map(({ key, title, tone }) => (
          <WindowCard key={key} title={title} window={facts[key]} today={today} tone={tone} />
        ))}
      </div>
    </div>
  );
}
