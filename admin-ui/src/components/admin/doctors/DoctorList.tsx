"use client";

import {
  CalendarDays,
  Eye,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Doctor, DoctorAvailability } from "@/types/doctor";
import {
  Avatar,
  AvailabilityBadge,
  ScheduleSummary,
} from "@/components/admin/doctors/DoctorDialogs";

type DoctorListProps = {
  doctors: Doctor[];
  view: "grid" | "table";
  onView: (doctor: Doctor) => void;
  onEdit: (doctor: Doctor) => void;
  onSchedule: (doctor: Doctor) => void;
  onRemove: (doctor: Doctor) => void;
  onAvailabilityChange: (
    doctor: Doctor,
    availability: DoctorAvailability,
  ) => void;
};

export function DoctorList({
  doctors,
  view,
  onView,
  onEdit,
  onSchedule,
  onRemove,
  onAvailabilityChange,
}: DoctorListProps) {
  if (!doctors.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-6 py-14 text-center">
        <p className="text-sm font-semibold text-primary">No doctors found</p>
        <p className="mt-1 text-sm text-muted">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  if (view === "grid") {
    return (
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {doctors.map((doctor) => (
          <article
            className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            key={doctor.id}
          >
            <div className="flex items-start gap-3">
              <Avatar doctor={doctor} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-primary">
                  {doctor.name}
                </p>
                <p className="mt-0.5 text-xs text-muted">{doctor.id}</p>
                <p className="mt-2 text-sm font-medium text-text">
                  {doctor.specialization}
                </p>
                <p className="mt-0.5 text-xs text-muted">{doctor.department}</p>
              </div>
              <button
                aria-label={`View ${doctor.name} profile`}
                className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-secondary"
                onClick={() => onView(doctor)}
                type="button"
              >
                <Eye aria-hidden="true" size={17} />
              </button>
            </div>

            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <Contact icon={Mail} value={doctor.email} />
              <Contact icon={Phone} value={doctor.phone} />
              <Contact icon={MapPin} value={doctor.location} />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <AvailabilityBadge value={doctor.availability} />
              <label className="sr-only" htmlFor={`availability-${doctor.id}`}>
                Update availability for {doctor.name}
              </label>
              <select
                className="h-8 rounded-md border border-border bg-card px-2 text-xs text-text outline-none focus:border-secondary"
                id={`availability-${doctor.id}`}
                onChange={(event) =>
                  onAvailabilityChange(
                    doctor,
                    event.target.value as DoctorAvailability,
                  )
                }
                value={doctor.availability}
              >
                <option>Available</option>
                <option>On Leave</option>
                <option>Unavailable</option>
              </select>
            </div>

            <div className="mt-4 rounded-md bg-background px-3 py-2.5">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
                <CalendarDays aria-hidden="true" size={14} />
                Schedule
              </p>
              <ScheduleSummary schedule={doctor.schedule} />
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted">
                {doctor.experienceYears} years · {doctor.qualification}
              </span>
              <div className="flex items-center gap-1">
                <ActionButton
                  label={`Edit schedule for ${doctor.name}`}
                  onClick={() => onSchedule(doctor)}
                >
                  <CalendarDays aria-hidden="true" size={16} />
                </ActionButton>
                <ActionButton
                  label={`Edit ${doctor.name}`}
                  onClick={() => onEdit(doctor)}
                >
                  <Pencil aria-hidden="true" size={16} />
                </ActionButton>
                <ActionButton
                  label={`Remove ${doctor.name}`}
                  onClick={() => onRemove(doctor)}
                  danger
                >
                  <Trash2 aria-hidden="true" size={16} />
                </ActionButton>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left">
          <thead className="bg-background text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3" scope="col">Doctor</th>
              <th className="px-4 py-3" scope="col">Doctor ID</th>
              <th className="px-4 py-3" scope="col">Specialization</th>
              <th className="px-4 py-3" scope="col">Department</th>
              <th className="px-4 py-3" scope="col">Experience</th>
              <th className="px-4 py-3" scope="col">Availability</th>
              <th className="px-4 py-3 text-right" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doctors.map((doctor) => (
              <tr className="align-middle" key={doctor.id}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar doctor={doctor} />
                    <div className="min-w-0">
                      <button
                        className="text-left text-sm font-semibold text-primary hover:text-secondary"
                        onClick={() => onView(doctor)}
                        type="button"
                      >
                        {doctor.name}
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-text">{doctor.id}</td>
                <td className="px-4 py-4 text-sm text-text">{doctor.specialization}</td>
                <td className="px-4 py-4 text-sm text-text">{doctor.department}</td>
                <td className="px-4 py-4 text-sm text-text">
                  {doctor.experienceYears} years
                </td>
                <td className="px-4 py-4">
                  <select
                    aria-label={`Update availability for ${doctor.name}`}
                    className="h-8 rounded-md border border-border bg-card px-2 text-xs text-text outline-none focus:border-secondary"
                    onChange={(event) =>
                      onAvailabilityChange(
                        doctor,
                        event.target.value as DoctorAvailability,
                      )
                    }
                    value={doctor.availability}
                  >
                    <option>Available</option>
                    <option>On Leave</option>
                    <option>Unavailable</option>
                  </select>
                  <div className="mt-1">
                    <AvailabilityBadge value={doctor.availability} />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-1">
                    <ActionButton
                      label={`View ${doctor.name} profile`}
                      onClick={() => onView(doctor)}
                    >
                      <Eye aria-hidden="true" size={16} />
                    </ActionButton>
                    <ActionButton
                      label={`Edit schedule for ${doctor.name}`}
                      onClick={() => onSchedule(doctor)}
                    >
                      <CalendarDays aria-hidden="true" size={16} />
                    </ActionButton>
                    <ActionButton
                      label={`Edit ${doctor.name}`}
                      onClick={() => onEdit(doctor)}
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </ActionButton>
                    <ActionButton
                      label={`Remove ${doctor.name}`}
                      onClick={() => onRemove(doctor)}
                      danger
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Contact({
  icon: Icon,
  value,
}: {
  icon: typeof Mail;
  value: string;
}) {
  return (
    <p className="flex min-w-0 items-center gap-2 text-xs text-muted">
      <Icon aria-hidden="true" className="shrink-0" size={14} />
      <span className="truncate">{value || "Not provided"}</span>
    </p>
  );
}

function ActionButton({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={`rounded-md p-1.5 transition-colors ${
        danger
          ? "text-muted hover:bg-rose-50 hover:text-rose-600"
          : "text-muted hover:bg-background hover:text-secondary"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
