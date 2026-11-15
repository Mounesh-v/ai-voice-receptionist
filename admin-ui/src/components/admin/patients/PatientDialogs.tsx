"use client";

import { useEffect, type ReactNode } from "react";
import {
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  ShieldPlus,
  Trash2,
  X,
} from "lucide-react";
import { initialAppointments } from "@/data/appointments";
import {
  patientAgeReferenceDate,
  patientAppointmentCutoff,
} from "@/data/patients";
import type { Appointment } from "@/types/appointment";
import type { Patient } from "@/types/patient";

export function PatientAvatar({
  patient,
  size = "normal",
}: {
  patient: Patient;
  size?: "normal" | "large";
}) {
  const initials = patient.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-teal-50 font-semibold text-secondary ${
        size === "large" ? "size-14 text-lg" : "size-9 text-xs"
      }`}
    >
      {initials}
    </span>
  );
}

export function PatientProfileDialog({
  patient,
  onClose,
  onEdit,
}: {
  patient: Patient;
  onClose: () => void;
  onEdit: () => void;
}) {
  const patientAppointments = initialAppointments
    .filter((appointment) => appointment.patientId === patient.id)
    .sort((first, second) =>
      first.date.localeCompare(second.date) || first.time.localeCompare(second.time),
    );
  const previousAppointments = patientAppointments.filter(
    (item) => `${item.date}T${item.time}` < patientAppointmentCutoff,
  );
  const upcomingAppointments = patientAppointments.filter(
    (item) => `${item.date}T${item.time}` >= patientAppointmentCutoff,
  );

  return (
    <Modal title="Patient profile" id="patient-profile-title" onClose={onClose}>
      <div className="flex items-start gap-4">
        <PatientAvatar patient={patient} size="large" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-secondary">{patient.id}</p>
          <h3 className="mt-1 text-xl font-semibold text-primary">{patient.name}</h3>
          <p className="mt-1 text-sm text-muted">{patient.gender} · {getAge(patient.dateOfBirth)} years old · {patient.bloodGroup}</p>
          <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${patient.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {patient.status}
          </span>
        </div>
      </div>

      <section aria-labelledby="personal-info-heading" className="mt-5 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-primary" id="personal-info-heading">Personal information</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ContactItem icon={Mail} label="Email" value={patient.email} />
          <ContactItem icon={Phone} label="Phone" value={patient.phone} />
          <ContactItem icon={MapPin} label="Address" value={patient.address} />
          <Detail label="City" value={patient.city} />
          <ContactItem icon={CalendarDays} label="Date of birth" value={formatDate(patient.dateOfBirth)} />
          <Detail label="Registration date" value={formatDate(patient.registrationDate)} />
          <Detail label="Gender and blood group" value={`${patient.gender} · ${patient.bloodGroup}`} />
        </div>
      </section>

      <section aria-labelledby="medical-info-heading" className="mt-5 border-t border-border pt-5">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-primary" id="medical-info-heading">
          <ShieldPlus aria-hidden="true" className="text-secondary" size={17} />
          Medical information
        </h3>
        <dl className="mt-3 grid gap-4 sm:grid-cols-3">
          <Detail label="Conditions" value={joinOrNone(patient.medicalConditions)} />
          <Detail label="Allergies" value={joinOrNone(patient.allergies)} />
          <Detail label="Medications" value={joinOrNone(patient.medications)} />
        </dl>
      </section>

      <section aria-labelledby="emergency-info-heading" className="mt-5 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-primary" id="emergency-info-heading">Emergency contact</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Detail label="Name" value={patient.emergencyContact.name} />
          <Detail label="Relationship" value={patient.emergencyContact.relationship} />
          <ContactItem icon={Phone} label="Phone" value={patient.emergencyContact.phone} />
        </div>
      </section>

      <section aria-labelledby="appointment-history-heading" className="mt-5 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-primary" id="appointment-history-heading">Appointment history</h3>
        <AppointmentHistory title="Previous appointments" appointments={previousAppointments} />
        <AppointmentHistory title="Upcoming appointments" appointments={upcomingAppointments} />
      </section>

      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <button className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background" onClick={onClose} type="button">Close</button>
        <button className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90" onClick={onEdit} type="button">Edit profile</button>
      </div>
    </Modal>
  );
}

export function RemovePatientDialog({
  patient,
  onClose,
  onConfirm,
}: {
  patient: Patient;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Delete patient record" id="delete-patient-title" onClose={onClose}>
      <span className="flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-700">
        <Trash2 aria-hidden="true" size={20} />
      </span>
      <p className="mt-4 text-sm leading-6 text-text">
        Are you sure you want to delete <strong>{patient.name}</strong> ({patient.id})? This action removes the record from this demo directory.
      </p>
      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <button className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background" onClick={onClose} type="button">Keep record</button>
        <button className="h-9 rounded-md bg-rose-700 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-800" onClick={onConfirm} type="button">Delete patient</button>
      </div>
    </Modal>
  );
}

function AppointmentHistory({
  title,
  appointments,
}: {
  title: string;
  appointments: Appointment[];
}) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      {appointments.length ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <table
            aria-label={`${title} appointment table`}
            className="w-full min-w-[720px] text-left text-xs"
          >
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Appointment ID</th>
                <th className="px-3 py-2 font-medium">Doctor</th>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {appointments.map((appointment) => (
                <tr className="text-text" key={appointment.id}>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-primary">{appointment.id}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{appointment.doctorName}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{appointment.department}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{formatDate(appointment.date)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{formatTime(appointment.time)}</td>
                  <td className="px-3 py-2.5">{appointment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md bg-background px-3 py-3 text-xs text-muted">No {title.toLowerCase()} on file.</p>
      )}
    </div>
  );
}

function Modal({
  title,
  id,
  onClose,
  children,
}: {
  title: string;
  id: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button aria-label={`Close ${title}`} className="fixed inset-0 bg-primary/40" onClick={onClose} type="button" />
      <section
        aria-labelledby={id}
        aria-modal="true"
        className="relative z-10 my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl"
        role="dialog"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-primary" id={id}>{title}</h2>
          <button aria-label={`Close ${title}`} className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text" onClick={onClose} type="button">
            <X aria-hidden="true" size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-muted" size={16} />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 break-words text-sm text-text">{value}</p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm leading-5 text-text">{value}</dd>
    </div>
  );
}

function getAge(dateOfBirth: string) {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = patientAgeReferenceDate
    .split("-")
    .map(Number);
  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;
  return age;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatTime(time: string) {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function joinOrNone(values: string[]) {
  return values.length ? values.join(", ") : "None recorded";
}
