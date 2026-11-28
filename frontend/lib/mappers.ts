import type { Appointment, AppointmentStatus } from "@/types/appointment";
import type { Doctor, DoctorAvailability, DoctorSchedule } from "@/types/doctor";
import type { Patient } from "@/types/patient";

const DEFAULT_SCHEDULE: DoctorSchedule = {
  Monday: { enabled: true, start: "09:00", end: "17:00" },
  Tuesday: { enabled: true, start: "09:00", end: "17:00" },
  Wednesday: { enabled: true, start: "09:00", end: "17:00" },
  Thursday: { enabled: true, start: "09:00", end: "17:00" },
  Friday: { enabled: true, start: "09:00", end: "17:00" },
  Saturday: { enabled: false, start: "09:00", end: "13:00" },
  Sunday: { enabled: false, start: "09:00", end: "13:00" },
};

type BackendAppointment = {
  appointment_id: string;
  user_id: string;
  customer_name?: string;
  customer_email?: string;
  doctor_id: string;
  doctor_name?: string;
  department?: string | null;
  service: string;
  reason?: string | null;
  appointment_start: string;
  appointment_end?: string;
  status: string;
};

type BackendDoctor = {
  doctor_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  specialization: string;
  qualification?: string | null;
  experience?: number | null;
  consultation_fee?: number | null;
  availability?: string;
  available?: boolean;
  location?: string | null;
  languages?: string[];
  bio?: string | null;
  photo_url?: string | null;
  schedule?: Partial<DoctorSchedule>;
};

type BackendCustomer = {
  user_id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  emergency_contact?: string | null;
};

export function mapStatus(status: string): AppointmentStatus {
  switch (status) {
    case "cancelled":
      return "Cancelled";
    case "pending":
      return "Pending";
    case "completed":
      return "Completed";
    case "scheduled":
    default:
      return "Confirmed";
  }
}

export function statusToBackend(status: AppointmentStatus): string {
  switch (status) {
    case "Cancelled":
      return "cancelled";
    case "Pending":
      return "pending";
    case "Completed":
      return "completed";
    case "Confirmed":
    default:
      return "scheduled";
  }
}

export function mapAppointment(doc: BackendAppointment): Appointment {
  const start = new Date(doc.appointment_start);
  const date = Number.isNaN(start.getTime())
    ? ""
    : start.toISOString().slice(0, 10);
  const time = Number.isNaN(start.getTime())
    ? ""
    : start.toTimeString().slice(0, 5);

  return {
    id: doc.appointment_id,
    patientName: doc.customer_name || "",
    patientId: doc.user_id || "",
    doctorName: doc.doctor_name || doc.doctor_id,
    department: doc.department || "",
    date,
    time,
    appointmentType: (doc.service as Appointment["appointmentType"]) || "Consultation",
    status: mapStatus(doc.status),
    reason: doc.reason || "",
    doctorId: doc.doctor_id,
  };
}

export function mapDoctor(doc: BackendDoctor): Doctor {
  const availability: DoctorAvailability =
    doc.availability === "On Leave"
      ? "On Leave"
      : doc.availability === "Unavailable" || doc.available === false
        ? "Unavailable"
        : "Available";

  return {
    id: doc.doctor_id,
    name: doc.name,
    email: doc.email || "",
    phone: doc.phone || "",
    department: doc.department || "General",
    specialization: doc.specialization,
    qualification: doc.qualification || "",
    experienceYears: doc.experience ?? 0,
    consultationFee: doc.consultation_fee ?? 0,
    availability,
    location: doc.location || "",
    languages: doc.languages?.length ? doc.languages : ["English"],
    bio: doc.bio || "",
    photoUrl: doc.photo_url || undefined,
    schedule: { ...DEFAULT_SCHEDULE, ...(doc.schedule || {}) } as DoctorSchedule,
  };
}

function calculateAge(dateOfBirth?: string | null): number {
  if (!dateOfBirth) return 30;
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  if (!year) return 30;
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - (month || 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < (day || 1))) {
    age -= 1;
  }
  return Math.max(0, age);
}

export function calculatePatientAge(dateOfBirth?: string | null): number {
  return calculateAge(dateOfBirth);
}

export function mapPatient(doc: BackendCustomer): Patient {
  const registrationDate = (doc as { created_at?: string }).created_at
    ? String((doc as { created_at?: string }).created_at).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return {
    id: doc.user_id,
    name: doc.name,
    gender: "Female",
    dateOfBirth: doc.date_of_birth || "1990-01-01",
    bloodGroup: "O+",
    email: doc.email,
    phone: doc.phone || "",
    address: doc.address || "",
    city: "",
    registrationDate,
    status: "Active",
    medicalConditions: [],
    allergies: [],
    medications: [],
    emergencyContact: {
      name: "",
      relationship: "",
      phone: doc.emergency_contact || "",
    },
  };
}

export function mapDoctors(doctors: BackendDoctor[]): Doctor[] {
  return doctors.map(mapDoctor);
}

export function mapAppointments(appointments: BackendAppointment[]): Appointment[] {
  return appointments.map(mapAppointment);
}

export function mapPatients(customers: BackendCustomer[]): Patient[] {
  return customers.map(mapPatient);
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}
