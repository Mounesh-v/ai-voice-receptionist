export type AppointmentStatus =
  | "Confirmed"
  | "Pending"
  | "Completed"
  | "Cancelled";

export type AppointmentType =
  | "Consultation"
  | "Follow-up"
  | "Check-up"
  | "Telehealth";

export type Appointment = {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  reason: string;
  doctorId?: string;
};

export type AppointmentFormValues = Omit<Appointment, "id" | "doctorId"> & {
  doctorId?: string;
  patientId?: string;
};

export type AppointmentFiltersState = {
  search: string;
  fromDate: string;
  toDate: string;
  doctor: string;
  department: string;
  status: "All" | AppointmentStatus;
};
