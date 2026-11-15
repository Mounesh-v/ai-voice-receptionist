"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  appointmentStatusData,
  type AppointmentRange,
} from "@/data/dashboard";

export function AppointmentStatusChart({
  range,
}: {
  range: AppointmentRange;
}) {
  return (
    <section
      aria-label="Appointment status summary"
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="mb-1">
        <h3 className="text-base font-semibold text-text">Appointment status</h3>
        <p className="mt-1 text-xs text-muted">
          Status breakdown for the selected period
        </p>
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={appointmentStatusData[range]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="46%"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={3}
              stroke="none"
            >
              {appointmentStatusData[range].map((item) => (
                <Cell key={item.name} fill={item.color} />
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
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
