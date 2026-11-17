import { AQI_LABELS } from "@/lib/constants";
import { AQI_STYLE, RISK_STYLE } from "@/lib/client/aqiStyle";
import type { AqiCategory, RiskLevel } from "@/lib/types";

/** AQI category shown as shape + text + colour (never colour alone). */
export function AqiBadge({ category, value }: { category: AqiCategory; value?: number }) {
  const style = AQI_STYLE[category];
  return (
    <span className={`badge ${style.badge}`}>
      <span aria-hidden="true">{style.shape}</span>
      {AQI_LABELS[category]}
      {value !== undefined && <span>· AQI {value}</span>}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const style = RISK_STYLE[level];
  return <span className={`badge ${style.badge}`}>{style.label}</span>;
}
