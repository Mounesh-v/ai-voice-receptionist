import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { patientAgeReferenceDate } from "@/data/patients";
import { PatientAvatar } from "@/components/admin/patients/PatientDialogs";
import type { Patient } from "@/types/patient";

export type PatientSortKey = "name" | "id" | "age" | "registrationDate";
type SortOrder = "asc" | "desc";

type PatientTableProps = {
  patients: Patient[];
  currentPage: number;
  pageCount: number;
  pageSize: number;
  sortKey: PatientSortKey;
  sortOrder: SortOrder;
  totalPatients: number;
  onPageChange: (page: number) => void;
  onSort: (key: PatientSortKey) => void;
  onStatusChange: (patient: Patient, status: Patient["status"]) => void;
  onView: (patient: Patient) => void;
  onEdit: (patient: Patient) => void;
  onRemove: (patient: Patient) => void;
  onReset: () => void;
};

function getAge(dateOfBirth: string) {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = patientAgeReferenceDate
    .split("-")
    .map(Number);
  let age = todayYear - year;
  if (
    todayMonth < month ||
    (todayMonth === month && todayDay < day)
  ) age -= 1;
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

export function PatientTable({
  patients,
  currentPage,
  pageCount,
  pageSize,
  sortKey,
  sortOrder,
  totalPatients,
  onPageChange,
  onSort,
  onStatusChange,
  onView,
  onEdit,
  onRemove,
  onReset,
}: PatientTableProps) {
  const firstItem = totalPatients === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalPatients);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-text">Patient records</h2>
          <p className="mt-1 text-xs text-muted">
            {totalPatients} patient{totalPatients === 1 ? "" : "s"} found
          </p>
        </div>
      </div>
      {patients.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-background text-xs font-medium uppercase tracking-wide text-muted">
                  <SortableHeader label="Patient ID" sortKey="id" activeKey={sortKey} order={sortOrder} onSort={onSort} />
                  <SortableHeader label="Patient Name" sortKey="name" activeKey={sortKey} order={sortOrder} onSort={onSort} />
                  <SortableHeader label="Age" sortKey="age" activeKey={sortKey} order={sortOrder} onSort={onSort} />
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Blood group</th>
                  <SortableHeader label="Registration date" sortKey="registrationDate" activeKey={sortKey} order={sortOrder} onSort={onSort} />
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.map((patient) => (
                  <tr className="text-text" key={patient.id}>
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-primary">{patient.id}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <PatientAvatar patient={patient} />
                        <span className="font-medium">{patient.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">{getAge(patient.dateOfBirth)} yrs</td>
                    <td className="whitespace-nowrap px-4 py-3.5">{patient.gender}</td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-56 truncate">{patient.phone}</p>
                      <p className="mt-0.5 max-w-56 truncate text-xs text-muted">{patient.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-primary">{patient.bloodGroup}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">{formatDate(patient.registrationDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <StatusSelect patient={patient} onChange={onStatusChange} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <PatientActions patient={patient} onView={onView} onEdit={onEdit} onRemove={onRemove} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul aria-label="Patient records" className="divide-y divide-border md:hidden">
            {patients.map((patient) => (
              <li className="p-4" key={patient.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <PatientAvatar patient={patient} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-primary">{patient.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{patient.id} · {getAge(patient.dateOfBirth)} yrs</p>
                    </div>
                  </div>
                  <StatusSelect patient={patient} onChange={onStatusChange} />
                </div>
                <p className="mt-2 break-all text-sm text-text">{patient.phone}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="min-w-0 text-xs text-muted">{patient.gender} · {patient.bloodGroup} · {patient.city} · Joined {formatDate(patient.registrationDate)}</p>
                  <PatientActions patient={patient} onView={onView} onEdit={onEdit} onRemove={onRemove} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="px-5 py-12 text-center">
          <CalendarDays aria-hidden="true" className="mx-auto text-muted" size={28} />
          <p className="mt-3 font-medium text-text">No patients found</p>
          <p className="mt-1 text-sm text-muted">Try changing or clearing your filters.</p>
          <button
            className="mt-4 rounded-md border border-border px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-background"
            onClick={onReset}
            type="button"
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="text-xs text-muted">
          Showing {firstItem}–{lastItem} of {totalPatients} patients
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
          <span aria-current="page" className="min-w-16 text-center text-xs text-muted">
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

function SortableHeader({
  label,
  sortKey,
  activeKey,
  order,
  onSort,
}: {
  label: string;
  sortKey: PatientSortKey;
  activeKey: PatientSortKey;
  order: SortOrder;
  onSort: (key: PatientSortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <th aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3">
      <button
        aria-label={`Sort by ${label}${active ? ` ${order === "asc" ? "descending" : "ascending"}` : ""}`}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-text"
        onClick={() => onSort(sortKey)}
        type="button"
      >
        {label}
        {active && (order === "asc" ? <ArrowUp aria-hidden="true" size={14} /> : <ArrowDown aria-hidden="true" size={14} />)}
      </button>
    </th>
  );
}

function StatusSelect({
  patient,
  onChange,
}: {
  patient: Patient;
  onChange: (patient: Patient, status: Patient["status"]) => void;
}) {
  const activeClass = patient.status === "Active" ? "text-emerald-700" : "text-slate-600";
  return (
    <select
      aria-label={`Update status for ${patient.name}`}
      className={`rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium outline-none focus:border-secondary ${activeClass}`}
      onChange={(event) => onChange(patient, event.target.value as Patient["status"])}
      value={patient.status}
    >
      <option>Active</option>
      <option>Inactive</option>
    </select>
  );
}

function PatientActions({
  patient,
  onView,
  onEdit,
  onRemove,
}: {
  patient: Patient;
  onView: (patient: Patient) => void;
  onEdit: (patient: Patient) => void;
  onRemove: (patient: Patient) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <ActionButton label={`View patient ${patient.name}`} onClick={() => onView(patient)}>
        <Eye aria-hidden="true" size={16} />
      </ActionButton>
      <ActionButton label={`Edit patient ${patient.name}`} onClick={() => onEdit(patient)}>
        <Pencil aria-hidden="true" size={16} />
      </ActionButton>
      <ActionButton label={`Delete patient ${patient.name}`} onClick={() => onRemove(patient)}>
        <Trash2 aria-hidden="true" size={16} />
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-secondary"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
