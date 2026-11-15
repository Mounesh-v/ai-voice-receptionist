"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { weekdays } from "@/data/doctors";
import type { Doctor, DoctorSchedule, Weekday } from "@/types/doctor";

export function DoctorProfileDialog({
  doctor,
  onClose,
  onEdit,
  onSchedule,
}: {
  doctor: Doctor;
  onClose: () => void;
  onEdit: () => void;
  onSchedule: () => void;
}) {
  return (
    <Modal title="Doctor profile" id="doctor-profile-title" onClose={onClose}>
      <div className="flex items-start gap-4">
        <Avatar doctor={doctor} size="large" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-secondary">
            {doctor.id}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-primary">
            {doctor.name}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {doctor.specialization} · {doctor.department}
          </p>
          <AvailabilityBadge value={doctor.availability} className="mt-3" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ContactItem icon={Mail} value={doctor.email} />
        <ContactItem icon={Phone} value={doctor.phone} />
        <ContactItem icon={MapPin} value={doctor.location || "Location not set"} />
        <ContactItem icon={CalendarDays} value={`${doctor.experienceYears} years of experience`} />
      </div>
      <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <Detail label="Qualification" value={doctor.qualification} />
        <Detail label="Consultation fee" value={`$${doctor.consultationFee}`} />
        <Detail
          label="Languages"
          value={doctor.languages.length ? doctor.languages.join(", ") : "Not specified"}
        />
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-muted">Profile summary</dt>
          <dd className="mt-1 text-sm leading-6 text-text">
            {doctor.bio || "No profile summary added."}
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-primary">Weekly schedule</h3>
          <button
            className="text-sm font-medium text-secondary hover:underline"
            onClick={onSchedule}
            type="button"
          >
            Edit schedule
          </button>
        </div>
        <ScheduleSummary schedule={doctor.schedule} />
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <button
          className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
        <button
          className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
          onClick={onEdit}
          type="button"
        >
          Edit profile
        </button>
      </div>
    </Modal>
  );
}

export function DoctorScheduleDialog({
  doctor,
  onClose,
  onSave,
}: {
  doctor: Doctor;
  onClose: () => void;
  onSave: (schedule: DoctorSchedule) => void;
}) {
  const [schedule, setSchedule] = useState<DoctorSchedule>(() =>
    Object.fromEntries(
      weekdays.map((day) => [day, { ...doctor.schedule[day] }]),
    ) as DoctorSchedule,
  );
  const [error, setError] = useState("");
  const setDay = (day: Weekday, updates: Partial<DoctorSchedule[Weekday]>) =>
    setSchedule((current) => ({
      ...current,
      [day]: { ...current[day], ...updates },
    }));
  const save = () => {
    const invalidDay = weekdays.find(
      (day) =>
        schedule[day].enabled &&
        (!schedule[day].start ||
          !schedule[day].end ||
          schedule[day].start >= schedule[day].end),
    );
    if (invalidDay) {
      setError(`Enter a valid start and end time for ${invalidDay}.`);
      return;
    }
    onSave(schedule);
  };

  return (
    <Modal
      title="Edit weekly schedule"
      id="doctor-schedule-title"
      onClose={onClose}
    >
      <p className="text-sm text-muted">{doctor.name} · {doctor.id}</p>
      <div className="mt-4 divide-y divide-border">
        {weekdays.map((day) => (
          <div
            className="grid items-center gap-3 py-3 sm:grid-cols-[1fr_auto_auto]"
            key={day}
          >
            <label className="flex items-center gap-2 text-sm font-medium text-text">
              <input
                checked={schedule[day].enabled}
                className="size-4 accent-secondary"
                onChange={(event) =>
                  setDay(day, { enabled: event.target.checked })
                }
                type="checkbox"
              />
              {day}
            </label>
            {schedule[day].enabled ? (
              <>
                <label className="flex items-center gap-2 text-xs text-muted">
                  Starts
                  <input
                    aria-label={`${day} start time`}
                    className="h-9 rounded-md border border-border bg-card px-2 text-sm text-text outline-none focus:border-secondary"
                    onChange={(event) => setDay(day, { start: event.target.value })}
                    required
                    type="time"
                    value={schedule[day].start}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted">
                  Ends
                  <input
                    aria-label={`${day} end time`}
                    className="h-9 rounded-md border border-border bg-card px-2 text-sm text-text outline-none focus:border-secondary"
                    min={schedule[day].start}
                    onChange={(event) => setDay(day, { end: event.target.value })}
                    required
                    type="time"
                    value={schedule[day].end}
                  />
                </label>
              </>
            ) : (
              <span className="text-sm text-muted sm:col-span-2">Off</span>
            )}
          </div>
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <button
          className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
          onClick={save}
          type="button"
        >
          Save schedule
        </button>
      </div>
    </Modal>
  );
}

export function RemoveDoctorDialog({
  doctor,
  onClose,
  onConfirm,
}: {
  doctor: Doctor;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Remove doctor" id="remove-doctor-title" onClose={onClose}>
      <div className="flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <Trash2 aria-hidden="true" size={20} />
      </div>
      <p className="mt-4 text-sm leading-6 text-text">
        Are you sure you want to remove{" "}
        <span className="font-semibold">{doctor.name}</span>{" "}
        <span className="font-medium">({doctor.id})</span>? This action cannot
        be undone.
      </p>
      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <button
          className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
          onClick={onClose}
          type="button"
        >
          Keep doctor
        </button>
        <button
          className="h-9 rounded-md bg-rose-600 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-700"
          onClick={onConfirm}
          type="button"
        >
          Remove doctor
        </button>
      </div>
    </Modal>
  );
}

export function Modal({
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
      <button
        aria-label={`Close ${title.toLowerCase()}`}
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby={id}
        aria-modal="true"
        className="relative z-10 my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-primary" id={id}>
            {title}
          </h2>
          <button
            aria-label={`Close ${title.toLowerCase()}`}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Avatar({
  doctor,
  size = "normal",
}: {
  doctor: Doctor;
  size?: "normal" | "large";
}) {
  return (
    <div
      aria-hidden={doctor.photoUrl ? undefined : true}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-50 font-semibold text-secondary ${
        size === "large" ? "size-16 text-lg" : "size-11 text-sm"
      }`}
    >
      {doctor.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`${doctor.name} profile`}
          className="size-full object-cover"
          src={doctor.photoUrl}
        />
      ) : (
        doctor.name
          .replace(/^Dr\.\s*/i, "")
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join("")
      )}
    </div>
  );
}

export function AvailabilityBadge({
  value,
  className = "",
}: {
  value: Doctor["availability"];
  className?: string;
}) {
  const color =
    value === "Available"
      ? "bg-emerald-50 text-emerald-700"
      : value === "On Leave"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${color} ${className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

export function ScheduleSummary({ schedule }: { schedule: DoctorSchedule }) {
  const days = weekdays.filter((day) => schedule[day].enabled);
  const first = days[0];
  if (!first) return <p className="text-sm text-muted">No clinic hours set.</p>;
  const last = days[days.length - 1];
  const continuous = days.every(
    (day, index) => weekdays.indexOf(day) === weekdays.indexOf(first) + index,
  );
  const sameHours = days.every(
    (day) =>
      schedule[day].start === schedule[first].start &&
      schedule[day].end === schedule[first].end,
  );
  return (
    <p className="text-sm text-text">
      {continuous ? (first === last ? first : `${first} – ${last}`) : days.map((day) => day.slice(0, 3)).join(", ")}{" "}
      ·{" "}
      {sameHours && continuous
        ? `${schedule[first].start}–${schedule[first].end}`
        : days
            .map(
              (day) =>
                `${day.slice(0, 3)} ${schedule[day].start}–${schedule[day].end}`,
            )
            .join(", ")}
    </p>
  );
}

function ContactItem({
  icon: Icon,
  value,
}: {
  icon: typeof Mail;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-md bg-background px-3 py-2.5">
      <Icon aria-hidden="true" className="shrink-0 text-muted" size={16} />
      <span className="truncate text-sm text-text">{value}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-text">{value}</dd>
    </div>
  );
}
