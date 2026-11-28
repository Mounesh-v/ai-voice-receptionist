export type DoctorAvailability = "Available" | "On Leave" | "Unavailable";

export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type DoctorShift = {
  enabled: boolean;
  start: string;
  end: string;
};

export type DoctorSchedule = Record<Weekday, DoctorShift>;

export type Doctor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  availability: DoctorAvailability;
  location: string;
  languages: string[];
  bio: string;
  photoUrl?: string;
  schedule: DoctorSchedule;
};

export type DoctorFormValues = Omit<Doctor, "photoUrl" | "schedule"> & {
  photoUrl?: string;
  schedule: DoctorSchedule;
};

export type DoctorFiltersState = {
  search: string;
  department: string;
  specialization: string;
  availability: "All" | DoctorAvailability;
};
