import { CalendarClock } from "lucide-react";
import { SettingsField } from "@/components/admin/settings/SettingsField";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import type { AppointmentSettingsValues } from "@/types/settings";

const selectClassName =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/15";

export function AppointmentSettings({
  values,
  onChange,
  onSave,
}: {
  values: AppointmentSettingsValues;
  onChange: (updates: Partial<AppointmentSettingsValues>) => void;
  onSave: () => void;
}) {
  return (
    <SettingsSection
      description="Set default scheduling rules for appointments in this demo workspace."
      icon={<CalendarClock aria-hidden="true" size={19} />}
      id="appointment-settings"
      onSave={onSave}
      title="Appointment Settings"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsField label="Default appointment duration">
          <select
            aria-label="Default appointment duration"
            className={selectClassName}
            onChange={(event) =>
              onChange({ defaultDuration: Number(event.target.value) })
            }
            value={values.defaultDuration}
          >
            {[15, 20, 30, 45, 60].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </SettingsField>
        <SettingsField label="Appointment buffer time">
          <select
            aria-label="Appointment buffer time"
            className={selectClassName}
            onChange={(event) => onChange({ bufferTime: Number(event.target.value) })}
            value={values.bufferTime}
          >
            {[0, 5, 10, 15, 20].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </SettingsField>
      </div>
      <div className="divide-y divide-border border-y border-border py-2">
        <SettingsToggle
          checked={values.bookingEnabled}
          description="Allow new appointment requests through the admin workflow."
          label="Booking availability"
          onChange={(bookingEnabled) => onChange({ bookingEnabled })}
        />
        <SettingsToggle
          checked={values.cancellationAllowed}
          description="Allow patients to request cancellation of an appointment."
          label="Allow patient cancellation"
          onChange={(cancellationAllowed) => onChange({ cancellationAllowed })}
        />
        <SettingsToggle
          checked={values.reschedulingAllowed}
          description="Allow patients to request a different appointment time."
          label="Allow patient rescheduling"
          onChange={(reschedulingAllowed) => onChange({ reschedulingAllowed })}
        />
      </div>
    </SettingsSection>
  );
}
