export type GeneralSettingsValues = {
  clinicName: string;
  contactEmail: string;
  phoneNumber: string;
  address: string;
  timeZone: string;
  dateFormat: string;
};

export type AppointmentSettingsValues = {
  defaultDuration: number;
  bufferTime: number;
  bookingEnabled: boolean;
  cancellationAllowed: boolean;
  reschedulingAllowed: boolean;
};

export type AIReceptionistSettingsValues = {
  displayName: string;
  greeting: string;
  language: string;
  enabled: boolean;
  afterHoursMessage: string;
};

export type NotificationSettingsValues = {
  emailNotifications: boolean;
  appointmentConfirmations: boolean;
  appointmentReminders: boolean;
  cancellationNotifications: boolean;
  newPatientNotifications: boolean;
};

export type ProfileSettingsValues = {
  displayName: string;
  email: string;
};

export type ThemePreference = "light";
