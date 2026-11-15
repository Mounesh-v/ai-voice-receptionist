import { initialAppointments } from "@/data/appointments";
import type { Patient } from "@/types/patient";

export const patientAgeReferenceDate = "2026-11-15";
export const patientAppointmentCutoff = "2026-11-15T14:38";

const fictionalContacts = [
  ["Taylor Brooks", "Partner"],
  ["Morgan Ellis", "Sibling"],
  ["Jordan Blake", "Parent"],
  ["Casey Morgan", "Friend"],
  ["Riley Parker", "Partner"],
  ["Jamie Quinn", "Sibling"],
];

const conditions = [
  ["Seasonal asthma"],
  ["Migraine"],
  [],
  ["Mild hypertension"],
  ["Seasonal allergies"],
  ["Recurring back pain"],
];
const allergies = [
  ["Pollen"],
  [],
  ["Latex"],
  ["Penicillin"],
  [],
  ["Dust"],
];
const medications = [
  ["Cetirizine (as needed)"],
  ["Vitamin D"],
  [],
  ["Lisinopril"],
  ["Saline nasal spray"],
  ["Ibuprofen (as needed)"],
];
const bloodGroups = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"] as const;
const registrations = [
  "2023-02-14",
  "2024-06-08",
  "2025-01-21",
  "2022-11-03",
  "2026-02-17",
  "2024-09-29",
];
const fictionalAddresses = [
  "18 Cedar Lane",
  "42 Harbor View",
  "7 Maple Court",
  "91 Willow Street",
  "26 Orchard Way",
  "53 Elm Avenue",
];
const fictionalCities = [
  "Brookfield",
  "Northfield",
  "Riverton",
  "Lakewood",
  "Fairview",
  "Westhaven",
];

export const initialPatients: Patient[] = initialAppointments.map(
  (appointment, index) => {
    const firstName = appointment.patientName.split(" ")[0].toLowerCase();
    const lastName = appointment.patientName.split(" ").slice(1).join("").toLowerCase();
    const contact = fictionalContacts[index % fictionalContacts.length];

    return {
      id: appointment.patientId,
      name: appointment.patientName,
      gender: index % 7 === 0 ? "Non-binary" : index % 2 === 0 ? "Female" : "Male",
      dateOfBirth: new Date(Date.UTC(1948 + ((index * 7) % 66), index % 12, 4 + (index % 24)))
        .toISOString()
        .slice(0, 10),
      bloodGroup: bloodGroups[index % bloodGroups.length],
      email: `${firstName}.${lastName}@mail.example`,
      phone: `(${555}) 010-${String(100 + index).padStart(4, "0")}`,
      address: fictionalAddresses[index % fictionalAddresses.length],
      city: fictionalCities[index % fictionalCities.length],
      registrationDate: registrations[index % registrations.length],
      status: index % 5 === 0 ? "Inactive" : "Active",
      medicalConditions: [...conditions[index % conditions.length]],
      allergies: [...allergies[index % allergies.length]],
      medications: [...medications[index % medications.length]],
      emergencyContact: {
        name: contact[0],
        relationship: contact[1],
        phone: `(${555}) 010-${String(200 + index).padStart(4, "0")}`,
      },
    };
  },
);

export const patientBloodGroups = [...bloodGroups];
