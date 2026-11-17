interface Option<V extends string> {
  value: V;
  label: string;
}

interface Props<V extends string> {
  id: string;
  label: string;
  value: V;
  options: readonly Option<V>[];
  onChange: (value: V) => void;
  className?: string;
}

/** Labelled native select, typed to its option values (no casts at call sites). */
export function SelectField<V extends string>({
  id,
  label,
  value,
  options,
  onChange,
  className = "",
}: Props<V>) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select
        id={id}
        className={`field mt-1 ${className}`}
        value={value}
        onChange={(e) => {
          const next = options.find((o) => o.value === e.target.value);
          if (next) onChange(next.value);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
