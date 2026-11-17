"use client";

import { useId, useState } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { StatTile } from "@/components/ui/StatTile";
import { TextField } from "@/components/ui/TextField";
import { LIMITS, MODE_FACTORS } from "@/lib/constants";
import { clampInput, summarizeSwap } from "@/lib/client/impactSummary";
import { compareModes } from "@/lib/engine/impact";
import type { CommuteMode, FactSheet } from "@/lib/types";
import { typedKeys } from "@/lib/utils";

const MODE_OPTIONS = typedKeys(MODE_FACTORS)
  .filter((mode) => mode !== "none")
  .map((mode) => ({ value: mode, label: MODE_FACTORS[mode].label }));

/** "What if I switch?" — compares two commute modes with the same engine the server uses. */
export function CommuteCalculator({ facts }: { facts: FactSheet }) {
  const { commute } = facts;
  const [from, setFrom] = useState<CommuteMode>(
    commute.mode === "none" ? "car_petrol" : commute.mode,
  );
  const [to, setTo] = useState<CommuteMode>(facts.commuteSwaps[0]?.to ?? "metro");
  const [distance, setDistance] = useState(String(commute.distanceKm || 10));
  const [days, setDays] = useState(String(commute.daysPerWeek || 5));
  const id = useId();

  const swap = compareModes(
    {
      mode: from,
      distanceKm: clampInput(distance, 0, LIMITS.maxDistanceKm),
      daysPerWeek: Math.round(clampInput(days, 0, 7)),
    },
    to,
    facts.pm25,
  );
  const summary = summarizeSwap(swap);

  return (
    <div className="card space-y-4">
      <h3 className="text-xl font-bold">What if I change my commute?</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id={`${id}-from`}
          label="Now I travel by"
          value={from}
          options={MODE_OPTIONS}
          onChange={setFrom}
        />
        <SelectField
          id={`${id}-to`}
          label="I could switch to"
          value={to}
          options={MODE_OPTIONS}
          onChange={setTo}
        />
        <TextField
          id={`${id}-distance`}
          label="One-way distance (km)"
          type="number"
          inputMode="decimal"
          min={0}
          max={LIMITS.maxDistanceKm}
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
        />
        <TextField
          id={`${id}-days`}
          label="Days per week"
          type="number"
          inputMode="numeric"
          min={0}
          max={7}
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <StatTile label="CO2 saved per year" value={`${summary.yearlyCo2Kg} kg`} />
        <StatTile label="PM2.5 not emitted per year" value={`${summary.yearlyPmG} g`} />
        <StatTile label="Equal to trees absorbing CO2" value={summary.trees} />
        <StatTile label="Your own smog dose on the trip" value={summary.exposureLabel} />
      </dl>
      <output aria-live="polite" className="block rounded-lg bg-accent-soft px-3 py-2">
        {summary.message}
      </output>
    </div>
  );
}
