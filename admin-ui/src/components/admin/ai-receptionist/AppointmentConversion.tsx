import { CalendarCheck2, TrendingUp } from "lucide-react";
import { callAnalytics } from "@/data/calls";
import type { CallDateRange } from "@/types/call";

export function AppointmentConversion({ range }: { range: CallDateRange }) {
  const data = callAnalytics[range];

  return (
    <section
      aria-label="Appointment conversion"
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Appointment conversion</h2>
          <p className="mt-1 text-xs text-muted">Calls resulting in a booking</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-md bg-teal-50 text-secondary">
          <CalendarCheck2 aria-hidden="true" size={18} />
        </span>
      </div>
      <div className="mt-5 flex items-end gap-2">
        <p className="text-3xl font-semibold tracking-tight text-primary">
          {data.conversionPercent.toFixed(1)}%
        </p>
        <p className="pb-1 text-xs text-muted">{data.bookings.toLocaleString()} bookings</p>
      </div>
      <div
        aria-label={`${data.conversionPercent.toFixed(1)}% of calls resulted in a booking`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={data.conversionPercent}
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-secondary transition-[width]"
          style={{ width: `${data.conversionPercent}%` }}
        />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
        <TrendingUp aria-hidden="true" size={14} />
        {data.conversionChange}
      </p>
    </section>
  );
}
