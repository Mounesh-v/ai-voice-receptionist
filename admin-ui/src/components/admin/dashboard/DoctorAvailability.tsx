import { Clock3 } from "lucide-react";
import { doctorAvailability } from "@/data/dashboard";

const statusClassNames = {
  Available: "bg-emerald-50 text-emerald-700",
  "In consultation": "bg-blue-50 text-blue-700",
  "Off duty": "bg-slate-100 text-slate-600",
};

export function DoctorAvailability() {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text">Doctor availability</h3>
        <p className="mt-1 text-xs text-muted">
          Current schedules and next available times
        </p>
      </div>
      <ul className="divide-y divide-border">
        {doctorAvailability.map((doctor) => (
          <li
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            key={doctor.name}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-semibold text-secondary">
              {doctor.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">
                {doctor.name}
              </p>
              <p className="truncate text-xs text-muted">{doctor.specialty}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClassNames[doctor.status]}`}
              >
                {doctor.status}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <Clock3 aria-hidden="true" size={12} />
                {doctor.time}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
