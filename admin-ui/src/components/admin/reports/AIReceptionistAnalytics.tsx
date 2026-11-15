"use client";

import {
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Percent,
  PhoneCall,
  PhoneMissed,
} from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { reportAnalytics, reportDateRanges } from "@/data/reports";
import type { ReportDateRange } from "@/types/reports";

const aiStats = [
  {
    label: "Calls handled",
    value: "1,248",
    icon: PhoneCall,
    color: "text-primary",
    background: "bg-slate-100",
  },
  {
    label: "Successful calls",
    value: "1,082",
    icon: CheckCircle2,
    color: "text-emerald-700",
    background: "bg-emerald-50",
  },
  {
    label: "Missed calls",
    value: "42",
    icon: PhoneMissed,
    color: "text-rose-700",
    background: "bg-rose-50",
  },
  {
    label: "Appointments booked",
    value: "386",
    icon: CalendarCheck2,
    color: "text-secondary",
    background: "bg-teal-50",
  },
  {
    label: "Call conversion",
    value: "30.9%",
    icon: Percent,
    color: "text-indigo-700",
    background: "bg-indigo-50",
  },
  {
    label: "Average duration",
    value: "3m 42s",
    icon: Clock3,
    color: "text-amber-700",
    background: "bg-amber-50",
  },
];

export function AIReceptionistAnalytics({
  dateRange,
}: {
  dateRange: ReportDateRange;
}) {
  const data = reportAnalytics[dateRange];
  const rangeLabel =
    reportDateRanges.find((range) => range.value === dateRange)?.label ?? "";

  return (
    <section aria-label="AI receptionist analytics" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">
          AI receptionist analytics
        </h2>
        <p className="mt-1 text-sm text-muted">
          Review call volume, outcomes and appointment conversion · demo data only.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {aiStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
              key={stat.label}
            >
              <div className={`flex size-9 items-center justify-center rounded-md ${stat.background} ${stat.color}`}>
                <Icon aria-hidden="true" size={17} />
              </div>
              <p className="mt-3 text-[11px] font-medium text-muted">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold text-primary">{stat.value}</p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-primary">Call trends</h3>
            <p className="mt-1 text-xs text-muted">{rangeLabel}</p>
          </div>
          {data.aiCalls.length ? (
            <div className="h-[270px] w-full">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart
                  data={data.aiCalls}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid stroke="#E5EAF0" strokeDasharray="3 3" />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    tick={{ fill: "#718096", fontSize: 10 }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tick={{ fill: "#718096", fontSize: 10 }}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #E5EAF0",
                      borderRadius: 8,
                      color: "#243447",
                      fontSize: 12,
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                  <Line dataKey="calls" name="Calls" stroke="#14283F" strokeWidth={2.5} dot={false} />
                  <Line dataKey="successful" name="Successful" stroke="#087E8B" strokeWidth={2} dot={false} />
                  <Line dataKey="missed" name="Missed" stroke="#C65B62" strokeWidth={2} dot={false} />
                  <Line dataKey="bookings" name="Bookings" stroke="#D3A54A" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[270px] items-center justify-center rounded-md bg-slate-50 text-sm text-muted">
              No call trends are available for this range.
            </div>
          )}
        </article>

        <article className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-primary">Call outcomes</h3>
            <p className="mt-1 text-xs text-muted">Distribution · {rangeLabel.toLowerCase()}</p>
          </div>
          {data.aiOutcomes.length ? (
            <div className="flex min-h-[270px] flex-col items-center gap-2 sm:flex-row">
              <div aria-label="AI call outcome distribution chart" className="h-[250px] w-full min-w-0 sm:w-[55%]">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      data={data.aiOutcomes}
                      dataKey="value"
                      innerRadius="57%"
                      nameKey="name"
                      outerRadius="84%"
                      paddingAngle={2}
                    >
                      {data.aiOutcomes.map((item) => (
                        <Cell fill={item.color} key={item.name} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #E5EAF0",
                        borderRadius: 8,
                        color: "#243447",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-3 sm:flex-1">
                {data.aiOutcomes.map((item) => (
                  <li
                    className="flex items-center justify-between gap-3 text-xs"
                    key={item.name}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-muted">
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="shrink-0 font-medium text-text">
                      {item.value.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex h-[270px] items-center justify-center rounded-md bg-slate-50 text-sm text-muted">
              No outcome data is available for this range.
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
