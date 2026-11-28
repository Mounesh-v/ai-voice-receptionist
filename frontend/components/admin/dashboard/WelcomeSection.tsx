"use client";

import { CalendarDays } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  isAppointmentRange,
  type AppointmentRange,
} from "@/data/dashboard";

const subscribeToDate = () => () => {};

const getCurrentDate = () =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

const getServerDate = () => "Today";

type WelcomeSectionProps = {
  range: AppointmentRange;
  onRangeChange: (range: AppointmentRange) => void;
};

export function WelcomeSection({
  range,
  onRangeChange,
}: WelcomeSectionProps) {
  const currentDate = useSyncExternalStore(
    subscribeToDate,
    getCurrentDate,
    getServerDate,
  );

  return (
    <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-medium text-secondary">Hospital overview</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">
          Good morning, Admin
        </h2>
        <p className="mt-1 text-sm text-muted">
          Hospital overview and operational summary.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="flex items-center gap-2 text-sm text-muted">
          <CalendarDays aria-hidden="true" size={16} />
          <time>{currentDate}</time>
        </p>
        <label className="flex h-10 items-center rounded-md border border-border bg-card px-3 text-sm text-text">
          <span className="sr-only">Dashboard date range</span>
          <select
            aria-label="Dashboard date range"
            className="bg-transparent outline-none"
            onChange={(event) => {
              const value = event.target.value;
              onRangeChange(isAppointmentRange(value) ? value : "7d");
            }}
            value={range}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </label>
      </div>
    </section>
  );
}
