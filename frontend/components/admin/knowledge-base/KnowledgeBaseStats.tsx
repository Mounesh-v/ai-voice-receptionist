import {
  CircleCheck,
  CircleX,
  Files,
  LoaderCircle,
} from "lucide-react";
import { initialDocuments } from "@/data/documents";
import type { KnowledgeDocument } from "@/types/document";

const initialStatusCounts = initialDocuments.reduce(
  (counts, document) => {
    counts[document.status] += 1;
    return counts;
  },
  { Active: 0, Processing: 0, Failed: 0, Draft: 0 },
);

export function getKnowledgeBaseCounts(documents: KnowledgeDocument[]) {
  const currentStatusCounts = documents.reduce(
    (counts, document) => {
      counts[document.status] += 1;
      return counts;
    },
    { Active: 0, Processing: 0, Failed: 0, Draft: 0 },
  );

  return {
    total: 128 + documents.length - initialDocuments.length,
    active: 112 + currentStatusCounts.Active - initialStatusCounts.Active,
    processing:
      8 + currentStatusCounts.Processing - initialStatusCounts.Processing,
    failed: 8 + currentStatusCounts.Failed - initialStatusCounts.Failed,
  };
}

export function KnowledgeBaseStats({
  documents,
}: {
  documents: KnowledgeDocument[];
}) {
  const counts = getKnowledgeBaseCounts(documents);
  const stats = [
    {
      label: "Total Documents",
      value: counts.total.toLocaleString(),
      note: "Hospital-wide sample total",
      icon: Files,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Active Documents",
      value: counts.active.toLocaleString(),
      note: "Available in this demo library",
      icon: CircleCheck,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Processing",
      value: counts.processing.toLocaleString(),
      note: "Sample status only",
      icon: LoaderCircle,
      tone: "bg-amber-50 text-amber-800",
    },
    {
      label: "Failed",
      value: counts.failed.toLocaleString(),
      note: "Sample status only",
      icon: CircleX,
      tone: "bg-rose-50 text-rose-700",
    },
  ];

  return (
    <section
      aria-label="Knowledge base statistics"
      className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:p-5"
            key={stat.label}
          >
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-md ${stat.tone}`}>
              <Icon aria-hidden="true" size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted">{stat.note}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
