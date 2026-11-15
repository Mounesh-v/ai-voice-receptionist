import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { appointmentOverviewStats } from "@/data/appointments";

const statIcons = {
  total: CalendarDays,
  confirmed: BadgeCheck,
  pending: Clock3,
  completed: CheckCircle2,
};

const statDetails = {
  total: "Across all departments",
  confirmed: "66.7% of appointments",
  pending: "Awaiting confirmation",
  completed: "This reporting period",
};

export function AppointmentStats() {
  return (
    <section
      aria-label="Appointment statistics"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {appointmentOverviewStats.map((stat) => {
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
