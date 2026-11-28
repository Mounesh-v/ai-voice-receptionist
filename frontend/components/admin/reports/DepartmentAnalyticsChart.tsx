"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { reportAnalytics, reportDateRanges } from "@/data/reports";
import type { ReportDateRange } from "@/types/reports";

export function DepartmentAnalyticsChart({
  dateRange,
}: {
  dateRange: ReportDateRange;
}) {
  const departments = reportAnalytics[dateRange].departments;
  const rangeLabel =
    reportDateRanges.find((range) => range.value === dateRange)?.label ?? "";

  return (
    <section aria-label="Department analytics" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Department analytics</h2>
        <p className="mt-1 text-sm text-muted">
          Appointment distribution across hospital departments.
        </p>
      </div>
      <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-primary">
              Appointments by department
            </h3>
            <p className="mt-1 text-xs text-muted">{rangeLabel}</p>
          </div>
          <span className="rounded-md border border-border bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted">
            {departments.reduce((sum, item) => sum + item.appointments, 0).toLocaleString()} total
          </span>
        </div>
        {departments.length ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={departments}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="#E5EAF0"
                  strokeDasharray="3 3"
                />
                <XAxis
                  allowDecimals={false}
                  axisLine={false}
                  tick={{ fill: "#718096", fontSize: 10 }}
                  tickLine={false}
                  type="number"
                />
                <YAxis
                  axisLine={false}
                  dataKey="department"
                  tick={{ fill: "#718096", fontSize: 10 }}
                  tickLine={false}
                  type="category"
                  width={112}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #E5EAF0",
                    borderRadius: 8,
                    color: "#243447",
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    `${Number(value).toLocaleString()} appointments`,
                    "Volume",
                  ]}
                />
                <Bar
                  dataKey="appointments"
                  name="Appointments"
                  radius={[0, 3, 3, 0]}
                >
                  {departments.map((item) => (
                    <Cell fill={item.color} key={item.department} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-md bg-slate-50 text-sm text-muted">
            No department data is available for this range.
          </div>
        )}
        <ul className="mt-3 grid gap-x-4 gap-y-2 border-t border-border pt-4 sm:grid-cols-2">
          {departments.map((item) => (
            <li
              className="flex items-center justify-between gap-2 text-xs"
              key={item.department}
            >
              <span className="flex min-w-0 items-center gap-2 text-muted">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.department}</span>
              </span>
              <span className="shrink-0 font-medium text-text">
                {item.appointments.toLocaleString()} · {item.percentage}%
              </span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
