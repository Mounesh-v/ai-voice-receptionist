import { Database, RefreshCw, ShieldCheck } from "lucide-react";

export function KnowledgeBaseOverview({
  activeDocuments,
  lastUpdated,
}: {
  activeDocuments: number;
  lastUpdated: string;
}) {
  return (
    <section
      aria-label="Knowledge base overview"
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700">
            <Database aria-hidden="true" size={19} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-primary">Knowledge base overview</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              The knowledge base contains hospital information that helps the AI receptionist respond to patient enquiries about doctors, departments, services, appointments and hospital policies.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900">
          <RefreshCw aria-hidden="true" size={13} />
          Demo · Not synchronized
        </span>
      </div>
      <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
        <OverviewItem icon={RefreshCw} label="Last updated" value={lastUpdated} />
        <OverviewItem
          icon={ShieldCheck}
          label="Active documents"
          value={activeDocuments.toLocaleString()}
        />
        <OverviewItem
          icon={Database}
          label="AI indexing"
          value="Not connected"
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        Demo synchronization status only. No actual AI indexing or synchronization is happening.
      </p>
    </section>
  );
}

function OverviewItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon aria-hidden="true" className="shrink-0 text-muted" size={15} />
      <div>
        <p className="text-[11px] text-muted">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-text">{value}</p>
      </div>
    </div>
  );
}
