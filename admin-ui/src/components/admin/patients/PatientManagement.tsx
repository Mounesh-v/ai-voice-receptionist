"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ChevronRight,
  CircleUserRound,
  House,
  UserPlus,
  UsersRound,
  UserX,
} from "lucide-react";
import {
  initialPatients,
  patientAgeReferenceDate,
  patientBloodGroups,
} from "@/data/patients";
import { PatientFormDialog } from "@/components/admin/patients/PatientFormDialog";
import {
  PatientProfileDialog,
  RemovePatientDialog,
} from "@/components/admin/patients/PatientDialogs";
import { PatientTable, type PatientSortKey } from "@/components/admin/patients/PatientTable";
import type {
  Patient,
  PatientFiltersState,
  PatientFormValues,
} from "@/types/patient";

const pageSize = 8;
const defaultFilters: PatientFiltersState = {
  search: "",
  gender: "All",
  ageGroup: "All",
  bloodGroup: "All",
  status: "All",
  registrationFrom: "",
  registrationTo: "",
};

const patientStats = [
  { label: "Total Patients", value: "2,450", note: "Registered patients", icon: UsersRound, tone: "text-secondary bg-teal-50" },
  { label: "Active Patients", value: "1,890", note: "Currently receiving care", icon: Activity, tone: "text-emerald-700 bg-emerald-50" },
  { label: "New Patients This Month", value: "124", note: "New registrations", icon: UserPlus, tone: "text-sky-700 bg-sky-50" },
  { label: "Inactive Patients", value: "436", note: "Not currently active", icon: UserX, tone: "text-amber-700 bg-amber-50" },
];

type FormState = { mode: "add" } | { mode: "edit"; patient: Patient } | null;
type SortOrder = "asc" | "desc";

function getAge(dateOfBirth: string) {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = patientAgeReferenceDate
    .split("-")
    .map(Number);
  let age = todayYear - year;
  if (
    todayMonth < month ||
    (todayMonth === month && todayDay < day)
  ) {
    age -= 1;
  }
  return age;
}

function ageGroup(age: number) {
  return age < 18 ? "Child" : age >= 65 ? "Senior" : "Adult";
}

export function PatientManagement() {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [filters, setFilters] = useState<PatientFiltersState>(defaultFilters);
  const [sortKey, setSortKey] = useState<PatientSortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [formState, setFormState] = useState<FormState>(null);
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [patientToRemove, setPatientToRemove] = useState<Patient | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const filteredPatients = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return patients
      .filter((patient) => {
        const matchesSearch =
          !query ||
          [patient.name, patient.id, patient.phone].some((value) =>
            value.toLowerCase().includes(query),
          );
        const matchesGender =
          filters.gender === "All" || patient.gender === filters.gender;
        const matchesAge =
          filters.ageGroup === "All" ||
          ageGroup(getAge(patient.dateOfBirth)) === filters.ageGroup;
        const matchesBlood =
          filters.bloodGroup === "All" ||
          patient.bloodGroup === filters.bloodGroup;
        const matchesStatus =
          filters.status === "All" || patient.status === filters.status;
        const matchesRegistration =
          (!filters.registrationFrom ||
            patient.registrationDate >= filters.registrationFrom) &&
          (!filters.registrationTo ||
            patient.registrationDate <= filters.registrationTo);
        return (
          matchesSearch &&
          matchesGender &&
          matchesAge &&
          matchesBlood &&
          matchesStatus &&
          matchesRegistration
        );
      })
      .sort((first, second) => {
        let comparison = 0;
        if (sortKey === "age") {
          comparison = getAge(first.dateOfBirth) - getAge(second.dateOfBirth);
        } else if (sortKey === "registrationDate") {
          comparison = first.registrationDate.localeCompare(second.registrationDate);
        } else {
          comparison = first[sortKey].localeCompare(second[sortKey]);
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [filters, patients, sortKey, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const visiblePage = Math.min(currentPage, pageCount);
  const pagePatients = filteredPatients.slice(
    (visiblePage - 1) * pageSize,
    visiblePage * pageSize,
  );

  const updateFilters = (updates: Partial<PatientFiltersState>) => {
    setFilters((current) => ({ ...current, ...updates }));
    setCurrentPage(1);
  };

  const changeSort = (key: PatientSortKey) => {
    if (key === sortKey) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const savePatient = (values: PatientFormValues) => {
    if (!formState) return;
    if (formState.mode === "edit") {
      const { patient } = formState;
      setPatients((current) =>
        current.map((item) =>
          item.id === patient.id ? { ...values, id: patient.id } : item,
        ),
      );
      setAnnouncement(`${values.name}’s patient record was updated.`);
    } else {
      setPatients((current) => {
        const highestId = current.reduce((highest, patient) => {
          const number = Number(patient.id.replace("PT-", ""));
          return Number.isNaN(number) ? highest : Math.max(highest, number);
        }, 10464);
        return [{ ...values, id: `PT-${highestId + 1}` }, ...current];
      });
      setAnnouncement(`${values.name} was added to the patient directory.`);
    }
    setFormState(null);
    setCurrentPage(1);
  };

  const confirmRemove = () => {
    if (!patientToRemove) return;
    setPatients((current) =>
      current.filter((patient) => patient.id !== patientToRemove.id),
    );
    setAnnouncement(`${patientToRemove.name}’s patient record was removed.`);
    setPatientToRemove(null);
  };

  const updateStatus = (patient: Patient, status: Patient["status"]) => {
    setPatients((current) =>
      current.map((item) =>
        item.id === patient.id ? { ...item, status } : item,
      ),
    );
    setAnnouncement(`${patient.name}’s status changed to ${status}.`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5">
            <Link
              className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-secondary"
              href="/admin/dashboard"
            >
              <House aria-hidden="true" size={13} />
              Dashboard
            </Link>
            <ChevronRight aria-hidden="true" className="text-muted" size={13} />
            <span aria-current="page" className="text-xs font-medium text-text">
              Patients
            </span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Patient Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage patient records and appointment information.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90 sm:self-auto"
          onClick={() => setFormState({ mode: "add" })}
          type="button"
        >
          <UserPlus aria-hidden="true" size={17} />
          Add patient
        </button>
      </header>

      <section aria-label="Patient statistics" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {patientStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm md:p-5"
              key={stat.label}
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-md ${stat.tone}`}>
                <Icon aria-hidden="true" size={21} />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-primary">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted">{stat.note}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section
        aria-label="Filter patients"
        className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(210px,2fr)_1fr_1fr_1fr_1fr_1fr_1fr_auto]">
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted">Search</span>
            <span className="flex h-10 items-center gap-2 rounded-md border border-border px-3 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/15">
              <CircleUserRound aria-hidden="true" className="text-muted" size={16} />
              <input
                aria-label="Search patients by name, patient ID or phone"
                className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder="Name, ID or phone"
                type="search"
                value={filters.search}
              />
            </span>
          </label>
          <FilterSelect
            label="Gender"
            value={filters.gender}
            options={["Female", "Male", "Non-binary"]}
            onChange={(value) => updateFilters({ gender: value as PatientFiltersState["gender"] })}
          />
          <FilterSelect
            label="Age group"
            value={filters.ageGroup}
            options={["Child", "Adult", "Senior"]}
            onChange={(value) => updateFilters({ ageGroup: value as PatientFiltersState["ageGroup"] })}
          />
          <FilterSelect
            label="Blood group"
            value={filters.bloodGroup}
            options={patientBloodGroups}
            onChange={(value) => updateFilters({ bloodGroup: value as PatientFiltersState["bloodGroup"] })}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            options={["Active", "Inactive"]}
            onChange={(value) => updateFilters({ status: value as PatientFiltersState["status"] })}
          />
          <DateFilter
            label="Registered from"
            value={filters.registrationFrom}
            onChange={(registrationFrom) => updateFilters({ registrationFrom })}
          />
          <DateFilter
            label="Registered to"
            value={filters.registrationTo}
            onChange={(registrationTo) => updateFilters({ registrationTo })}
          />
          <button
            className="h-10 self-end rounded-md border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-secondary hover:text-secondary"
            onClick={() => {
              setFilters(defaultFilters);
              setCurrentPage(1);
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </section>

      {announcement && (
        <p
          aria-atomic="true"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-40 max-w-[calc(100vw-2.5rem)] rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg"
          role="status"
        >
          {announcement}
        </p>
      )}
      <section aria-label="Patient directory">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            Showing <span className="font-semibold text-text">{filteredPatients.length}</span> of {patients.length} patients
          </p>
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            Sort by
            <select
              aria-label="Sort patients by"
              className="h-9 rounded-md border border-border bg-card px-2.5 text-sm text-text outline-none focus:border-secondary"
              onChange={(event) => {
                setSortKey(event.target.value as PatientSortKey);
                setSortOrder("asc");
              }}
              value={sortKey}
            >
              <option value="name">Name</option>
              <option value="id">Patient ID</option>
              <option value="age">Age</option>
              <option value="registrationDate">Registration date</option>
            </select>
          </label>
        </div>
        <PatientTable
          patients={pagePatients}
          currentPage={visiblePage}
          pageCount={pageCount}
          pageSize={pageSize}
          sortKey={sortKey}
          sortOrder={sortOrder}
          totalPatients={filteredPatients.length}
          onPageChange={setCurrentPage}
          onSort={changeSort}
          onStatusChange={updateStatus}
          onView={setViewPatient}
          onEdit={(patient) => setFormState({ mode: "edit", patient })}
          onRemove={setPatientToRemove}
          onReset={() => {
            setFilters(defaultFilters);
            setCurrentPage(1);
          }}
        />
      </section>

      {formState && (
        <PatientFormDialog
          patient={formState.mode === "edit" ? formState.patient : undefined}
          onClose={() => setFormState(null)}
          onSave={savePatient}
        />
      )}
      {viewPatient && (
        <PatientProfileDialog
          patient={patients.find((patient) => patient.id === viewPatient.id) ?? viewPatient}
          onClose={() => setViewPatient(null)}
          onEdit={() => {
            const patient = patients.find((item) => item.id === viewPatient.id);
            setViewPatient(null);
            if (patient) setFormState({ mode: "edit", patient });
          }}
        />
      )}
      {patientToRemove && (
        <RemovePatientDialog
          patient={patientToRemove}
          onClose={() => setPatientToRemove(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <select
        aria-label={`Filter by ${label.toLowerCase()}`}
        className="h-10 w-full rounded-md border border-border bg-card px-2.5 text-sm text-text outline-none focus:border-secondary"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="All">All {label.toLowerCase()}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input
        aria-label={label}
        className="h-10 w-full min-w-0 rounded-md border border-border bg-card px-2 text-sm text-text outline-none focus:border-secondary"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}
