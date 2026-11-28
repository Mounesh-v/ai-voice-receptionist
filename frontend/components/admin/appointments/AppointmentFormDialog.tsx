"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type {
  Appointment,
  AppointmentFormValues,
  AppointmentStatus,
  AppointmentType,
} from "@/types/appointment";
import type { Doctor } from "@/types/doctor";
import type { Patient } from "@/types/patient";

type AppointmentFormDialogProps = {
  appointment?: Appointment;
  doctors: Doctor[];
  patients: Patient[];
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (values: AppointmentFormValues) => void;
};

const emptyValues: AppointmentFormValues = {
  patientName: "",
  patientId: "",
  doctorName: "",
  department: "",
  date: "",
  time: "",
  appointmentType: "Consultation",
  status: "Pending",
  reason: "",
  doctorId: undefined,
};

export function AppointmentFormDialog({
  appointment,
  doctors,
  patients,
  saving = false,
  error,
  onClose,
  onSave,
}: AppointmentFormDialogProps) {
  const [values, setValues] = useState<AppointmentFormValues>(() =>
    appointment
      ? {
          patientName: appointment.patientName,
          patientId: appointment.patientId,
          doctorName: appointment.doctorName,
          department: appointment.department,
          date: appointment.date,
          time: appointment.time,
          appointmentType: appointment.appointmentType,
          status: appointment.status,
          reason: appointment.reason,
          doctorId: appointment.doctorId,
        }
      : emptyValues,
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const update = <Key extends keyof AppointmentFormValues>(
    key: Key,
    value: AppointmentFormValues[Key],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(values);
  };

  const departments = [
    ...new Set(doctors.map((doctor) => doctor.department).filter(Boolean)),
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button
        aria-label="Close appointment form"
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="appointment-form-title"
        aria-modal="true"
        className="relative z-10 my-auto w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">
              {appointment ? appointment.id : "New appointment"}
            </p>
            <h2
              className="mt-1 text-xl font-semibold text-primary"
              id="appointment-form-title"
            >
              {appointment ? "Edit appointment" : "Add appointment"}
            </h2>
          </div>
          <button
            aria-label="Close appointment form"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <form className="space-y-5 px-6 py-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-sm font-medium text-text">
                Patient
              </span>
              <select
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
                onChange={(event) => {
                  const patient = patients.find(
                    (item) => item.id === event.target.value,
                  );
                  setValues((current) => ({
                    ...current,
                    patientId: event.target.value,
                    patientName: patient?.name || current.patientName,
                  }));
                }}
                required
                value={values.patientId}
              >
                <option disabled value="">
                  Select a patient
                </option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} ({patient.id})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-text">
                Doctor
              </span>
              <select
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
                onChange={(event) => {
                  const doctor = doctors.find(
                    (item) => item.id === event.target.value,
                  );
                  setValues((current) => ({
                    ...current,
                    doctorId: doctor?.id,
                    doctorName: doctor?.name || "",
                    department: doctor?.department || current.department,
                  }));
                }}
                required
                value={values.doctorId || ""}
              >
                <option disabled value="">
                  Select a doctor
                </option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                    {doctor.department ? ` · ${doctor.department}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-text">
                Department
              </span>
              <select
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
                onChange={(event) => update("department", event.target.value)}
                required
                value={values.department}
              >
                <option disabled value="">
                  Select a department
                </option>
                {(departments.length
                  ? departments
                  : [...new Set(doctors.map((d) => d.department))]
                ).map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-text">
                Appointment type
              </span>
              <select
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
                onChange={(event) =>
                  update(
                    "appointmentType",
                    event.target.value as AppointmentType,
                  )
                }
                required
                value={values.appointmentType}
              >
                <option value="Consultation">Consultation</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Check-up">Check-up</option>
                <option value="Telehealth">Telehealth</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-text">
                Date
              </span>
              <input
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15"
                onChange={(event) => update("date", event.target.value)}
                required
                type="date"
                value={values.date}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-text">
                Time
              </span>
              <input
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15"
                onChange={(event) => update("time", event.target.value)}
                required
                type="time"
                value={values.time}
              />
            </label>
            {appointment && (
              <label>
                <span className="mb-1.5 block text-sm font-medium text-text">
                  Status
                </span>
                <select
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
                  onChange={(event) =>
                    update("status", event.target.value as AppointmentStatus)
                  }
                  value={values.status}
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>
            )}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text">
              Reason for visit
            </span>
            <textarea
              className="min-h-24 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/15"
              onChange={(event) => update("reason", event.target.value)}
              placeholder="Briefly describe the reason for the appointment"
              required
              value={values.reason}
            />
          </label>

          {error && (
            <p
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              className="h-10 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving
                ? "Saving..."
                : appointment
                  ? "Save changes"
                  : "Add appointment"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
