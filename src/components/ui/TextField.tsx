import type { InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

/** Labelled input with hint and error text programmatically associated (WCAG 1.3.1, 3.3.1). */
export function TextField({ id, label, hint, error, className = "", ...input }: Props) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {hint && (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="error-text">
          Error: {error}
        </span>
      )}
      <input
        id={id}
        className="field mt-1"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
    </div>
  );
}
