"use client";

import { AskAssistant } from "@/components/AskAssistant";
import { CommunityAdvisory } from "@/components/CommunityAdvisory";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AirSection, PlanSection } from "@/components/dashboard/Sections";
import { ImpactCalculator } from "@/components/ImpactCalculator";
import { IndoorHacks } from "@/components/IndoorHacks";
import { AsyncContent } from "@/components/ui/AsyncContent";
import { Section } from "@/components/ui/Section";
import { postJson } from "@/lib/client/api";
import { useRequest } from "@/lib/client/useRequest";
import type { InsightsResponse, PlanResponse, Profile } from "@/lib/types";

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
      <DashboardHeader profile={profile} onEdit={onEdit} />
      <AirSection insights={insights} />
      <PlanSection plan={plan} language={profile.language} />

      <Section
        id="indoor"
        title="Indoor air hacks"
        intro="Ranked for your home, cooking fuel and budget."
      >
        <AsyncContent data={facts} loadingLabel="Loading indoor tips…">
          {(f) => <IndoorHacks hacks={f.indoorHacks} purifier={f.purifier} />}
        </AsyncContent>
      </Section>

      <Section
        id="impact"
        title="Your impact"
        intro="See exactly how much cleaner choices cut emissions and your own exposure."
      >
        <AsyncContent data={facts} loadingLabel="Loading impact calculator…">
          {(f) => <ImpactCalculator facts={f} />}
        </AsyncContent>
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
