import type { Ref } from "react";

interface Props {
  errors: Record<string, string>;
  ref?: Ref<HTMLDivElement>;
}

/**
 * GOV.UK-style error summary: receives focus after a failed submit and links each problem
 * to its field (WCAG 3.3.1 Error Identification, 2.4.3 Focus Order).
 */
export function ErrorSummary({ errors, ref }: Props) {
  const list = Object.entries(errors);
  if (list.length === 0) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className="card border-2 border-danger"
    >
      <h2 id="error-summary-title" className="text-xl font-bold">
        Please fix {list.length === 1 ? "1 problem" : `${list.length} problems`}
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {list.map(([id, message]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="font-bold text-danger underline"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.focus();
              }}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
