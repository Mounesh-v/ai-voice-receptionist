"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ageDistribution,
  genderDistribution,
  reportAnalytics,
  reportDateRanges,
} from "@/data/reports";
import type { DistributionPoint, ReportDateRange } from "@/types/reports";

export function PatientAnalytics({
  dateRange,
}: {
  dateRange: ReportDateRange;
}) {
  const data = reportAnalytics[dateRange].patientTrends;
  const rangeLabel =
    reportDateRanges.find((range) => range.value === dateRange)?.label ?? "";

  return (
    <section aria-label="Patient analytics" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Patient analytics</h2>
        <p className="mt-1 text-sm text-muted">
          Registrations, returning patients and patient demographics.
        </p>
      </div>

      <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-primary">
            New and existing patients
          </h3>
          <p className="mt-1 text-xs text-muted">
            Registration trends · {rangeLabel.toLowerCase()}
          </p>
        </div>
        {data.length ? (
          <div className="h-[230px] w-full">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
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
                  width={38}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #E5EAF0",
                    borderRadius: 8,
                    color: "#243447",
                    fontSize: 12,
                  }}
                />
                <Area
                  dataKey="existingPatients"
                  name="Existing patients"
                  stackId="patients"
                  stroke="#14283F"
                  fill="#14283F"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
                <Area
                  dataKey="newPatients"
                  name="New patients"
                  stackId="patients"
                  stroke="#087E8B"
                  fill="#087E8B"
                  fillOpacity={0.48}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[230px] items-center justify-center rounded-md bg-slate-50 text-sm text-muted">
            No patient trends are available for this range.
          </div>
        )}
      </article>

      <div className="grid gap-4 sm:grid-cols-2">
        <DistributionPanel
          title="Gender distribution"
          description="Patient records by gender"
          data={genderDistribution}
        />
        <DistributionPanel
          title="Age groups"
          description="Patient records by age group"
          data={ageDistribution}
        />
      </div>
    </section>
  );
}

function DistributionPanel({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: DistributionPoint[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-xs text-muted">{description}</p>
      <div className="mt-2 flex min-w-0 items-center gap-2">
        <div aria-label={title} className="h-[160px] min-w-0 flex-1">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius="57%"
                nameKey="name"
                outerRadius="84%"
                paddingAngle={2}
              >
                {data.map((item) => (
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
        <ul className="min-w-0 flex-1 space-y-2">
          {data.map((item) => (
            <li className="flex items-center justify-between gap-2 text-[11px]" key={item.name}>
              <span className="flex min-w-0 items-center gap-1.5 text-muted">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 font-medium text-text">
                {Math.round((item.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
