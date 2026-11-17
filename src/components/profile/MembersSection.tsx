import { MemberFieldset } from "@/components/profile/MemberFieldset";
import { LIMITS } from "@/lib/constants";
import type { FieldErrors, FormMember } from "@/lib/client/profileForm";
import type { HealthCondition } from "@/lib/types";

interface Props {
  members: readonly FormMember[];
  errors: FieldErrors;
  onChange: (index: number, patch: Partial<FormMember>) => void;
  onToggleCondition: (index: number, condition: HealthCondition) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

/** The household list: one fieldset per person plus add/remove controls. */
export function MembersSection({
  members,
  errors,
  onChange,
  onToggleCondition,
  onAdd,
  onRemove,
}: Props) {
  return (
    <fieldset className="card space-y-4">
      <legend className="px-1 text-xl font-bold">2. Who lives with you?</legend>
      <p className="hint">
        Children, older adults and people with lung or heart conditions need extra protection.
      </p>
      <ol className="space-y-4">
        {members.map((member, i) => (
          <li key={member.id}>
            <MemberFieldset
              index={i}
              member={member}
              labelError={errors[`members-${i}-label`]}
              removable={members.length > 1}
              onChange={(patch) => onChange(i, patch)}
              onToggleCondition={(condition) => onToggleCondition(i, condition)}
              onRemove={() => onRemove(i)}
            />
          </li>
        ))}
      </ol>
      {errors["add-member"] && <p className="error-text">Error: {errors["add-member"]}</p>}
      <button
        id="add-member"
        type="button"
        className="btn btn-secondary"
        onClick={onAdd}
        disabled={members.length >= LIMITS.maxMembers}
      >
        + Add a person
      </button>
    </fieldset>
  );
}
