export type PatientGender = "Female" | "Male" | "Non-binary";
export type PatientStatus = "Active" | "Inactive";
export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";
export type PatientAgeGroup = "All" | "Child" | "Adult" | "Senior";

export type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
};

export type Patient = {
  id: string;
  name: string;
  gender: PatientGender;
  dateOfBirth: string;
  bloodGroup: BloodGroup;
  email: string;
  phone: string;
  address: string;
  city: string;
  registrationDate: string;
  status: PatientStatus;
  medicalConditions: string[];
  allergies: string[];
  medications: string[];
  emergencyContact: EmergencyContact;
};

export type PatientFormValues = Omit<Patient, "id">;

export type PatientFiltersState = {
  search: string;
  gender: "All" | PatientGender;
  ageGroup: PatientAgeGroup;
  bloodGroup: "All" | BloodGroup;
  status: "All" | PatientStatus;
  registrationFrom: string;
  registrationTo: string;
};
