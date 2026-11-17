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
      <div className="card space-y-2 border-l-8 border-l-accent">
        <p className="text-sm font-bold text-muted">
          {source === "ai" ? (
            <>
              <span aria-hidden="true">✦ </span>Personalised by Gemini from your live air data
            </>
          ) : (
            "Built by our rule engine from your live air data"
          )}
        </p>
        <p className="font-display text-2xl font-bold">{plan.headline}</p>
        <p className="text-lg">{plan.summary}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-bold">Your day, step by step</h3>
        <ol className="space-y-3">
          {plan.routine.map((block, i) => (
            <li key={`${block.time}-${i}`} className="card grid gap-2 sm:grid-cols-[9rem_1fr]">
              <p className="font-bold text-accent">{block.time}</p>
              <div className="space-y-1">
                <h4 className="text-lg font-bold">{block.activity}</h4>
                <p>{block.advice}</p>
                <p className="text-muted">
                  <strong className="text-ink">Why: </strong>
                  {block.why}
                </p>
                <p className="rounded-lg bg-accent-soft px-3 py-1">
                  <strong>Impact: </strong>
                  {block.impact}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {plan.memberNotes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xl font-bold">For each person</h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {plan.memberNotes.map((note) => (
              <li key={note.member} className="card">
                <p className="font-bold">{note.member}</p>
                <p>{note.advice}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.topActions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xl font-bold">Biggest wins this week</h3>
          <ol className="grid gap-3 md:grid-cols-3">
            {plan.topActions.map((a, i) => (
              <li key={a.action} className="card space-y-1">
                <p className="font-display text-3xl font-bold text-accent" aria-hidden="true">
                  {i + 1}
                </p>
                <p className="font-bold">{a.action}</p>
                <p>{a.impact}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
