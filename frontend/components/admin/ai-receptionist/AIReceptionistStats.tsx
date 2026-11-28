import {
  Activity,
  CalendarCheck2,
  CircleCheck,
  Clock3,
  PhoneCall,
  PhoneMissed,
} from "lucide-react";

const stats = [
  {
    label: "Total Calls",
    value: "1,248",
    comparison: "+8.2% vs previous period",
    icon: PhoneCall,
    tone: "bg-sky-50 text-sky-700",
  },
  {
    label: "Successful Calls",
    value: "1,082",
    comparison: "+6.4% vs previous period",
    icon: CircleCheck,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Missed Calls",
    value: "42",
    comparison: "−12.5% vs previous period",
    icon: PhoneMissed,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    label: "Appointments Booked",
    value: "386",
    comparison: "+4.8% vs previous period",
    icon: CalendarCheck2,
    tone: "bg-teal-50 text-secondary",
  },
  {
    label: "Average Call Duration",
    value: "3m 42s",
    comparison: "+0m 18s vs previous period",
    icon: Clock3,
    tone: "bg-indigo-50 text-indigo-700",
  },
];

export function AIReceptionistStats() {
  return (
    <section
      aria-label="AI receptionist overview"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
            key={stat.label}
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-md ${stat.tone}`}
            >
              <Icon aria-hidden="true" size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                {stat.value}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                <Activity aria-hidden="true" className="shrink-0 text-secondary" size={13} />
                {stat.comparison}
              </p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
