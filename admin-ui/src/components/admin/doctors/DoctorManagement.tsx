"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarOff,
  ChevronRight,
  CircleX,
  Grid2X2,
  House,
  List,
  Plus,
  RotateCcw,
  Search,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { doctorDepartments, initialDoctors } from "@/data/doctors";
import { DoctorFormDialog } from "@/components/admin/doctors/DoctorFormDialog";
import {
  DoctorProfileDialog,
  DoctorScheduleDialog,
  RemoveDoctorDialog,
} from "@/components/admin/doctors/DoctorDialogs";
import { DoctorList } from "@/components/admin/doctors/DoctorList";
import type {
  Doctor,
  DoctorAvailability,
  DoctorFiltersState,
  DoctorFormValues,
  DoctorSchedule,
} from "@/types/doctor";

type FormState =
  | { mode: "add"; initialId: string }
  | { mode: "edit"; doctor: Doctor }
  | null;
type ViewState = "grid" | "table";

const defaultFilters: DoctorFiltersState = {
  search: "",
  department: "All",
  specialization: "All",
  availability: "All",
};

const stats = [
  {
    label: "Total Doctors",
    value: "48",
    note: "Across all departments",
    icon: UsersRound,
    tone: "text-secondary bg-teal-50",
  },
  {
    label: "Available Today",
    value: "32",
    note: "Ready for appointments",
    icon: BadgeCheck,
    tone: "text-emerald-700 bg-emerald-50",
  },
  {
    label: "Unavailable",
    value: "10",
    note: "Not available today",
    icon: CircleX,
    tone: "text-rose-700 bg-rose-50",
  },
  {
    label: "On Leave",
    value: "6",
    note: "Currently away",
    icon: CalendarOff,
    tone: "text-amber-700 bg-amber-50",
  },
];

export function DoctorManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [filters, setFilters] = useState<DoctorFiltersState>(defaultFilters);
  const [view, setView] = useState<ViewState>("grid");
  const [formState, setFormState] = useState<FormState>(null);
  const [viewDoctor, setViewDoctor] = useState<Doctor | null>(null);
  const [scheduleDoctor, setScheduleDoctor] = useState<Doctor | null>(null);
  const [removeDoctor, setRemoveDoctor] = useState<Doctor | null>(null);
  const objectUrls = useRef(new Set<string>());
  const nextIdNumber = useRef(
    initialDoctors.reduce((highest, doctor) => {
      const match = /^DOC-(\d+)$/i.exec(doctor.id);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1,
  );

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    [],
  );

  const filteredDoctors = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const matchesSearch =
        !query ||
        doctor.name.toLowerCase().includes(query) ||
        doctor.id.toLowerCase().includes(query);
      const matchesDepartment =
        filters.department === "All" ||
        doctor.department === filters.department;
      const matchesSpecialization =
        filters.specialization === "All" ||
        doctor.specialization === filters.specialization;
      const matchesAvailability =
        filters.availability === "All" ||
        doctor.availability === filters.availability;
      return (
        matchesSearch &&
        matchesDepartment &&
        matchesSpecialization &&
        matchesAvailability
      );
    });
  }, [doctors, filters]);

  const specializations = useMemo(
    () =>
      [...new Set(doctors.map((doctor) => doctor.specialization))].sort(
        (first, second) => first.localeCompare(second),
      ),
    [doctors],
  );

  const openAddForm = () => {
    let id = "";
    do {
      id = `DOC-${String(nextIdNumber.current).padStart(3, "0")}`;
      nextIdNumber.current += 1;
    } while (doctors.some((doctor) => doctor.id.toLowerCase() === id.toLowerCase()));
    setFormState({ mode: "add", initialId: id });
  };

  const saveDoctor = (
    values: DoctorFormValues,
    photoFile?: File,
  ): string | undefined => {
    const editedDoctor =
      formState?.mode === "edit" ? formState.doctor : undefined;
    const duplicateId = doctors.some(
      (doctor) =>
        doctor.id.toLowerCase() === values.id.toLowerCase() &&
        doctor.id !== editedDoctor?.id,
    );
    if (duplicateId) return "That doctor ID is already in use.";

    const duplicateEmail = doctors.some(
      (doctor) =>
        doctor.email.toLowerCase() === values.email.toLowerCase() &&
        doctor.id !== editedDoctor?.id,
    );
    if (duplicateEmail) return "That email address is already in use.";

    let photoUrl = values.photoUrl;
    if (photoFile) {
      photoUrl = URL.createObjectURL(photoFile);
      objectUrls.current.add(photoUrl);
    }

    const updatedDoctor: Doctor = {
      ...values,
      photoUrl,
      schedule: editedDoctor
        ? { ...editedDoctor.schedule }
        : { ...values.schedule },
    };

    if (editedDoctor) {
      setDoctors((current) =>
        current.map((doctor) =>
          doctor.id === editedDoctor.id ? updatedDoctor : doctor,
        ),
      );
      if (
        photoFile &&
        editedDoctor.photoUrl &&
        objectUrls.current.has(editedDoctor.photoUrl)
      ) {
        URL.revokeObjectURL(editedDoctor.photoUrl);
        objectUrls.current.delete(editedDoctor.photoUrl);
      }
    } else {
      setDoctors((current) => [updatedDoctor, ...current]);
    }

    setFormState(null);
    return undefined;
  };

  const changeAvailability = (
    doctor: Doctor,
    availability: DoctorAvailability,
  ) => {
    setDoctors((current) =>
      current.map((item) =>
        item.id === doctor.id ? { ...item, availability } : item,
      ),
    );
  };

  const saveSchedule = (schedule: DoctorSchedule) => {
    if (!scheduleDoctor) return;
    setDoctors((current) =>
      current.map((doctor) =>
        doctor.id === scheduleDoctor.id
          ? {
              ...doctor,
              schedule: Object.fromEntries(
                Object.entries(schedule).map(([day, shift]) => [
                  day,
                  { ...shift },
                ]),
              ) as DoctorSchedule,
            }
          : doctor,
      ),
    );
    setScheduleDoctor(null);
  };

  const confirmRemove = () => {
    if (!removeDoctor) return;
    setDoctors((current) =>
      current.filter((doctor) => doctor.id !== removeDoctor.id),
    );
    if (removeDoctor.photoUrl) {
      URL.revokeObjectURL(removeDoctor.photoUrl);
      objectUrls.current.delete(removeDoctor.photoUrl);
    }
    setRemoveDoctor(null);
  };

  const editDoctor = (doctor: Doctor) => {
    setViewDoctor(null);
    setFormState({ mode: "edit", doctor });
  };

  const editSchedule = (doctor: Doctor) => {
    setViewDoctor(null);
    setScheduleDoctor(doctor);
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
              Doctors
            </span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Doctor Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage hospital doctors, departments and availability.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90 sm:self-auto"
          onClick={openAddForm}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          Add doctor
        </button>
      </header>

      <section aria-label="Doctor statistics" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {stats.map((stat) => {
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
                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-primary">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-muted">{stat.note}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section
        aria-label="Filter doctors"
        className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr_auto]">
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Search
            </span>
            <span className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-muted focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/15">
              <Search aria-hidden="true" size={16} />
              <input
                aria-label="Search doctors by name or doctor ID"
                className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Name or doctor ID"
                type="search"
                value={filters.search}
              />
            </span>
          </label>
          <FilterSelect
            label="Department"
            onChange={(department) =>
              setFilters((current) => ({ ...current, department }))
            }
            options={doctorDepartments}
            value={filters.department}
          />
          <FilterSelect
            label="Specialization"
            onChange={(specialization) =>
              setFilters((current) => ({ ...current, specialization }))
            }
            options={specializations}
            value={filters.specialization}
          />
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Availability
            </span>
            <select
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  availability: event.target.value as DoctorFiltersState["availability"],
                }))
              }
              value={filters.availability}
            >
              <option value="All">All availability</option>
              <option>Available</option>
              <option>On Leave</option>
              <option>Unavailable</option>
            </select>
          </label>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-secondary hover:text-secondary"
            onClick={() => setFilters(defaultFilters)}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={15} />
            Reset
          </button>
        </div>
      </section>

      <section aria-label="Doctor directory">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            Showing{" "}
            <span className="font-semibold text-text">
              {filteredDoctors.length}
            </span>{" "}
            of {doctors.length} doctors
          </p>
          <div
            aria-label="Doctor directory view"
            className="inline-flex rounded-md border border-border bg-card p-1"
            role="group"
          >
            <ViewButton
              active={view === "grid"}
              label="Grid view"
              onClick={() => setView("grid")}
            >
              <Grid2X2 aria-hidden="true" size={16} />
            </ViewButton>
            <ViewButton
              active={view === "table"}
              label="Table view"
              onClick={() => setView("table")}
            >
              <List aria-hidden="true" size={16} />
            </ViewButton>
          </div>
        </div>
        <DoctorList
          doctors={filteredDoctors}
          onAvailabilityChange={changeAvailability}
          onEdit={editDoctor}
          onRemove={setRemoveDoctor}
          onSchedule={editSchedule}
          onView={setViewDoctor}
          view={view}
        />
      </section>

      {formState && (
        <DoctorFormDialog
          doctor={formState.mode === "edit" ? formState.doctor : undefined}
          initialId={formState.mode === "add" ? formState.initialId : undefined}
          onClose={() => setFormState(null)}
          onSave={saveDoctor}
        />
      )}
      {viewDoctor && (
        <DoctorProfileDialog
          doctor={viewDoctor}
          onClose={() => setViewDoctor(null)}
          onEdit={() => editDoctor(viewDoctor)}
          onSchedule={() => editSchedule(viewDoctor)}
        />
      )}
      {scheduleDoctor && (
        <DoctorScheduleDialog
          doctor={scheduleDoctor}
          onClose={() => setScheduleDoctor(null)}
          onSave={saveSchedule}
        />
      )}
      {removeDoctor && (
        <RemoveDoctorDialog
          doctor={removeDoctor}
          onClose={() => setRemoveDoctor(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <select
        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="All">All {label.toLowerCase()}s</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`flex size-8 items-center justify-center rounded transition-colors ${
        active
          ? "bg-secondary text-white"
          : "text-muted hover:bg-background hover:text-text"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
