"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { reportAnalytics, reportDateRanges } from "@/data/reports";
import type { ReportDateRange } from "@/types/reports";

export function AppointmentAnalyticsChart({
  dateRange,
}: {
  dateRange: ReportDateRange;
}) {
  const data = reportAnalytics[dateRange].appointments;
  const rangeLabel =
    reportDateRanges.find((range) => range.value === dateRange)?.label ?? "";

  return (
    <section
      aria-label="Appointment analytics"
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-primary">
            Appointment analytics
          </h2>
          <p className="mt-1 text-xs text-muted">
            Total, completed, pending and cancelled appointments
          </p>
        </div>
        <span className="rounded-md border border-border bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted">
          {rangeLabel}
        </span>
      </div>
      {data.length ? (
        <div aria-label={`${rangeLabel} appointment trend chart`} className="h-[290px] w-full">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#E5EAF0" strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={{ fill: "#718096", fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tick={{ fill: "#718096", fontSize: 11 }}
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
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line
                dataKey="total"
                name="Total"
                stroke="#14283F"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                dataKey="completed"
                name="Completed"
                stroke="#087E8B"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="pending"
                name="Pending"
                stroke="#D3A54A"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="cancelled"
                name="Cancelled"
                stroke="#C65B62"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[290px] items-center justify-center rounded-md bg-slate-50 text-sm text-muted">
          No appointment data is available for this range.
        </div>
      )}
    </section>
  );
}
