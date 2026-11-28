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
import {
  isAppointmentRange,
  type AppointmentRange,
} from "@/data/dashboard";

type TrendPoint = {
  label: string;
  completed: number;
  pending: number;
  cancelled: number;
};

type AppointmentChartProps = {
  range: AppointmentRange;
  onRangeChange: (range: AppointmentRange) => void;
  data?: TrendPoint[];
};

export function AppointmentChart({
  range,
  onRangeChange,
  data,
}: AppointmentChartProps) {
  const chartData = data ?? [];
  return (
    <section
      aria-label="Appointment analytics"
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text">
            Appointment trends
          </h3>
          <p className="mt-1 text-xs text-muted">
            Daily appointment activity by status
          </p>
        </div>
        <label className="text-xs text-muted">
          <span className="sr-only">Appointment chart date range</span>
          <select
            aria-label="Appointment chart date range"
            className="h-9 rounded-md border border-border bg-card px-2.5 text-text outline-none focus:border-secondary"
            onChange={(event) => {
              const value = event.target.value;
              onRangeChange(isAppointmentRange(value) ? value : "7d");
            }}
            value={range}
          >
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
        </label>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
          >
            <CartesianGrid stroke="#E5EAF0" strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: "#718096", fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tick={{ fill: "#718096", fontSize: 12 }}
              tickLine={false}
              width={42}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #E5EAF0",
                borderRadius: 8,
                color: "#243447",
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Line
              dataKey="completed"
              name="Completed"
              stroke="#087E8B"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              dataKey="pending"
              name="Pending"
              stroke="#E6A23C"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              dataKey="cancelled"
              name="Cancelled"
              stroke="#C65B62"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
