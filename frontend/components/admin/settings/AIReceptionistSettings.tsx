import { Bot } from "lucide-react";
import { SettingsField } from "@/components/admin/settings/SettingsField";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import type { AIReceptionistSettingsValues } from "@/types/settings";

const fieldClassName =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/15";
const textAreaClassName =
  "min-h-24 w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/15";

export function AIReceptionistSettings({
  values,
  onChange,
  onSave,
}: {
  values: AIReceptionistSettingsValues;
  onChange: (updates: Partial<AIReceptionistSettingsValues>) => void;
  onSave: () => void;
}) {
  return (
    <SettingsSection
      description="Edit sample voice assistant copy and language for the dashboard demo."
      icon={<Bot aria-hidden="true" size={19} />}
      id="ai-receptionist-settings"
      onSave={onSave}
      title="AI Receptionist Settings"
    >
      <div
        className="rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3"
        role="note"
      >
        <p className="text-xs font-semibold text-amber-900">Demo settings only</p>
        <p className="mt-1 text-xs leading-5 text-amber-800">
          These values do not control a live AI receptionist, voice assistant or phone system.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsField label="Receptionist display name" required>
          <input
            aria-label="Receptionist display name"
            className={fieldClassName}
            onChange={(event) => onChange({ displayName: event.target.value })}
            required
            value={values.displayName}
          />
        </SettingsField>
        <SettingsField label="Default language">
          <select
            aria-label="Receptionist language"
            className={fieldClassName}
            onChange={(event) => onChange({ language: event.target.value })}
            value={values.language}
          >
            <option>English</option>
            <option>Spanish</option>
            <option>Hindi</option>
            <option>French</option>
          </select>
        </SettingsField>
        <div className="sm:col-span-2">
          <SettingsField label="Greeting message" required>
            <textarea
              aria-label="Receptionist greeting message"
              className={textAreaClassName}
              onChange={(event) => onChange({ greeting: event.target.value })}
              required
              value={values.greeting}
            />
          </SettingsField>
        </div>
        <div className="sm:col-span-2">
          <SettingsField label="After-hours message" required>
            <textarea
              aria-label="After-hours message"
              className={textAreaClassName}
              onChange={(event) => onChange({ afterHoursMessage: event.target.value })}
              required
              value={values.afterHoursMessage}
            />
          </SettingsField>
        </div>
      </div>
      <div className="border-t border-border pt-3">
        <SettingsToggle
          checked={values.enabled}
          description="Demo-only display state; no live receptionist is enabled or disabled."
          label="Enable AI receptionist (demo)"
          onChange={(enabled) => onChange({ enabled })}
        />
      </div>
    </SettingsSection>
  );
}
