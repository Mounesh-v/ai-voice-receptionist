"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { callAnalytics } from "@/data/calls";
import type { CallDateRange } from "@/types/call";

export function CallAnalytics({ range }: { range: CallDateRange }) {
  const data = callAnalytics[range];

  return (
    <section aria-label="Call analytics" className="grid gap-5 lg:grid-cols-2">
      <article className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-text">Call volume</h2>
          <p className="mt-1 text-xs text-muted">
            Incoming, successful and missed calls
          </p>
        </div>
        <div className="h-[270px] w-full">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={data.volume} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
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
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line dataKey="incoming" name="Incoming" stroke="#14283F" strokeWidth={2} dot={false} />
              <Line dataKey="successful" name="Successful" stroke="#087E8B" strokeWidth={2} dot={false} />
              <Line dataKey="missed" name="Missed" stroke="#C65B62" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-text">Call outcomes</h2>
          <p className="mt-1 text-xs text-muted">
            Distribution by recorded call outcome
          </p>
        </div>
        <div className="h-[270px] w-full">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={data.outcomes}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
            >
              <CartesianGrid stroke="#E5EAF0" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                allowDecimals={false}
                axisLine={false}
                tick={{ fill: "#718096", fontSize: 10 }}
                tickLine={false}
                type="number"
              />
              <YAxis
                axisLine={false}
                dataKey="name"
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
              />
              <Bar dataKey="value" fill="#087E8B" name="Calls" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
