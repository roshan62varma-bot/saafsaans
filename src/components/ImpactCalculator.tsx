import { CommuteCalculator } from "@/components/impact/CommuteCalculator";
import { HouseholdPledges } from "@/components/impact/HouseholdPledges";
import type { FactSheet } from "@/lib/types";

/**
 * Interactive impact section: a commute "what if?" calculator and household pledges.
 * All maths runs in the browser with the same engine the server uses.
 */
export function ImpactCalculator({ facts }: { facts: FactSheet }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CommuteCalculator facts={facts} />
      <HouseholdPledges swaps={facts.householdSwaps} />
    </div>
  );
}
