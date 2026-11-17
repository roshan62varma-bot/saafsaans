import { CheckboxCard } from "@/components/ui/CheckboxCard";
import { ChoiceGroup } from "@/components/ui/ChoiceGroup";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { LIMITS } from "@/lib/constants";
import { BUDGET_LABELS, FUEL_LABELS, LANGUAGE_LABELS, SEALING_LABELS } from "@/lib/client/labels";
import type { FieldErrors, FormState } from "@/lib/client/profileForm";
import { typedEntries } from "@/lib/utils";

const FUEL_OPTIONS = typedEntries(FUEL_LABELS).map(([value, label]) => ({ value, label }));
const SEALING_OPTIONS = typedEntries(SEALING_LABELS).map(([value, o]) => ({ value, ...o }));
const BUDGET_OPTIONS = typedEntries(BUDGET_LABELS).map(([value, o]) => ({ value, ...o }));
const LANGUAGE_OPTIONS = typedEntries(LANGUAGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface Props {
  form: FormState;
  errors: FieldErrors;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

/** Cooking fuel, bedroom size, purifier, sealing, budget and plan language. */
export function HomeFields({ form, errors, update }: Props) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="cookingFuel"
          label="Main cooking fuel"
          value={form.cookingFuel}
          options={FUEL_OPTIONS}
          onChange={(fuel) => update("cookingFuel", fuel)}
        />
        <TextField
          id="bedroomAreaM2"
          label="Main bedroom size (m²)"
          hint="A 10 × 12 ft room is about 11 m²."
          type="number"
          inputMode="decimal"
          min={LIMITS.minBedroomAreaM2}
          max={LIMITS.maxBedroomAreaM2}
          value={form.bedroomAreaM2}
          error={errors.bedroomAreaM2}
          onChange={(e) => update("bedroomAreaM2", e.target.value)}
        />
      </div>
      <CheckboxCard
        id="hasPurifier"
        className="max-w-md"
        checked={form.hasPurifier}
        onChange={(checked) => update("hasPurifier", checked)}
      >
        We already own an air purifier
      </CheckboxCard>
      <ChoiceGroup
        name="sealing"
        legend="How draughty are your doors and windows?"
        value={form.sealing}
        onChange={(v) => update("sealing", v)}
        options={SEALING_OPTIONS}
      />
      <ChoiceGroup
        name="budget"
        legend="Budget for air-quality improvements"
        value={form.budget}
        onChange={(v) => update("budget", v)}
        options={BUDGET_OPTIONS}
      />
      <ChoiceGroup
        name="language"
        legend="Language for your plan"
        columns={2}
        value={form.language}
        onChange={(v) => update("language", v)}
        options={LANGUAGE_OPTIONS}
      />
    </>
  );
}
