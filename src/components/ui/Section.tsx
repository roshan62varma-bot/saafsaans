import type { ReactNode } from "react";

interface Props {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}

/** A landmark-labelled dashboard section with a consistent heading level. */
export function Section({ id, title, intro, children, action }: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`${id}-title`} className="text-2xl font-bold">
            {title}
          </h2>
          {intro && <p className="mt-1 max-w-3xl text-muted">{intro}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
