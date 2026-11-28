"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { patientBloodGroups } from "@/data/patients";
import type {
  BloodGroup,
  Patient,
  PatientFormValues,
  PatientGender,
  PatientStatus,
} from "@/types/patient";

const fieldClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15";

type PatientFormDialogProps = {
  patient?: Patient;
  onClose: () => void;
  onSave: (values: PatientFormValues) => void;
};

function blankValues(): PatientFormValues {
  return {
    name: "",
    gender: "Female",
    dateOfBirth: "",
    bloodGroup: "O+",
    email: "",
    phone: "",
    address: "",
    city: "",
    registrationDate: "2026-11-15",
    status: "Active",
    medicalConditions: [],
    allergies: [],
    medications: [],
    emergencyContact: { name: "", relationship: "", phone: "" },
  };
}

export function PatientFormDialog({
  patient,
  onClose,
  onSave,
}: PatientFormDialogProps) {
  const [values, setValues] = useState<PatientFormValues>(() =>
    patient
      ? {
          ...patient,
          medicalConditions: [...patient.medicalConditions],
          allergies: [...patient.allergies],
          medications: [...patient.medications],
          emergencyContact: { ...patient.emergencyContact },
        }
      : blankValues(),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const update = <Key extends keyof PatientFormValues>(
    key: Key,
    value: PatientFormValues[Key],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !values.emergencyContact.name.trim() ||
      !values.emergencyContact.relationship.trim()
    ) {
      setError("Complete the emergency contact details.");
      return;
    }
    const isValidPhone = (value: string) => {
      if (!/^[+0-9(). -]+$/.test(value)) return false;
      const digits = value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    };
    if (
      !isValidPhone(values.phone.trim()) ||
      !isValidPhone(values.emergencyContact.phone.trim())
    ) {
      setError("Enter valid phone numbers.");
      return;
    }
    onSave({
      ...values,
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      medicalConditions: values.medicalConditions.map((value) => value.trim()).filter(Boolean),
      allergies: values.allergies.map((value) => value.trim()).filter(Boolean),
      medications: values.medications.map((value) => value.trim()).filter(Boolean),
      emergencyContact: {
        name: values.emergencyContact.name.trim(),
        relationship: values.emergencyContact.relationship.trim(),
        phone: values.emergencyContact.phone.trim(),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button
        aria-label={`Close ${patient ? "edit" : "add"} patient form`}
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="patient-form-title"
        aria-modal="true"
        className="relative z-10 my-auto max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-xl"
        role="dialog"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">
              {patient ? patient.id : "New patient"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-primary" id="patient-form-title">
              {patient ? "Edit patient" : "Add patient"}
            </h2>
          </div>
          <button
            aria-label="Close patient form"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <form className="space-y-5 px-6 py-5" onSubmit={submit}>
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-primary">Personal information</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Full name" required value={values.name} onChange={(value) => update("name", value)} />
              <label>
                <FieldLabel>Gender</FieldLabel>
                <select
                  className={fieldClass}
                  onChange={(event) => update("gender", event.target.value as PatientGender)}
                  value={values.gender}
                >
                  <option>Female</option><option>Male</option><option>Non-binary</option>
                </select>
              </label>
              <TextField label="Date of birth" type="date" required value={values.dateOfBirth} onChange={(value) => update("dateOfBirth", value)} />
              <label>
                <FieldLabel>Blood group</FieldLabel>
                <select
                  className={fieldClass}
                  onChange={(event) => update("bloodGroup", event.target.value as BloodGroup)}
                  value={values.bloodGroup}
                >
                  {patientBloodGroups.map((group) => <option key={group}>{group}</option>)}
                </select>
              </label>
              <TextField
                label="Email"
                type="email"
                placeholder="name@mail.example"
                required
                value={values.email}
                onChange={(value) => update("email", value)}
              />
              <TextField
                label="Phone"
                type="tel"
                placeholder="Enter phone number"
                required
                value={values.phone}
                onChange={(value) => update("phone", value)}
              />
              <TextField label="Address" required value={values.address} onChange={(value) => update("address", value)} />
              <TextField label="City" required value={values.city} onChange={(value) => update("city", value)} />
              <TextField label="Registration date" type="date" required value={values.registrationDate} onChange={(value) => update("registrationDate", value)} />
              <label>
                <FieldLabel>Patient status</FieldLabel>
                <select
                  className={fieldClass}
                  onChange={(event) => update("status", event.target.value as PatientStatus)}
                  value={values.status}
                >
                  <option>Active</option><option>Inactive</option>
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="border-t border-border pt-4">
            <legend className="mb-3 text-sm font-semibold text-primary">Medical information</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Medical conditions"
                hint="Separate multiple entries with commas."
                value={values.medicalConditions.join(", ")}
                onChange={(value) => update("medicalConditions", value.split(","))}
              />
              <TextField
                label="Allergies"
                hint="Separate multiple entries with commas."
                value={values.allergies.join(", ")}
                onChange={(value) => update("allergies", value.split(","))}
              />
              <TextField
                label="Medications"
                hint="Separate multiple entries with commas."
                value={values.medications.join(", ")}
                onChange={(value) => update("medications", value.split(","))}
              />
            </div>
          </fieldset>

          <fieldset className="border-t border-border pt-4">
            <legend className="mb-3 text-sm font-semibold text-primary">Emergency contact</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Contact name" required value={values.emergencyContact.name} onChange={(name) => setValues((current) => ({ ...current, emergencyContact: { ...current.emergencyContact, name } }))} />
              <TextField label="Relationship" required value={values.emergencyContact.relationship} onChange={(relationship) => setValues((current) => ({ ...current, emergencyContact: { ...current.emergencyContact, relationship } }))} />
              <TextField
                label="Contact phone"
                type="tel"
                placeholder="Enter phone number"
                required
                value={values.emergencyContact.phone}
                onChange={(phone) => setValues((current) => ({ ...current, emergencyContact: { ...current.emergencyContact, phone } }))}
              />
            </div>
          </fieldset>

          {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button className="h-10 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background" onClick={onClose} type="button">Cancel</button>
            <button className="h-10 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90" type="submit">
              {patient ? "Save changes" : "Add patient"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium text-text">{children}</span>;
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder,
  pattern,
  title,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "email" | "tel" | "date";
  placeholder?: string;
  pattern?: string;
  title?: string;
  hint?: string;
}) {
  return (
    <label className="block min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <input
        className={fieldClass}
        onChange={(event) => onChange(event.target.value)}
        pattern={pattern}
        placeholder={placeholder}
        required={required}
        title={title}
        type={type}
        value={value}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
