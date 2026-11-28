"use client";

import {
  CalendarDays,
  Clock3,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  mapAppointments,
  mapDoctors,
  mapPatients,
} from "@/lib/mappers";
import type { AppointmentRange } from "@/data/dashboard";
import { AppointmentChart } from "@/components/admin/dashboard/AppointmentChart";
import { AppointmentStatusChart } from "@/components/admin/dashboard/AppointmentStatusChart";
import { DoctorAvailability } from "@/components/admin/dashboard/DoctorAvailability";
import { RecentActivities } from "@/components/admin/dashboard/RecentActivities";
import { RecentAppointments } from "@/components/admin/dashboard/RecentAppointments";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { WelcomeSection } from "@/components/admin/dashboard/WelcomeSection";
import type { Appointment } from "@/types/appointment";
import type { Doctor } from "@/types/doctor";
import type { Patient } from "@/types/patient";

const statisticIcons = {
  patients: UsersRound,
  doctors: Stethoscope,
  appointments: CalendarDays,
  pending: Clock3,
} as const;

type BackendAppointment = {
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

export function AdminDashboard() {
  const [range, setRange] = useState<AppointmentRange>("7d");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [apptRes, doctorRes, patientRes] = await Promise.all([
        api.get<{ appointments: BackendAppointment[] }>("/api/appointments"),
        api.get<{ doctors: unknown[] }>("/api/doctors?include_unavailable=true").catch(
          () => api.get<{ doctors: unknown[] }>("/api/doctors"),
        ),
        api.get<{ customers: unknown[] }>("/api/customers"),
      ]);
      setAppointments(mapAppointments(apptRes.appointments || []));
      setDoctors(mapDoctors((doctorRes.doctors || []) as never));
      setPatients(mapPatients((patientRes.customers || []) as never));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const todaysCount = appointments.filter((a) => a.date === today).length;
  const pendingCount = appointments.filter(
    (a) => a.status === "Pending" || a.status === "Confirmed",
  ).length;

  const statistics = useMemo(
    () => [
      {
        key: "patients",
        label: "Total Patients",
        value: patients.length.toLocaleString(),
        comparison: "Live",
        comparisonDetail: "from customer records",
        tone: "positive" as const,
      },
      {
        key: "doctors",
        label: "Total Doctors",
        value: doctors.length.toLocaleString(),
        comparison: `${doctors.filter((d) => d.availability === "Available").length} available`,
        comparisonDetail: "today",
        tone: "positive" as const,
      },
      {
        key: "appointments",
        label: "Today's Appointments",
        value: todaysCount.toLocaleString(),
        comparison: `${appointments.length} total`,
        comparisonDetail: "on record",
        tone: "positive" as const,
      },
      {
        key: "pending",
        label: "Open Appointments",
        value: pendingCount.toLocaleString(),
        comparison: "Needs attention",
        comparisonDetail: "awaiting completion",
        tone: "warning" as const,
      },
    ],
    [patients.length, doctors.length, appointments.length, todaysCount, pendingCount],
  );

  const recentForTable = useMemo(() => {
    const statusClass: Record<string, "Completed" | "Pending" | "Cancelled"> = {
      Completed: "Completed",
      Pending: "Pending",
      Cancelled: "Cancelled",
      Confirmed: "Pending",
    };
    return appointments.slice(0, 8).map((appointment) => ({
      id: appointment.id,
      patient: appointment.patientName,
      doctor: appointment.doctorName,
      department: appointment.department,
      date: appointment.date,
      time: appointment.time,
      status: statusClass[appointment.status] || "Pending",
    }));
  }, [appointments]);

  const availabilityList = useMemo(
    () =>
      doctors.slice(0, 5).map((doctor) => {
        const initials = doctor.name
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .slice(0, 2)
          .join("");
        const status =
          doctor.availability === "Available"
            ? ("Available" as const)
            : doctor.availability === "On Leave"
              ? ("In consultation" as const)
              : ("Off duty" as const);
        return {
          name: doctor.name,
          initials: initials || "DR",
          specialty: doctor.specialization,
          status,
          time:
            status === "Available"
              ? "Bookable now"
              : status === "In consultation"
                ? "On leave"
                : "Unavailable",
        };
      }),
    [doctors],
  );

  const activities = useMemo(() => {
    const items: {
      id: string;
      title: string;
      detail: string;
      time: string;
      icon: "appointment" | "cancel" | "schedule" | "patient";
    }[] = [];

    for (const appointment of appointments.slice(0, 3)) {
      items.push({
        id: `appt-${appointment.id}`,
        title:
          appointment.status === "Cancelled"
            ? "Appointment cancelled"
            : "Appointment on record",
        detail: `${appointment.patientName} · ${appointment.doctorName}`,
        time: `${appointment.date} ${appointment.time}`,
        icon: appointment.status === "Cancelled" ? "cancel" : "appointment",
      });
    }
    for (const patient of patients.slice(0, 2)) {
      items.push({
        id: `patient-${patient.id}`,
        title: "Patient registered",
        detail: patient.name,
        time: patient.registrationDate,
        icon: "patient",
      });
    }
    return items.slice(0, 5);
  }, [appointments, patients]);

  const trendData = useMemo(() => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const labels: { label: string; completed: number; pending: number; cancelled: number }[] = [];
    const step = days <= 7 ? 1 : days <= 30 ? 5 : 15;
    const now = new Date();
    for (let back = days - 1; back >= 0; back -= step) {
      const day = new Date(now);
      day.setDate(now.getDate() - back);
      const key = day.toISOString().slice(0, 10);
      const label = day.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const dayAppts = appointments.filter((a) => a.date === key);
      labels.push({
        label,
        completed: dayAppts.filter((a) => a.status === "Completed").length,
        pending: dayAppts.filter(
          (a) => a.status === "Pending" || a.status === "Confirmed",
        ).length,
        cancelled: dayAppts.filter((a) => a.status === "Cancelled").length,
      });
    }
    return labels;
  }, [appointments, range]);

  const statusData = useMemo(() => {
    const completed = appointments.filter((a) => a.status === "Completed").length;
    const pending = appointments.filter(
      (a) => a.status === "Pending" || a.status === "Confirmed",
    ).length;
    const cancelled = appointments.filter((a) => a.status === "Cancelled").length;
    return [
      { name: "Completed" as const, value: completed, color: "#087E8B" },
      { name: "Pending" as const, value: pending, color: "#E6A23C" },
      { name: "Cancelled" as const, value: cancelled, color: "#C65B62" },
    ];
  }, [appointments]);

  return (
    <div className="space-y-6">
      <WelcomeSection
        onRangeChange={setRange}
        range={range}
      />

      {error && (
        <p
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {loading && (
        <p className="rounded-lg border border-border bg-card px-4 py-6 text-center text-sm text-muted">
          Loading dashboard...
        </p>
      )}

      <section
        aria-label="Hospital statistics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {statistics.map((statistic) => (
          <StatCard
            comparison={statistic.comparison}
            comparisonDetail={statistic.comparisonDetail}
            icon={
              statisticIcons[
                statistic.key as keyof typeof statisticIcons
              ]
            }
            key={statistic.key}
            label={statistic.label}
            tone={statistic.tone}
            value={statistic.value}
          />
        ))}
      </section>

      <section
        aria-label="Appointment analytics"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]"
      >
        <AppointmentChart
          data={trendData}
          onRangeChange={setRange}
          range={range}
        />
        <AppointmentStatusChart data={statusData} range={range} />
      </section>

      <RecentAppointments appointments={recentForTable} />

      <section
        aria-label="Hospital operations"
        className="grid gap-4 xl:grid-cols-2"
      >
        <DoctorAvailability doctors={availabilityList} />
        <RecentActivities activities={activities} />
      </section>
    </div>
  );
}
