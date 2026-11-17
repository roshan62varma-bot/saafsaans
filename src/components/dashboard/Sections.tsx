import { AirNow } from "@/components/AirNow";
import { FamilyRisk } from "@/components/FamilyRisk";
import { ForecastChart } from "@/components/ForecastChart";
import { PlanView } from "@/components/PlanView";
import { AsyncContent } from "@/components/ui/AsyncContent";
import { Section } from "@/components/ui/Section";
import type { RequestResult } from "@/lib/client/useRequest";
import type { InsightsResponse, Language, PlanResponse } from "@/lib/types";

/** Live AQI, forecast chart and per-person risk. */
export function AirSection({ insights }: { insights: RequestResult<InsightsResponse> }) {
  return (
    <Section
      id="air"
      title="Air right now"
      intro="Live readings and the next 36 hours, translated into what they mean for you."
    >
      <AsyncContent
        data={insights.data}
        error={insights.error}
        onRetry={insights.retry}
        loadingLabel="Loading live air quality…"
        lines={5}
      >
        {({ facts, forecast }) => (
          <>
            <AirNow facts={facts} />
            <ForecastChart points={forecast} />
            <h3 className="text-xl font-bold">Risk for each person</h3>
            <FamilyRisk risks={facts.memberRisks} />
          </>
        )}
      </AsyncContent>
    </Section>
  );
}

interface PlanSectionProps {
  plan: RequestResult<PlanResponse>;
  language: Language;
}

/** The Gemini-written (or rule-based) daily routine. */
export function PlanSection({ plan, language }: PlanSectionProps) {
  return (
    <Section
      id="plan"
      title="Today's low-exposure routine"
      intro="Every step explains why it matters and what it changes."
    >
      <AsyncContent
        data={plan.data}
        error={plan.error}
        onRetry={plan.retry}
        loadingLabel="Writing your personalised plan…"
        lines={6}
      >
        {(p) => <PlanView plan={p.plan} source={p.source} language={language} />}
      </AsyncContent>
    </Section>
  );
}
