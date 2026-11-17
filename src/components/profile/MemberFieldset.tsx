import { CheckboxCard } from "@/components/ui/CheckboxCard";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { LIMITS } from "@/lib/constants";
import { AGE_LABELS, CONDITION_LABELS } from "@/lib/client/labels";
import type { FormMember } from "@/lib/client/profileForm";
import type { HealthCondition } from "@/lib/types";
import { typedEntries } from "@/lib/utils";

const AGE_OPTIONS = typedEntries(AGE_LABELS).map(([value, label]) => ({ value, label }));

interface Props {
  index: number;
  member: FormMember;
  labelError?: string;
  removable: boolean;
  onChange: (patch: Partial<FormMember>) => void;
  onToggleCondition: (condition: HealthCondition) => void;
  onRemove: () => void;
}

/** One household member: name, age group and health conditions. */
export function MemberFieldset({
  index,
  member,
  labelError,
  removable,
  onChange,
  onToggleCondition,
  onRemove,
}: Props) {
  const prefix = `members-${index}`;
  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-4">
      <legend className="px-1 font-bold">Person {index + 1}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id={`${prefix}-label`}
          label="Name or nickname"
          value={member.label}
          maxLength={LIMITS.maxLabelLength}
          autoComplete="off"
          error={labelError}
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <SelectField
          id={`${prefix}-ageGroup`}
          label="Age group"
          value={member.ageGroup}
          options={AGE_OPTIONS}
          onChange={(ageGroup) => onChange({ ageGroup })}
        />
      </div>
      <fieldset>
        <legend className="label">Health conditions (optional)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {typedEntries(CONDITION_LABELS).map(([value, label]) => (
            <CheckboxCard
              key={value}
              id={`${prefix}-${value}`}
              checked={member.conditions.includes(value)}
              onChange={() => onToggleCondition(value)}
            >
              {label}
            </CheckboxCard>
          ))}
        </div>
      </fieldset>
      {removable && (
        <button type="button" className="btn btn-secondary" onClick={onRemove}>
          Remove person {index + 1}
          <span className="sr-only"> ({member.label || "unnamed"})</span>
        </button>
      )}
    </fieldset>
  );
}
