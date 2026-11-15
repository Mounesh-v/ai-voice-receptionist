import { BellRing } from "lucide-react";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import type { NotificationSettingsValues } from "@/types/settings";

export function NotificationSettings({
  values,
  onChange,
  onSave,
}: {
  values: NotificationSettingsValues;
  onChange: (updates: Partial<NotificationSettingsValues>) => void;
  onSave: () => void;
}) {
  return (
    <SettingsSection
      description="Choose which notification preferences are shown in this local demo."
      icon={<BellRing aria-hidden="true" size={19} />}
      id="notification-settings"
      onSave={onSave}
      title="Notification Settings"
    >
      <div className="divide-y divide-border">
        <SettingsToggle
          checked={values.emailNotifications}
          description="Enable the email notification preference."
          label="Email notifications"
          onChange={(emailNotifications) => onChange({ emailNotifications })}
        />
        <SettingsToggle
          checked={values.appointmentConfirmations}
          description="Show a preference for appointment confirmation messages."
          label="Appointment confirmations"
          onChange={(appointmentConfirmations) =>
            onChange({ appointmentConfirmations })
          }
        />
        <SettingsToggle
          checked={values.appointmentReminders}
          description="Show a preference for appointment reminder messages."
          label="Appointment reminders"
          onChange={(appointmentReminders) =>
            onChange({ appointmentReminders })
          }
        />
        <SettingsToggle
          checked={values.cancellationNotifications}
          description="Show a preference for appointment cancellation updates."
          label="Cancellation notifications"
          onChange={(cancellationNotifications) =>
            onChange({ cancellationNotifications })
          }
        />
        <SettingsToggle
          checked={values.newPatientNotifications}
          description="Show a preference for new patient record alerts."
          label="New patient notifications"
          onChange={(newPatientNotifications) =>
            onChange({ newPatientNotifications })
          }
        />
      </div>
      <p className="text-[11px] leading-5 text-muted">
        No email, SMS or push notifications are sent by this frontend demo.
      </p>
    </SettingsSection>
  );
}
