export type CallStatus = "Completed" | "Missed" | "Transferred" | "Failed";

export type CallPurpose =
  | "Appointment Booking"
  | "General Enquiry"
  | "Appointment Cancellation"
  | "Doctor Availability"
  | "Hospital Information";

export type CallOutcome =
  | "Appointment booked"
  | "General enquiry"
  | "Call transferred"
  | "Unresolved query";

export type TranscriptMessage = {
  speaker: "AI Receptionist" | "Patient";
  time: string;
  text: string;
};

export type CallAppointment = {
  id: string;
  date: string;
  time: string;
  doctor: string;
  department: string;
};

export type CallRecord = {
  id: string;
  patientName: string;
  patientId: string;
  phone: string;
  date: string;
  time: string;
  durationSeconds: number;
  purpose: CallPurpose;
  outcome: CallOutcome;
  status: CallStatus;
  transcript: TranscriptMessage[];
  appointment: CallAppointment | null;
};

export type CallFiltersState = {
  search: string;
  dateFrom: string;
  dateTo: string;
  status: "All" | CallStatus;
  purpose: "All" | CallPurpose;
};

export type CallDateRange = "7d" | "30d" | "90d";
export type CallSortKey = "dateTime" | "patientName" | "durationSeconds";
export type SortOrder = "asc" | "desc";

export type CallVolumePoint = {
  label: string;
  incoming: number;
  successful: number;
  missed: number;
};

export type CallOutcomePoint = {
  name: CallOutcome;
  value: number;
};

export type CallAnalyticsPeriod = {
  volume: CallVolumePoint[];
  outcomes: CallOutcomePoint[];
  conversionPercent: number;
  bookings: number;
  conversionChange: string;
};
