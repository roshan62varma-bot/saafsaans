import { RiskBadge } from "@/components/ui/AqiBadge";
import type { MemberRisk } from "@/lib/types";

/** Personal risk and protection advice for each household member. */
export function FamilyRisk({ risks }: { risks: readonly MemberRisk[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {risks.map((r) => (
        <li key={r.memberId} className="card space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-bold">{r.label}</h3>
            <RiskBadge level={r.level} />
          </div>
          {r.sensitive && <p className="hint">In a sensitive group — needs extra protection.</p>}
          <p>{r.outdoorAdvice}</p>
          <p>
            <strong>Mask: </strong>
            {r.maskAdvice}
          </p>
        </li>
      ))}
    </ul>
  );
}
