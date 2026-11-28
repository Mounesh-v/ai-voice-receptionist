"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { CallRecord, CallSortKey, SortOrder } from "@/types/call";

type CallHistoryTableProps = {
  calls: CallRecord[];
  currentPage: number;
  pageCount: number;
  pageSize: number;
  sortKey: CallSortKey;
  sortOrder: SortOrder;
  totalCalls: number;
  onPageChange: (page: number) => void;
  onSort: (key: CallSortKey) => void;
  onView: (call: CallRecord) => void;
  onReset: () => void;
};

export function CallHistoryTable({
  calls,
  currentPage,
  pageCount,
  pageSize,
  sortKey,
  sortOrder,
  totalCalls,
  onPageChange,
  onSort,
  onView,
  onReset,
}: CallHistoryTableProps) {
  const firstItem = totalCalls === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalCalls);

  return (
    <section
      aria-label="Call history"
      className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 md:px-5">
        <div>
          <h2 className="text-base font-semibold text-primary">Call history</h2>
          <p className="mt-1 text-xs text-muted">Fictional sample records · demo data only</p>
        </div>
        <p aria-live="polite" className="text-xs text-muted">
          {totalCalls} {totalCalls === 1 ? "call" : "calls"} found
        </p>
      </div>

      {calls.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="bg-slate-50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Call ID</th>
                  <th className="px-4 py-3 font-medium">
                    <SortButton
                      label="Patient name"
                      columnKey="patientName"
                      sortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Phone number</th>
                  <th className="px-4 py-3 font-medium">
                    <SortButton
                      label="Call date"
                      columnKey="dateTime"
                      sortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">
                    <SortButton
                      label="Duration"
                      columnKey="durationSeconds"
                      sortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Call purpose</th>
                  <th className="px-4 py-3 font-medium">Outcome</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calls.map((call) => (
                  <tr className="text-text transition-colors hover:bg-slate-50/70" key={call.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-secondary">{call.id}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-medium text-primary">{call.patientName}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{call.patientId}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{call.phone}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(call.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatTime(call.time)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDuration(call.durationSeconds)}</td>
                    <td className="px-4 py-3">{call.purpose}</td>
                    <td className="px-4 py-3">{call.outcome}</td>
                    <td className="px-4 py-3"><StatusBadge status={call.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <ViewButton call={call} onView={onView} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul aria-label="Call records" className="divide-y divide-border md:hidden">
            {calls.map((call) => (
              <li className="space-y-3 p-4" key={call.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">{call.patientName}</p>
                    <p className="mt-0.5 text-xs text-muted">{call.id} · {call.patientId}</p>
                  </div>
                  <StatusBadge status={call.status} />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <MobileDetail label="Phone" value={call.phone} />
                  <MobileDetail label="Date & time" value={`${formatDate(call.date)} · ${formatTime(call.time)}`} />
                  <MobileDetail label="Duration" value={formatDuration(call.durationSeconds)} />
                  <MobileDetail label="Purpose" value={call.purpose} />
                  <MobileDetail label="Outcome" value={call.outcome} />
                </div>
                <div className="flex justify-end">
                  <ViewButton call={call} onView={onView} />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted md:px-5">
            <p>Showing {firstItem}–{lastItem} of {totalCalls} calls</p>
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous page"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 font-medium text-text transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={14} />
                Previous
              </button>
              <span aria-live="polite" className="whitespace-nowrap">
                Page {currentPage} of {pageCount}
              </span>
              <button
                aria-label="Next page"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 font-medium text-text transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage >= pageCount}
                onClick={() => onPageChange(currentPage + 1)}
                type="button"
              >
                Next
                <ChevronRight aria-hidden="true" size={14} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-muted">
            <Eye aria-hidden="true" size={20} />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-primary">No calls found</h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
            No call records match the selected search and filters. Try changing them or clear all filters.
          </p>
          <button
            className="mt-4 rounded-md border border-border px-3 py-2 text-xs font-medium text-text transition-colors hover:border-secondary hover:text-secondary"
            onClick={onReset}
            type="button"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}

function SortButton({
  label,
  columnKey,
  sortKey,
  sortOrder,
  onSort,
}: {
  label: string;
  columnKey: CallSortKey;
  sortKey: CallSortKey;
  sortOrder: SortOrder;
  onSort: (key: CallSortKey) => void;
}) {
  const active = sortKey === columnKey;
  const Icon = sortOrder === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      aria-label={`Sort by ${label}${active ? ` ${sortOrder === "asc" ? "ascending" : "descending"}` : ""}`}
      className="inline-flex items-center gap-1 text-left transition-colors hover:text-primary"
      onClick={() => onSort(columnKey)}
      type="button"
    >
      {label}
      {active && <Icon aria-hidden="true" size={12} />}
    </button>
  );
}

function ViewButton({
  call,
  onView,
}: {
  call: CallRecord;
  onView: (call: CallRecord) => void;
}) {
  return (
    <button
      aria-label={`View conversation for ${call.id}`}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-text transition-colors hover:border-secondary hover:text-secondary"
      onClick={() => onView(call)}
      type="button"
    >
      <Eye aria-hidden="true" size={14} />
      View Conversation
    </button>
  );
}

function StatusBadge({ status }: { status: CallRecord["status"] }) {
  const styles: Record<CallRecord["status"], string> = {
    Completed: "bg-emerald-50 text-emerald-700",
    Missed: "bg-rose-50 text-rose-700",
    Transferred: "bg-amber-50 text-amber-800",
    Failed: "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 break-words text-xs font-medium text-text">{value}</p>
    </div>
  );
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatTime(time: string) {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDuration(seconds: number) {
  if (seconds === 0) return "0 sec";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}
