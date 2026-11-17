import type { ReactNode } from "react";

/** One labelled figure inside a `<dl>`. */
export function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <dt className="hint">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}
