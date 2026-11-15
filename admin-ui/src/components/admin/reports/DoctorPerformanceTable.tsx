"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { doctorPerformance } from "@/data/reports";

type SortKey =
  | "name"
  | "department"
  | "totalAppointments"
  | "completed"
  | "cancelled"
  | "completionRate";

type SortOrder = "asc" | "desc";

const columns: { key: SortKey; label: string }[] = [
  { key: "name", label: "Doctor name" },
  { key: "department", label: "Department" },
  { key: "totalAppointments", label: "Appointments" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "completionRate", label: "Completion rate" },
];

export function DoctorPerformanceTable() {
  const [department, setDepartment] = useState("All departments");
  const [sortKey, setSortKey] = useState<SortKey>("totalAppointments");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const departments = useMemo(
    () => [...new Set(doctorPerformance.map((doctor) => doctor.department))].sort(),
    [],
  );
  const doctors = useMemo(() => {
    const filtered = doctorPerformance.filter(
      (doctor) => department === "All departments" || doctor.department === department,
    );
    return filtered.sort((first, second) => {
      const firstValue = first[sortKey];
      const secondValue = second[sortKey];
      const comparison =
        typeof firstValue === "string" && typeof secondValue === "string"
          ? firstValue.localeCompare(secondValue)
          : Number(firstValue) - Number(secondValue);
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [department, sortKey, sortOrder]);

  const changeSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortOrder("asc");
  };

  const sortIcon = (key: SortKey) => {
    if (key !== sortKey) return <ArrowDownUp aria-hidden="true" size={13} />;
    return sortOrder === "asc" ? (
      <ArrowUp aria-hidden="true" size={13} />
    ) : (
      <ArrowDown aria-hidden="true" size={13} />
    );
  };

  return (
    <section aria-label="Doctor performance" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">Doctor performance</h2>
          <p className="mt-1 text-sm text-muted">
            Appointment completion by provider · fictional sample data
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          Department
          <select
            aria-label="Filter doctors by department"
            className="h-9 min-w-44 rounded-md border border-border bg-card px-3 text-xs text-text outline-none transition-colors focus:border-secondary"
            onChange={(event) => setDepartment(event.target.value)}
            value={department}
          >
            <option>All departments</option>
            {departments.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card shadow-sm md:block">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  aria-sort={
                    sortKey === column.key
                      ? sortOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted"
                  key={column.key}
                  scope="col"
                >
                  <button
                    aria-label={`Sort by ${column.label}`}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-primary"
                    onClick={() => changeSort(column.key)}
                    type="button"
                  >
                    {column.label}
                    {sortIcon(column.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doctors.map((doctor) => (
              <tr className="transition-colors hover:bg-slate-50/70" key={doctor.id}>
                <td className="px-4 py-3.5 text-xs font-medium text-primary">
                  {doctor.name}
                </td>
                <td className="px-4 py-3.5 text-xs text-muted">{doctor.department}</td>
                <td className="px-4 py-3.5 text-xs font-medium text-text">
                  {doctor.totalAppointments}
                </td>
                <td className="px-4 py-3.5 text-xs text-text">{doctor.completed}</td>
                <td className="px-4 py-3.5 text-xs text-text">{doctor.cancelled}</td>
                <td className="px-4 py-3.5">
                  <CompletionRate rate={doctor.completionRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {doctors.length === 0 && <EmptyDoctors />}
      </div>

      <div aria-label="Doctor performance records" className="space-y-3 md:hidden">
        {doctors.map((doctor) => (
          <article
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
            key={doctor.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-primary">{doctor.name}</h3>
                <p className="mt-1 text-xs text-muted">{doctor.department}</p>
              </div>
              <CompletionRate rate={doctor.completionRate} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
              <DoctorMetric label="Appointments" value={doctor.totalAppointments} />
              <DoctorMetric label="Completed" value={doctor.completed} />
              <DoctorMetric label="Cancelled" value={doctor.cancelled} />
            </div>
          </article>
        ))}
        {doctors.length === 0 && <EmptyDoctors />}
      </div>
      <p className="text-xs text-muted">
        Showing {doctors.length} of {doctorPerformance.length} doctors.
      </p>
    </section>
  );
}
function CompletionRate({ rate }: { rate: number }) {
  return (
    <span className="inline-flex min-w-16 items-center justify-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
      {rate.toFixed(1)}%
    </span>
  );
}

function DoctorMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted">{label}</p>
      <p className="mt-1 text-xs font-semibold text-text">{value}</p>
    </div>
  );
}

function EmptyDoctors() {
  return (
    <div className="rounded-md bg-slate-50 px-4 py-10 text-center">
      <p className="text-sm font-medium text-primary">No doctors found</p>
      <p className="mt-1 text-xs text-muted">
        Choose another department to see performance records.
      </p>
    </div>
  );
}
