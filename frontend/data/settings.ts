import type {
  AIReceptionistSettingsValues,
  AppointmentSettingsValues,
  GeneralSettingsValues,
  NotificationSettingsValues,
  ProfileSettingsValues,
} from "@/types/settings";

export const initialGeneralSettings: GeneralSettingsValues = {
  clinicName: "City Care Hospital",
  contactEmail: "admin@citycare.example",
  phoneNumber: "(555) 010-0100",
  address: "2400 Willow Creek Road, Austin, TX 78701",
  timeZone: "America/Chicago",
  dateFormat: "MM/DD/YYYY",
};

export const initialAppointmentSettings: AppointmentSettingsValues = {
  defaultDuration: 30,
  bufferTime: 10,
  bookingEnabled: true,
  cancellationAllowed: true,
  reschedulingAllowed: true,
};

export const initialAIReceptionistSettings: AIReceptionistSettingsValues = {
  displayName: "Ava",
  greeting: "Welcome to City Care Hospital. How can I help you today?",
  language: "English",
  enabled: true,
  afterHoursMessage:
    "Our team is currently unavailable. Please call during regular business hours.",
};

export const initialNotificationSettings: NotificationSettingsValues = {
  emailNotifications: true,
  appointmentConfirmations: true,
  appointmentReminders: true,
  cancellationNotifications: true,
  newPatientNotifications: false,
};

export const initialProfileSettings: ProfileSettingsValues = {
  displayName: "Admin User",
  email: "admin@citycare.example",
};

export const timeZoneOptions = [
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "UTC", label: "UTC" },
];
