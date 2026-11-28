"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Search, X } from "lucide-react";
import {
  isAppointmentStatus,
  type AppointmentRecord,
  type AppointmentStatus,
} from "@/data/dashboard";

const statusClassNames: Record<AppointmentStatus, string> = {
  Completed: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

export function RecentAppointments({
  appointments,
}: {
  appointments: AppointmentRecord[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | AppointmentStatus>(
    "All",
  );
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentRecord | null>(null);

  const filteredAppointments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const matchesStatus =
        statusFilter === "All" || appointment.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          appointment.patient,
          appointment.doctor,
          appointment.department,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [appointments, query, statusFilter]);

  useEffect(() => {
    if (!selectedAppointment) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedAppointment(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedAppointment]);

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-text">
            Recent appointments
          </h3>
          <p className="mt-1 text-xs text-muted">
            Review and search scheduled visits
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-muted focus-within:border-secondary sm:w-56">
            <Search aria-hidden="true" size={15} />
            <span className="sr-only">Search appointments</span>
            <input
              aria-label="Search appointments"
              className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Patient, doctor, department"
              type="search"
              value={query}
            />
          </label>
          <label>
            <span className="sr-only">Filter appointments by status</span>
            <select
              aria-label="Filter appointments by status"
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary sm:w-auto"
              onChange={(event) => {
                const value = event.target.value;
                setStatusFilter(
                  value === "All" || isAppointmentStatus(value) ? value : "All",
                );
              }}
              value={statusFilter}
            >
              <option value="All">All statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-background text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Patient name</th>
              <th className="px-5 py-3">Doctor</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Appointment date</th>
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAppointments.map((appointment) => (
              <tr className="text-text" key={appointment.id}>
                <td className="whitespace-nowrap px-5 py-3.5 font-medium">
                  {appointment.patient}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  {appointment.doctor}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  {appointment.department}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  {appointment.date}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  {appointment.time}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusClassNames[appointment.status]}`}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {appointment.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  <button
                    className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-secondary transition-colors hover:bg-secondary/10"
                    onClick={() => setSelectedAppointment(appointment)}
                    type="button"
                  >
                    <Eye aria-hidden="true" size={14} />
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filteredAppointments.length === 0 && (
              <tr>
                <td
                  className="px-5 py-10 text-center text-sm text-muted"
                  colSpan={7}
                >
                  No appointments match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedAppointment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            aria-label="Close appointment details"
            className="absolute inset-0 bg-primary/40"
            onClick={() => setSelectedAppointment(null)}
            type="button"
          />
          <section
            aria-labelledby="appointment-detail-title"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Appointment {selectedAppointment.id}
                </p>
                <h4
                  className="mt-1 text-lg font-semibold text-primary"
                  id="appointment-detail-title"
                >
                  {selectedAppointment.patient}
                </h4>
              </div>
              <button
                aria-label="Close appointment details"
                className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
                onClick={() => setSelectedAppointment(null)}
                type="button"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <Detail label="Doctor" value={selectedAppointment.doctor} />
              <Detail label="Department" value={selectedAppointment.department} />
              <Detail label="Date" value={selectedAppointment.date} />
              <Detail label="Time" value={selectedAppointment.time} />
              <div className="col-span-2">
                <dt className="text-xs text-muted">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClassNames[selectedAppointment.status]}`}
                  >
                    {selectedAppointment.status}
                  </span>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-text">{value}</dd>
    </div>
  );
}
