import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import type { Appointment } from "@/types/appointment";

const statIcons = {
  total: CalendarDays,
  confirmed: BadgeCheck,
  pending: Clock3,
  completed: CheckCircle2,
} as const;

const statDetails = {
  total: "Across all departments",
  confirmed: "Booked and awaiting the visit",
  pending: "Awaiting confirmation",
  completed: "Marked as completed",
} as const;

type AppointmentStatsProps = {
  appointments: Appointment[];
};

export function AppointmentStats({ appointments }: AppointmentStatsProps) {
  const total = appointments.length;
  const confirmed = appointments.filter((a) => a.status === "Confirmed").length;
  const pending = appointments.filter((a) => a.status === "Pending").length;
  const completed = appointments.filter((a) => a.status === "Completed").length;

  const stats = [
    { key: "total", label: "Total Appointments", value: String(total) },
    { key: "confirmed", label: "Confirmed", value: String(confirmed) },
    { key: "pending", label: "Pending", value: String(pending) },
    { key: "completed", label: "Completed", value: String(completed) },
  ] as const;

  return (
    <section
      aria-label="Appointment statistics"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {stats.map((stat) => {
        const Icon = statIcons[stat.key];

        return (
          <article
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
            key={stat.key}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-text">
                  {stat.value}
                </p>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary">
                <Icon aria-hidden="true" size={21} />
              </span>
            </div>
            <p className="mt-4 text-xs text-muted">{statDetails[stat.key]}</p>
          </article>
        );
      })}
    </section>
  );
}
