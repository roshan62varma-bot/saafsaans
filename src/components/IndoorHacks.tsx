import type { Cost, IndoorHack, PurifierAdvice } from "@/lib/types";

const COST_LABEL: Record<Cost, string> = {
  free: "Free",
  low: "Low cost (under ₹3,000)",
  medium: "Medium cost",
  high: "Investment (₹10,000+)",
};

/** Indoor-air actions ranked for this home and budget, plus purifier sizing. */
export function IndoorHacks({
  hacks,
  purifier,
}: {
  hacks: readonly IndoorHack[];
  purifier: PurifierAdvice;
}) {
  return (
    <div className="space-y-4">
      <div className="card grid gap-4 sm:grid-cols-3">
        <div>
          <p className="hint">Your bedroom volume</p>
          <p className="text-2xl font-bold">{purifier.roomVolumeM3} m³</p>
        </div>
        <div>
          <p className="hint">Purifier size you need (CADR)</p>
          <p className="text-2xl font-bold">
            {purifier.recommendedCadrM3h} m³/h{" "}
            <span className="text-base font-normal">({purifier.recommendedCadrCfm} CFM)</span>
          </p>
        </div>
        <div>
          <p className="hint">Bedroom PM2.5: without → with</p>
          <p className="text-2xl font-bold">
            {purifier.indoorPm25Without} → {purifier.indoorPm25With}{" "}
            <span className="text-base font-normal">µg/m³</span>
          </p>
        </div>
      </div>
      <ol className="grid gap-3 md:grid-cols-2">
        {hacks.map((hack, i) => (
          <li key={hack.id} className="card space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-lg font-bold">
                <span className="text-accent">{i + 1}.</span> {hack.title}
              </h3>
              <span className="badge border-line text-muted">{COST_LABEL[hack.cost]}</span>
            </div>
            <ul className="list-disc space-y-1 pl-5">
              {hack.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <p className="rounded-lg bg-accent-soft px-3 py-1">
              <strong>Impact: </strong>
              {hack.impact}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
