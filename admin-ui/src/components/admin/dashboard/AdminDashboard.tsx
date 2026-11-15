"use client";

import {
  CalendarDays,
  Clock3,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import {
  statisticCards,
  type AppointmentRange,
} from "@/data/dashboard";
import { AppointmentChart } from "@/components/admin/dashboard/AppointmentChart";
import { AppointmentStatusChart } from "@/components/admin/dashboard/AppointmentStatusChart";
import { DoctorAvailability } from "@/components/admin/dashboard/DoctorAvailability";
import { RecentActivities } from "@/components/admin/dashboard/RecentActivities";
import { RecentAppointments } from "@/components/admin/dashboard/RecentAppointments";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { WelcomeSection } from "@/components/admin/dashboard/WelcomeSection";

const statisticIcons = {
  patients: UsersRound,
  doctors: Stethoscope,
  appointments: CalendarDays,
  pending: Clock3,
} as const;

export function AdminDashboard() {
  const [range, setRange] = useState<AppointmentRange>("7d");

  return (
    <div className="space-y-6">
      <WelcomeSection
        onRangeChange={setRange}
        range={range}
      />

      <section
        aria-label="Hospital statistics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {statisticCards.map((statistic) => (
          <StatCard
            comparison={statistic.comparison}
            comparisonDetail={statistic.comparisonDetail}
            icon={statisticIcons[statistic.key]}
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
        <AppointmentChart onRangeChange={setRange} range={range} />
        <AppointmentStatusChart range={range} />
      </section>

      <RecentAppointments />

      <section
        aria-label="Hospital operations"
        className="grid gap-4 xl:grid-cols-2"
      >
        <DoctorAvailability />
        <RecentActivities />
      </section>
    </div>
  );
}
