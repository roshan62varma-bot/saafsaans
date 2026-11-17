import { MemberNotes, PlanHeader, RoutineStep, TopActions } from "@/components/plan/PlanParts";
import type { Language, Plan, Source } from "@/lib/types";

interface Props {
  plan: Plan;
  source: Source;
  language: Language;
}

/** The personalised daily plan, with every step's reason and measured impact. */
export function PlanView({ plan, source, language }: Props) {
  return (
    <div lang={language} className="space-y-5">
      <PlanHeader plan={plan} source={source} />
      <div className="space-y-3">
        <h3 className="text-xl font-bold">Your day, step by step</h3>
        <ol className="space-y-3">
          {plan.routine.map((block, i) => (
            <RoutineStep key={`${block.time}-${i}`} block={block} />
          ))}
        </ol>
      </div>
      <MemberNotes notes={plan.memberNotes} />
      <TopActions actions={plan.topActions} />
    </div>
  );
}
