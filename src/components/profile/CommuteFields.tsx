import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { LIMITS, MODE_FACTORS } from "@/lib/constants";
import type { FieldErrors, FormState } from "@/lib/client/profileForm";
import { typedEntries } from "@/lib/utils";

const MODE_OPTIONS = typedEntries(MODE_FACTORS).map(([value, f]) => ({ value, label: f.label }));

interface Props {
  form: FormState;
  errors: FieldErrors;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

/** Commute mode, distance and frequency (distance and days are hidden for non-commuters). */
export function CommuteFields({ form, errors, update }: Props) {
  return (
    <>
      <SelectField
        id="commute-mode"
        label="Main way you travel to work or college"
        className="max-w-md"
        value={form.commuteMode}
        options={MODE_OPTIONS}
        onChange={(mode) => update("commuteMode", mode)}
      />
      {form.commuteMode !== "none" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="commute-distanceKm"
            label="One-way distance (km)"
            type="number"
            inputMode="decimal"
            min={0}
            max={LIMITS.maxDistanceKm}
            step="0.5"
            value={form.distanceKm}
            error={errors["commute-distanceKm"]}
            onChange={(e) => update("distanceKm", e.target.value)}
          />
          <TextField
            id="commute-daysPerWeek"
            label="Days per week"
            type="number"
            inputMode="numeric"
            min={0}
            max={7}
            step="1"
            value={form.daysPerWeek}
            error={errors["commute-daysPerWeek"]}
            onChange={(e) => update("daysPerWeek", e.target.value)}
          />
        </div>
      )}
    </>
  );
}
