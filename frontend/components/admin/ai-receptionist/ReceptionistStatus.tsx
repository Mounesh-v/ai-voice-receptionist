import { Activity, Clock3, Headset, PhoneCall } from "lucide-react";

const statusDetails = [
  { label: "Voice assistant", value: "Demo mode", icon: Headset },
  { label: "Calls handled", value: "1,248", icon: PhoneCall },
  { label: "Last activity", value: "Nov 15, 2026 · 2:36 PM", icon: Activity },
  { label: "Working hours", value: "8:00 AM – 8:00 PM", icon: Clock3 },
];

export function ReceptionistStatus() {
  return (
    <section
      aria-label="AI receptionist operational status"
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Receptionist status</h2>
          <p className="mt-1 text-xs text-muted">Sample operational information</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-600" />
          Online · Demo
        </span>
      </div>
      <div className="mt-4 rounded-md border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-900">
        Demo status only. No live voice assistant or phone system is connected.
      </div>
      <dl className="mt-4 divide-y divide-border">
        {statusDetails.map((detail) => {
          const Icon = detail.icon;
          return (
            <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={detail.label}>
              <Icon aria-hidden="true" className="shrink-0 text-muted" size={16} />
              <dt className="min-w-0 flex-1 text-xs text-muted">{detail.label}</dt>
              <dd className="text-right text-xs font-medium text-text">{detail.value}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
