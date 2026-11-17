"use client";

import { useState } from "react";
import { CheckboxCard } from "@/components/ui/CheckboxCard";
import { summarizePledges } from "@/lib/client/impactSummary";
import type { HouseholdSwap } from "@/lib/types";

/** Toggles an id in an immutable set. */
function toggled(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Household changes a family can commit to, with the yearly total of their pledges. */
export function HouseholdPledges({ swaps }: { swaps: readonly HouseholdSwap[] }) {
  const [pledged, setPledged] = useState<ReadonlySet<string>>(new Set());

  return (
    <div className="card space-y-4">
      <h3 className="text-xl font-bold">Household pledges</h3>
      <p className="text-muted">
        Tick the changes your family will make and see the yearly difference.
      </p>
      <ul className="space-y-2">
        {swaps.map((swap) => (
          <li key={swap.id}>
            <CheckboxCard
              id={`pledge-${swap.id}`}
              checked={pledged.has(swap.id)}
              onChange={() => setPledged((prev) => toggled(prev, swap.id))}
            >
              <span>
                <span className="block font-bold">{swap.title}</span>
                <span className="block text-sm">{swap.impact}</span>
              </span>
            </CheckboxCard>
          </li>
        ))}
      </ul>
      <output aria-live="polite" className="block rounded-lg bg-accent-soft px-3 py-2 font-bold">
        {summarizePledges(swaps, pledged)}
      </output>
    </div>
  );
}
