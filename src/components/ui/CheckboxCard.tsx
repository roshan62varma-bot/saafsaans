import type { ReactNode } from "react";

interface Props {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
}

/** Native checkbox rendered as a card; the input stays focusable and keyboard-operable. */
export function CheckboxCard({ id, checked, onChange, children, className = "" }: Props) {
  return (
    <div className="relative">
      <input
        type="checkbox"
        id={id}
        className="choice-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className={`choice ${className}`}>
        {children}
      </label>
    </div>
  );
}
