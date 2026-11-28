"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronRight, House } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { mapAppointments, mapDoctors, mapPatients } from "@/lib/mappers";
import { AppointmentDetailsDialog } from "@/components/admin/appointments/AppointmentDetailsDialog";
import { AppointmentFilters } from "@/components/admin/appointments/AppointmentFilters";
import { AppointmentFormDialog } from "@/components/admin/appointments/AppointmentFormDialog";
import { AppointmentStats } from "@/components/admin/appointments/AppointmentStats";
import {
  AppointmentTable,
  type AppointmentSortOrder,
} from "@/components/admin/appointments/AppointmentTable";
import { CancelConfirmationDialog } from "@/components/admin/appointments/CancelConfirmationDialog";
import type {
  Appointment,
  AppointmentFiltersState,
  AppointmentFormValues,
} from "@/types/appointment";
import type { Doctor } from "@/types/doctor";
import type { Patient } from "@/types/patient";

const pageSize = 8;

const defaultFilters: AppointmentFiltersState = {
  search: "",
  fromDate: "",
  toDate: "",
  doctor: "All",
  department: "All",
  status: "All",
};

type FormState =
  | { mode: "add" }
  | { mode: "edit"; appointment: Appointment }
  | null;

type BackendAppointmentPayload = {
  appointment_id: string;
  user_id: string;
  customer_name?: string;
  doctor_id: string;
  doctor_name?: string;
  department?: string | null;
  service: string;
  reason?: string | null;
  appointment_start: string;
  status: string;
};

function toUtcIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  return local.toISOString();
}

export function AppointmentManagement() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [filters, setFilters] = useState<AppointmentFiltersState>(defaultFilters);
  const [sortOrder, setSortOrder] = useState<AppointmentSortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [formState, setFormState] = useState<FormState>(null);
  const [viewAppointment, setViewAppointment] =
    useState<Appointment | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<Appointment | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [apptRes, doctorRes, patientRes] = await Promise.all([
        api.get<{ appointments: BackendAppointmentPayload[] }>("/api/appointments"),
        api.get<{ doctors: unknown[] }>("/api/doctors?include_unavailable=false"),
        api.get<{ customers: unknown[] }>("/api/customers"),
      ]);
      setAppointments(mapAppointments(apptRes.appointments || []));
      setDoctors(mapDoctors((doctorRes.doctors || []) as never));
      setPatients(mapPatients((patientRes.customers || []) as never));
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load appointments.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredAppointments = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return appointments
      .filter((appointment) => {
        const matchesSearch =
          !query ||
          [appointment.patientName, appointment.patientId, appointment.id].some(
            (value) => value.toLowerCase().includes(query),
          );
        const matchesDate =
          (!filters.fromDate || appointment.date >= filters.fromDate) &&
          (!filters.toDate || appointment.date <= filters.toDate);
        const matchesDoctor =
          filters.doctor === "All" ||
          appointment.doctorName === filters.doctor;
        const matchesDepartment =
          filters.department === "All" ||
          appointment.department === filters.department;
        const matchesStatus =
          filters.status === "All" ||
          appointment.status === filters.status;

        return (
          matchesSearch &&
          matchesDate &&
          matchesDoctor &&
          matchesDepartment &&
          matchesStatus
        );
      })
      .sort((first, second) => {
        const dateComparison =
          first.date.localeCompare(second.date) ||
          first.time.localeCompare(second.time);

        return sortOrder === "asc" ? dateComparison : -dateComparison;
      });
  }, [appointments, filters, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
  const pageAppointments = filteredAppointments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const updateFilters = (nextFilters: AppointmentFiltersState) => {
    setFilters(nextFilters);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const saveAppointment = async (values: AppointmentFormValues) => {
    if (!formState) return;
    setSaving(true);
    setFormError("");

    try {
      if (formState.mode === "edit") {
        const existing = formState.appointment;
        const timeChanged =
          existing.date !== values.date || existing.time !== values.time;
        const newIso = toUtcIso(values.date, values.time);

        if (values.status === "Cancelled" && existing.status !== "Cancelled") {
          await api.patch(`/api/appointments/${existing.id}/cancel`);
        } else if (
          timeChanged &&
          existing.status !== "Cancelled" &&
          values.status !== "Cancelled"
        ) {
          await api.patch(`/api/appointments/${existing.id}/reschedule`, {
            new_start: newIso,
          });
        }

        setAppointments((current) =>
          current.map((appointment) =>
            appointment.id === existing.id
              ? {
                  ...appointment,
                  ...values,
                  doctorId: values.doctorId ?? appointment.doctorId,
                }
              : appointment,
          ),
        );
        setAnnouncement(`${values.patientName}'s appointment was updated.`);
      } else {
        if (!values.doctorId) {
          setFormError("Select a doctor.");
          return;
        }
        const payload = {
          doctor_id: values.doctorId,
          service: values.appointmentType,
          appointment_start: toUtcIso(values.date, values.time),
          reason: values.reason,
          department: values.department,
        };
        const created = await api.post<BackendAppointmentPayload>(
          "/api/appointments",
          payload,
        );
        const mapped = mapAppointments([created])[0];
        setAppointments((current) => [mapped, ...current]);
        setAnnouncement("Appointment booked successfully.");
      }

      setFormState(null);
      setCurrentPage(1);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save the appointment.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmCancellation = async () => {
    if (!appointmentToCancel) return;
    setSaving(true);
    setFormError("");
    try {
      await api.patch(`/api/appointments/${appointmentToCancel.id}/cancel`);
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === appointmentToCancel.id
            ? { ...appointment, status: "Cancelled" }
            : appointment,
        ),
      );
      setAnnouncement("Appointment cancelled.");
      setAppointmentToCancel(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not cancel appointment.",
      );
      setAppointmentToCancel(null);
    } finally {
      setSaving(false);
    }
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
              Appointments
            </span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Appointment Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage and monitor hospital appointments.
          </p>
        </div>

        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90 sm:self-auto"
          onClick={() => {
            setFormError("");
            setFormState({ mode: "add" });
          }}
          type="button"
        >
          <CalendarPlus aria-hidden="true" size={17} />
          Add Appointment
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

      {loading ? (
        <p className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted">
          Loading appointments...
        </p>
      ) : (
        <>
          <AppointmentStats appointments={appointments} />

          <AppointmentFilters
            filters={filters}
            onChange={updateFilters}
            onReset={resetFilters}
          />

          <AppointmentTable
            appointments={pageAppointments}
            currentPage={currentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            sortOrder={sortOrder}
            totalAppointments={filteredAppointments.length}
            onCancel={setAppointmentToCancel}
            onEdit={(appointment) => {
              setFormError("");
              setFormState({ mode: "edit", appointment });
            }}
            onPageChange={setCurrentPage}
            onSort={() =>
              setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
            }
            onView={setViewAppointment}
          />
        </>
      )}

      {viewAppointment && (
        <AppointmentDetailsDialog
          appointment={viewAppointment}
          onClose={() => setViewAppointment(null)}
        />
      )}

      {formState && (
        <AppointmentFormDialog
          appointment={
            formState.mode === "edit" ? formState.appointment : undefined
          }
          doctors={doctors}
          error={formError}
          patients={patients}
          saving={saving}
          onClose={() => setFormState(null)}
          onSave={saveAppointment}
        />
      )}

      {appointmentToCancel && (
        <CancelConfirmationDialog
          appointment={appointmentToCancel}
          onClose={() => setAppointmentToCancel(null)}
          onConfirm={confirmCancellation}
        />
      )}
    </div>
  );
}
