import {
  CalendarCheck2,
  PhoneCall,
  Stethoscope,
  UsersRound,
  TrendingUp,
} from "lucide-react";

const reportStats = [
  {
    label: "Total Appointments",
    value: "1,284",
    change: "+8.2%",
    comparison: "vs previous period",
    icon: CalendarCheck2,
  },
  {
    label: "Total Patients",
    value: "2,450",
    change: "+5.4%",
    comparison: "vs previous period",
    icon: UsersRound,
  },
  {
    label: "Total Doctors",
    value: "48",
    change: "+2.1%",
    comparison: "vs previous period",
    icon: Stethoscope,
  },
  {
    label: "AI Calls Handled",
    value: "1,248",
    change: "+12.8%",
    comparison: "vs previous period",
    icon: PhoneCall,
  },
];

export function ReportStats() {
  return (
    <section
      aria-label="Reports overview statistics"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {reportStats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
            key={stat.label}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-slate-50 text-secondary">
                <Icon aria-hidden="true" size={19} />
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <TrendingUp aria-hidden="true" size={14} />
                {stat.change}
              </span>
            </div>
            <p className="mt-4 text-xs font-medium text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-muted">{stat.comparison}</p>
          </article>
        );
      })}
    </section>
  );
}
