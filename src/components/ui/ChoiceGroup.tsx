"use client";

interface Option<V extends string> {
  value: V;
  label: string;
  hint?: string;
}

interface Props<V extends string> {
  name: string;
  legend: string;
  options: readonly Option<V>[];
  value: V;
  onChange: (value: V) => void;
  columns?: 1 | 2 | 3;
}

const GRID = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" } as const;

/** Accessible radio group rendered as cards; uses native inputs for keyboard support. */
export function ChoiceGroup<V extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  columns = 3,
}: Props<V>) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className={`grid gap-2 ${GRID[columns]}`}>
        {options.map((o) => {
          const id = `${name}-${o.value}`;
          return (
            <div key={o.value} className="relative">
              <input
                type="radio"
                id={id}
                name={name}
                value={o.value}
                className="choice-input"
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              <label htmlFor={id} className="choice">
                <span>
                  <span className="block font-bold">{o.label}</span>
                  {o.hint && <span className="hint">{o.hint}</span>}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
