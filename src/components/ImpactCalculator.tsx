"use client";

import { useId, useState } from "react";
import { LIMITS, MODE_FACTORS } from "@/lib/constants";
import { compareModes, round, treesEquivalent } from "@/lib/engine/impact";
import { typedKeys } from "@/lib/utils";
import type { CommuteMode, FactSheet } from "@/lib/types";

const WEEKS = 52;
const MODES = typedKeys(MODE_FACTORS).filter((m) => m !== "none");

const clampNumber = (raw: string, min: number, max: number) => {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

/**
 * Interactive "what if I switch?" calculator plus household pledges. All maths runs in
 * the browser with the same engine the server uses, so results update instantly.
 */
export function ImpactCalculator({ facts }: { facts: FactSheet }) {
  const startMode = facts.commute.mode === "none" ? "car_petrol" : facts.commute.mode;
  const [from, setFrom] = useState<CommuteMode>(startMode);
  const [to, setTo] = useState<CommuteMode>(facts.commuteSwaps[0]?.to ?? "metro");
  const [distance, setDistance] = useState(String(facts.commute.distanceKm || 10));
  const [days, setDays] = useState(String(facts.commute.daysPerWeek || 5));
  const [pledged, setPledged] = useState<ReadonlySet<string>>(new Set());
  const ids = { from: useId(), to: useId(), distance: useId(), days: useId() };

  const swap = compareModes(
    {
      mode: from,
      distanceKm: clampNumber(distance, 0, LIMITS.maxDistanceKm),
      daysPerWeek: Math.round(clampNumber(days, 0, 7)),
    },
    to,
    facts.pm25,
  );
  const yearlyCo2 = round(swap.weeklyCo2KgSaved * WEEKS, 0);
  const yearlyPm = round(swap.weeklyPmGramsSaved * WEEKS, 0);
  const trees = treesEquivalent(Math.max(0, swap.weeklyCo2KgSaved));
  const better = swap.weeklyCo2KgSaved > 0 || swap.weeklyPmGramsSaved > 0;

  const pledgeSwaps = facts.householdSwaps.filter((s) => pledged.has(s.id));
  const pledgePm = round(pledgeSwaps.reduce((t, s) => t + s.weeklyPmGramsSaved, 0) * WEEKS, 0);
  const pledgeCo2 = round(pledgeSwaps.reduce((t, s) => t + s.weeklyCo2KgSaved, 0) * WEEKS, 0);

  const toggle = (id: string) =>
    setPledged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const modeOptions = MODES.map((m) => (
    <option key={m} value={m}>
      {MODE_FACTORS[m].label}
    </option>
  ));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-4">
        <h3 className="text-xl font-bold">What if I change my commute?</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={ids.from}>
              Now I travel by
            </label>
            <select
              id={ids.from}
              className="field"
              value={from}
              onChange={(e) => setFrom(e.target.value as CommuteMode)}
            >
              {modeOptions}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={ids.to}>
              I could switch to
            </label>
            <select
              id={ids.to}
              className="field"
              value={to}
              onChange={(e) => setTo(e.target.value as CommuteMode)}
            >
              {modeOptions}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={ids.distance}>
              One-way distance (km)
            </label>
            <input
              id={ids.distance}
              className="field"
              type="number"
              inputMode="decimal"
              min={0}
              max={LIMITS.maxDistanceKm}
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor={ids.days}>
              Days per week
            </label>
            <input
              id={ids.days}
              className="field"
              type="number"
              inputMode="numeric"
              min={0}
              max={7}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="hint">CO2 saved per year</dt>
            <dd className="text-2xl font-bold">{yearlyCo2} kg</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="hint">PM2.5 not emitted per year</dt>
            <dd className="text-2xl font-bold">{yearlyPm} g</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="hint">Equal to trees absorbing CO2</dt>
            <dd className="text-2xl font-bold">{trees}</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="hint">Your own smog dose on the trip</dt>
            <dd className="text-2xl font-bold">
              {swap.exposureChangePct > 0 ? "+" : ""}
              {swap.exposureChangePct}%
            </dd>
          </div>
        </dl>
        <output aria-live="polite" className="block rounded-lg bg-accent-soft px-3 py-2">
          {better
            ? `Switching from ${MODE_FACTORS[from].label.toLowerCase()} to ${MODE_FACTORS[to].label.toLowerCase()} saves ${swap.weeklyCo2KgSaved} kg CO2 and ${swap.weeklyPmGramsSaved} g PM2.5 every week.`
            : "That switch would not reduce emissions — try a cleaner option."}
          {swap.exposureChangePct > 0 &&
            better &&
            " Walking or cycling raises your own dose because you breathe harder — pick quieter streets and the cleanest hours."}
        </output>
      </div>

      <div className="card space-y-4">
        <h3 className="text-xl font-bold">Household pledges</h3>
        <p className="text-muted">
          Tick the changes your family will make and see the yearly difference.
        </p>
        <ul className="space-y-2">
          {facts.householdSwaps.map((s) => (
            <li key={s.id} className="relative">
              <input
                type="checkbox"
                id={`pledge-${s.id}`}
                className="choice-input"
                checked={pledged.has(s.id)}
                onChange={() => toggle(s.id)}
              />
              <label htmlFor={`pledge-${s.id}`} className="choice">
                <span>
                  <span className="block font-bold">{s.title}</span>
                  <span className="block text-sm">{s.impact}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <output aria-live="polite" className="block rounded-lg bg-accent-soft px-3 py-2 font-bold">
          {pledgeSwaps.length === 0
            ? "No pledges yet."
            : `Your pledges keep about ${pledgePm} g of PM2.5${pledgeCo2 > 0 ? ` and ${pledgeCo2} kg of CO2` : ""} out of the air each year.`}
        </output>
      </div>
    </div>
  );
}
