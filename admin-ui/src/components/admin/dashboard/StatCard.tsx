import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  comparison: string;
  comparisonDetail: string;
  tone: "positive" | "warning";
  icon: LucideIcon;
};

export function StatCard({
  label,
  value,
  comparison,
  comparisonDetail,
  tone,
  icon: Icon,
}: StatCardProps) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">
            {value}
          </p>
        </div>
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-md ${
            tone === "positive"
              ? "bg-secondary/10 text-secondary"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <Icon aria-hidden="true" size={21} />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
        <span
          className={`font-semibold ${
            tone === "positive" ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {comparison}
        </span>
        <span className="text-muted">{comparisonDetail}</span>
      </div>
    </article>
  );
}
