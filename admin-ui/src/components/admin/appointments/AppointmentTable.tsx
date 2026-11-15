import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Eye,
  Pencil,
} from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/types/appointment";

export type AppointmentSortOrder = "asc" | "desc";

type AppointmentTableProps = {
  appointments: Appointment[];
  currentPage: number;
  pageCount: number;
  pageSize: number;
  sortOrder: AppointmentSortOrder;
  totalAppointments: number;
  onCancel: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onPageChange: (page: number) => void;
  onSort: () => void;
  onView: (appointment: Appointment) => void;
};

const statusClassNames: Record<AppointmentStatus, string> = {
  Confirmed: "bg-sky-50 text-sky-700",
  Pending: "bg-amber-50 text-amber-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

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
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}

export function AppointmentTable({
  appointments,
  currentPage,
  pageCount,
  pageSize,
  sortOrder,
  totalAppointments,
  onCancel,
  onEdit,
  onPageChange,
  onSort,
  onView,
}: AppointmentTableProps) {
  const firstItem = totalAppointments === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalAppointments);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-text">
            Appointment records
          </h2>
          <p className="mt-1 text-xs text-muted">
            {totalAppointments} appointment
            {totalAppointments === 1 ? "" : "s"} found
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-background text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Appointment ID</th>
              <th className="px-4 py-3">Patient name</th>
              <th className="px-4 py-3">Doctor name</th>
              <th className="px-4 py-3">Department</th>
              <th
                aria-sort={sortOrder === "asc" ? "ascending" : "descending"}
                className="px-4 py-3"
              >
                <button
                  aria-label={`Sort by date ${sortOrder === "asc" ? "descending" : "ascending"}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-text"
                  onClick={onSort}
                  type="button"
                >
                  Date
                  {sortOrder === "asc" ? (
                    <ArrowUp aria-hidden="true" size={14} />
                  ) : sortOrder === "desc" ? (
                    <ArrowDown aria-hidden="true" size={14} />
                  ) : (
                    <ArrowUpDown aria-hidden="true" size={14} />
                  )}
                </button>
              </th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Appointment type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {appointments.map((appointment) => (
              <tr className="text-text" key={appointment.id}>
                <td className="whitespace-nowrap px-4 py-3.5 font-medium text-primary">
                  {appointment.id}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  <p className="font-medium">{appointment.patientName}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    ID: {appointment.patientId}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  {appointment.doctorName}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  {appointment.department}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  {formatDate(appointment.date)}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  {formatTime(appointment.time)}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  {appointment.appointmentType}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusClassNames[appointment.status]}`}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {appointment.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <ActionButton
                      label={`View appointment ${appointment.id}`}
                      onClick={() => onView(appointment)}
                    >
                      <Eye aria-hidden="true" size={16} />
                    </ActionButton>
                    <ActionButton
                      label={`Edit appointment ${appointment.id}`}
                      onClick={() => onEdit(appointment)}
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </ActionButton>
                    <ActionButton
                      disabled={
                        appointment.status === "Completed" ||
                        appointment.status === "Cancelled"
                      }
                      label={`Cancel appointment ${appointment.id}`}
                      onClick={() => onCancel(appointment)}
                    >
                      <Ban aria-hidden="true" size={16} />
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td className="px-5 py-12 text-center" colSpan={9}>
                  <p className="font-medium text-text">
                    No appointments found
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Try changing or clearing your filters.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          Showing {firstItem}–{lastItem} of {totalAppointments} appointments
        </p>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous page"
            className="h-8 rounded-md border border-border px-3 text-xs font-medium text-text transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            type="button"
          >
            Previous
          </button>
          <span className="min-w-16 text-center text-xs text-muted">
            Page {currentPage} of {pageCount}
          </span>
          <button
            aria-label="Next page"
            className="h-8 rounded-md border border-border px-3 text-xs font-medium text-text transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage >= pageCount}
            onClick={() => onPageChange(currentPage + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function ActionButton({
  children,
  disabled = false,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-secondary disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
