"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { api } from "@/lib/api";
import { mapDoctors } from "@/lib/mappers";
import { doctorDepartments } from "@/data/doctors";
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

type BackendDoctor = {
  doctor_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  specialization: string;
  qualification?: string | null;
  experience?: number | null;
  consultation_fee?: number | null;
  availability?: string;
  available?: boolean;
  location?: string | null;
  languages?: string[];
  bio?: string | null;
  photo_url?: string | null;
  schedule?: Partial<DoctorSchedule>;
};

export function DoctorManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<DoctorFiltersState>(defaultFilters);
  const [view, setView] = useState<ViewState>("grid");
  const [formState, setFormState] = useState<FormState>(null);
  const [viewDoctor, setViewDoctor] = useState<Doctor | null>(null);
  const [scheduleDoctor, setScheduleDoctor] = useState<Doctor | null>(null);
  const [removeDoctor, setRemoveDoctor] = useState<Doctor | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const objectUrls = useRef(new Set<string>());
  const nextIdNumber = useRef(1);

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    [],
  );

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get<{ doctors: BackendDoctor[] }>(
        "/api/doctors?include_unavailable=true",
      ).catch(async () =>
        api.get<{ doctors: BackendDoctor[] }>("/api/doctors"),
      );
      setDoctors(mapDoctors(res.doctors || []));
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load doctors.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

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

  const availableCount = doctors.filter((d) => d.availability === "Available").length;
  const unavailableCount = doctors.filter((d) => d.availability === "Unavailable").length;
  const onLeaveCount = doctors.filter((d) => d.availability === "On Leave").length;

  const stats = [
    {
      label: "Total Doctors",
      value: String(doctors.length),
      note: "Across all departments",
      icon: UsersRound,
      tone: "text-secondary bg-teal-50",
    },
    {
      label: "Available Today",
      value: String(availableCount),
      note: "Ready for appointments",
      icon: BadgeCheck,
      tone: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Unavailable",
      value: String(unavailableCount),
      note: "Not available today",
      icon: CircleX,
      tone: "text-rose-700 bg-rose-50",
    },
    {
      label: "On Leave",
      value: String(onLeaveCount),
      note: "Currently away",
      icon: CalendarOff,
      tone: "text-amber-700 bg-amber-50",
    },
  ];

  const openAddForm = () => {
    let id = "";
    do {
      id = `DOC-${String(nextIdNumber.current).padStart(3, "0")}`;
      nextIdNumber.current += 1;
    } while (
      doctors.some((doctor) => doctor.id.toLowerCase() === id.toLowerCase())
    );
    setFormState({ mode: "add", initialId: id });
  };

  const saveDoctor = async (
    values: DoctorFormValues,
    photoFile?: File,
  ): Promise<string | undefined> => {
    const editedDoctor =
      formState?.mode === "edit" ? formState.doctor : undefined;
    const duplicateEmail = doctors.some(
      (doctor) =>
        doctor.email.toLowerCase() === values.email.toLowerCase() &&
        doctor.id !== editedDoctor?.id &&
        values.email,
    );
    if (duplicateEmail) return "That email address is already in use.";

    setSaving(true);
    try {
      if (editedDoctor) {
        // Backend has no doctor update endpoint — keep edits in local state.
        setDoctors((current) =>
          current.map((doctor) =>
            doctor.id === editedDoctor.id
              ? {
                  ...doctor,
                  ...values,
                  photoUrl: values.photoUrl ?? doctor.photoUrl,
                }
              : doctor,
          ),
        );
        setAnnouncement(`${values.name} was updated locally (no update API).`);
      } else {
        const created = await api.post<{ doctor: BackendDoctor }>(
          "/api/doctors",
          {
            id: values.id || undefined,
            name: values.name,
            specialization: values.specialization,
            qualification: values.qualification || undefined,
            experience: values.experienceYears,
            available: values.availability === "Available",
          },
        );
        let photoUrl = values.photoUrl;
        if (photoFile) {
          photoUrl = URL.createObjectURL(photoFile);
          objectUrls.current.add(photoUrl);
        }
        const mapped = mapDoctors([created.doctor])[0];
        setDoctors((current) => [
          { ...mapped, ...values, id: mapped.id, photoUrl, schedule: values.schedule },
          ...current,
        ]);
        setAnnouncement(`${values.name} was added.`);
      }

      setFormState(null);
      return undefined;
    } catch (err) {
      return err instanceof Error ? err.message : "Could not save the doctor.";
    } finally {
      setSaving(false);
    }
  };

  const changeAvailability = (
    doctor: Doctor,
    availability: DoctorAvailability,
  ) => {
    // No availability API — local state only.
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
    const target = removeDoctor;
    // No delete API — remove from local list only.
    setDoctors((current) => current.filter((doctor) => doctor.id !== target.id));
    if (target.photoUrl) {
      URL.revokeObjectURL(target.photoUrl);
      objectUrls.current.delete(target.photoUrl);
    }
    setRemoveDoctor(null);
    setAnnouncement(`${target.name} was removed from this session.`);
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

      {announcement && (
        <p
          aria-live="polite"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          {announcement}
        </p>
      )}
      {loadError && (
        <p
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          role="alert"
        >
          {loadError}
        </p>
      )}

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
            {loading ? (
              "Loading doctors..."
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-text">
                  {filteredDoctors.length}
                </span>{" "}
                of {doctors.length} doctors
              </>
            )}
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
