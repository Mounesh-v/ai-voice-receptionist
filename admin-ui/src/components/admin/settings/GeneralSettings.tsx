import { Building2 } from "lucide-react";
import { timeZoneOptions } from "@/data/settings";
import { SettingsField } from "@/components/admin/settings/SettingsField";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import type { GeneralSettingsValues } from "@/types/settings";

const fieldClassName =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/15";

export function GeneralSettings({
  values,
  onChange,
  onSave,
}: {
  values: GeneralSettingsValues;
  onChange: (updates: Partial<GeneralSettingsValues>) => void;
  onSave: () => void;
}) {
  return (
    <SettingsSection
      description="Update the hospital contact details shown across the admin workspace."
      icon={<Building2 aria-hidden="true" size={19} />}
      id="general-settings"
      onSave={onSave}
      title="General Settings"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsField label="Hospital / clinic name" required>
          <input
            aria-label="Hospital or clinic name"
            autoComplete="organization"
            className={fieldClassName}
            onChange={(event) => onChange({ clinicName: event.target.value })}
            required
            value={values.clinicName}
          />
        </SettingsField>
        <SettingsField label="Contact email" required>
          <input
            aria-label="Contact email"
            autoComplete="email"
            className={fieldClassName}
            onChange={(event) => onChange({ contactEmail: event.target.value })}
            required
            type="email"
            value={values.contactEmail}
          />
        </SettingsField>
        <SettingsField label="Phone number" required>
          <input
            aria-label="Hospital phone number"
            autoComplete="tel"
            className={fieldClassName}
            onChange={(event) => onChange({ phoneNumber: event.target.value })}
            required
            type="tel"
            value={values.phoneNumber}
          />
        </SettingsField>
        <SettingsField label="Address" required>
          <input
            aria-label="Hospital address"
            autoComplete="street-address"
            className={fieldClassName}
            onChange={(event) => onChange({ address: event.target.value })}
            required
            value={values.address}
          />
        </SettingsField>
        <SettingsField label="Time zone">
          <select
            aria-label="Hospital time zone"
            className={fieldClassName}
            onChange={(event) => onChange({ timeZone: event.target.value })}
            value={values.timeZone}
          >
            {timeZoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingsField>
        <SettingsField label="Date format">
          <select
            aria-label="Date format"
            className={fieldClassName}
            onChange={(event) => onChange({ dateFormat: event.target.value })}
            value={values.dateFormat}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </SettingsField>
      </div>
    </SettingsSection>
  );
}
