import { CalendarDays, RotateCcw, Search } from "lucide-react";
import {
  appointmentDepartments,
  appointmentDoctors,
} from "@/data/appointments";
import type {
  AppointmentFiltersState,
  AppointmentStatus,
} from "@/types/appointment";

type AppointmentFiltersProps = {
  filters: AppointmentFiltersState;
  onChange: (filters: AppointmentFiltersState) => void;
  onReset: () => void;
};

export function AppointmentFilters({
  filters,
  onChange,
  onReset,
}: AppointmentFiltersProps) {
  const update = <Key extends keyof AppointmentFiltersState>(
    key: Key,
    value: AppointmentFiltersState[Key],
  ) => onChange({ ...filters, [key]: value });

  return (
    <section
      aria-label="Filter appointments"
      className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <label className="sm:col-span-2 xl:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Search
          </span>
          <span className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-muted focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/15">
            <Search aria-hidden="true" size={16} />
            <input
              aria-label="Search by patient name or appointment ID"
              className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
              onChange={(event) => update("search", event.target.value)}
              placeholder="Patient name or appointment ID"
              type="search"
              value={filters.search}
            />
          </span>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted">
            From date
          </span>
          <span className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-muted focus-within:border-secondary">
            <CalendarDays aria-hidden="true" size={15} />
            <input
              aria-label="Appointments from date"
              className="min-w-0 w-full bg-transparent text-sm text-text outline-none"
              onChange={(event) => update("fromDate", event.target.value)}
              type="date"
              value={filters.fromDate}
            />
          </span>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted">
            To date
          </span>
          <span className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-muted focus-within:border-secondary">
            <CalendarDays aria-hidden="true" size={15} />
            <input
              aria-label="Appointments to date"
              className="min-w-0 w-full bg-transparent text-sm text-text outline-none"
              onChange={(event) => update("toDate", event.target.value)}
              type="date"
              value={filters.toDate}
            />
          </span>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Doctor
          </span>
          <select
            aria-label="Filter by doctor"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
            onChange={(event) => update("doctor", event.target.value)}
            value={filters.doctor}
          >
            <option value="All">All doctors</option>
            {appointmentDoctors.map((doctor) => (
              <option key={doctor} value={doctor}>
                {doctor}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Department
          </span>
          <select
            aria-label="Filter by department"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
            onChange={(event) => update("department", event.target.value)}
            value={filters.department}
          >
            <option value="All">All departments</option>
            {appointmentDepartments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Status
          </span>
          <select
            aria-label="Filter by status"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
            onChange={(event) =>
              update("status", event.target.value as "All" | AppointmentStatus)
            }
            value={filters.status}
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </label>

        <div className="flex items-end sm:col-span-2 xl:col-span-6">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-secondary hover:text-secondary"
            onClick={onReset}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={15} />
            Clear all filters
          </button>
        </div>
      </div>
    </section>
  );
}
