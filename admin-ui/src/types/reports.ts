export type ReportDateRange = "7d" | "30d" | "90d" | "year";

export type ReportType =
  | "appointments"
  | "patients"
  | "doctors"
  | "departments"
  | "ai";

export type ReportFormat = "csv" | "pdf";

export type AppointmentTrendPoint = {
  label: string;
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
};

export type PatientTrendPoint = {
  label: string;
  newPatients: number;
  existingPatients: number;
};

export type AITrendPoint = {
  label: string;
  calls: number;
  successful: number;
  missed: number;
  bookings: number;
};

export type DistributionPoint = {
  name: string;
  value: number;
  color: string;
};

export type DepartmentMetric = {
  department: string;
  appointments: number;
  percentage: number;
  color: string;
};

export type DoctorPerformance = {
  id: string;
  name: string;
  department: string;
  totalAppointments: number;
  completed: number;
  cancelled: number;
  completionRate: number;
};

export type ReportAnalyticsPeriod = {
  appointments: AppointmentTrendPoint[];
  patientTrends: PatientTrendPoint[];
  departments: DepartmentMetric[];
  aiCalls: AITrendPoint[];
  aiOutcomes: DistributionPoint[];
};
