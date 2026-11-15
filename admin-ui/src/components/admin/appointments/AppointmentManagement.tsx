"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, ChevronRight, House } from "lucide-react";
import Link from "next/link";
import {
  initialAppointments,
} from "@/data/appointments";
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

export function AppointmentManagement() {
  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments);
  const [filters, setFilters] =
    useState<AppointmentFiltersState>(defaultFilters);
  const [sortOrder, setSortOrder] = useState<AppointmentSortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [formState, setFormState] = useState<FormState>(null);
  const [viewAppointment, setViewAppointment] =
    useState<Appointment | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<Appointment | null>(null);

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

  const saveAppointment = (values: AppointmentFormValues) => {
    if (!formState) {
      return;
    }

    if (formState.mode === "edit") {
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === formState.appointment.id
            ? { ...appointment, ...values }
            : appointment,
        ),
      );
    } else {
      setAppointments((current) => {
        const largestId = current.reduce((largest, appointment) => {
          const number = Number(appointment.id.replace("APT-", ""));
          return Number.isNaN(number) ? largest : Math.max(largest, number);
        }, 0);

        return [
          { ...values, id: `APT-${largestId + 1}` },
          ...current,
        ];
      });
    }

    setFormState(null);
    setCurrentPage(1);
  };

  const confirmCancellation = () => {
    if (!appointmentToCancel) {
      return;
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentToCancel.id
          ? { ...appointment, status: "Cancelled" }
          : appointment,
      ),
    );
    setAppointmentToCancel(null);
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
          onClick={() => setFormState({ mode: "add" })}
          type="button"
        >
          <CalendarPlus aria-hidden="true" size={17} />
          Add Appointment
        </button>
      </header>

      <AppointmentStats />

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
        onEdit={(appointment) =>
          setFormState({ mode: "edit", appointment })
        }
        onPageChange={setCurrentPage}
        onSort={() =>
          setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
        }
        onView={setViewAppointment}
      />

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
