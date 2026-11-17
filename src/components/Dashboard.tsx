"use client";

import { AirNow } from "@/components/AirNow";
import { AskAssistant } from "@/components/AskAssistant";
import { CommunityAdvisory } from "@/components/CommunityAdvisory";
import { FamilyRisk } from "@/components/FamilyRisk";
import { ForecastChart } from "@/components/ForecastChart";
import { ImpactCalculator } from "@/components/ImpactCalculator";
import { IndoorHacks } from "@/components/IndoorHacks";
import { PlanView } from "@/components/PlanView";
import { Section } from "@/components/ui/Section";
import { ErrorNotice, Loading } from "@/components/ui/Status";
import { postJson } from "@/lib/client/api";
import { useRequest } from "@/lib/client/useRequest";
import type { InsightsResponse, PlanResponse, Profile } from "@/lib/types";

const NAV = [
  ["air", "Air now"],
  ["plan", "Today's plan"],
  ["indoor", "Indoor air"],
  ["impact", "Your impact"],
  ["ask", "Ask"],
  ["community", "Community"],
] as const;

interface Props {
  profile: Profile;
  onEdit: () => void;
}

/**
 * Loads fast engine insights and the (slower) AI plan in parallel, so the dashboard is
 * useful immediately while Gemini writes the personalised plan.
 */
export function Dashboard({ profile, onEdit }: Props) {
  const key = JSON.stringify(profile);
  const insights = useRequest(key, (signal) =>
    postJson<InsightsResponse>("/api/insights", profile, signal),
  );
  const plan = useRequest(key, (signal) => postJson<PlanResponse>("/api/plan", profile, signal));
  const facts = insights.data?.facts;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Your smog-season plan</h1>
          <p className="text-muted">
            {profile.place.name} · {profile.members.length}{" "}
            {profile.members.length === 1 ? "person" : "people"}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onEdit}>
          Edit household
        </button>
      </div>

      <nav
        aria-label="Dashboard sections"
        className="sticky top-0 z-10 -mx-4 border-b border-line bg-paper/95 px-4 py-2 backdrop-blur"
      >
        <ul className="flex gap-1 overflow-x-auto">
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 font-bold hover:bg-surface-2"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section
        id="air"
        title="Air right now"
        intro="Live readings and the next 36 hours, translated into what they mean for you."
      >
        {insights.error ? (
          <ErrorNotice message={insights.error} onRetry={insights.retry} />
        ) : !insights.data || !facts ? (
          <Loading label="Loading live air quality…" lines={5} />
        ) : (
          <>
            <AirNow facts={facts} />
            <ForecastChart points={insights.data.forecast} />
            <h3 className="text-xl font-bold">Risk for each person</h3>
            <FamilyRisk risks={facts.memberRisks} />
          </>
        )}
      </Section>

      <Section
        id="plan"
        title="Today's low-exposure routine"
        intro="Every step explains why it matters and what it changes."
      >
        {plan.error ? (
          <ErrorNotice message={plan.error} onRetry={plan.retry} />
        ) : !plan.data ? (
          <Loading label="Writing your personalised plan…" lines={6} />
        ) : (
          <PlanView plan={plan.data.plan} source={plan.data.source} language={profile.language} />
        )}
      </Section>

      <Section
        id="indoor"
        title="Indoor air hacks"
        intro="Ranked for your home, cooking fuel and budget."
      >
        {facts ? (
          <IndoorHacks hacks={facts.indoorHacks} purifier={facts.purifier} />
        ) : (
          <Loading label="Loading indoor tips…" />
        )}
      </Section>

      <Section
        id="impact"
        title="Your impact"
        intro="See exactly how much cleaner choices cut emissions and your own exposure."
      >
        {facts ? (
          <ImpactCalculator facts={facts} />
        ) : (
          <Loading label="Loading impact calculator…" />
        )}
      </Section>

      <Section
        id="ask"
        title="Ask the assistant"
        intro="Answers use your live air data and household details."
      >
        <AskAssistant profile={profile} />
      </Section>

      <Section
        id="community"
        title="Share with your community"
        intro="Smog is shared — so is the fix. Create a ready-to-send advisory."
      >
        <CommunityAdvisory profile={profile} />
      </Section>
    </div>
  );
}
