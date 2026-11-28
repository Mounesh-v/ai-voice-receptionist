"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Download, House } from "lucide-react";
import { reportDateRanges } from "@/data/reports";
import type { ReportDateRange } from "@/types/reports";

type ReportHeaderProps = {
  dateRange: ReportDateRange;
  onDateRangeChange: (range: ReportDateRange) => void;
  onExport: () => void;
};

export function ReportHeader({
  dateRange,
  onDateRangeChange,
  onExport,
}: ReportHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5">
          <Link
            className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-secondary"
            href="/admin/dashboard"
          >
            <House aria-hidden="true" size={13} />
            Dashboard
          </Link>
          <ChevronRight aria-hidden="true" className="text-muted" size={13} />
          <span aria-current="page" className="text-xs font-medium text-text">
            Reports &amp; Analytics
          </span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Reports &amp; Analytics
        </h1>
        <p className="mt-1 text-sm text-muted">
          Monitor hospital performance and operational statistics.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          Date range
          <span className="relative">
            <CalendarDays
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={15}
            />
            <select
              aria-label="Report date range"
              className="h-10 min-w-40 rounded-md border border-border bg-card pl-9 pr-3 text-sm text-text outline-none transition-colors focus:border-secondary"
              onChange={(event) =>
                onDateRangeChange(event.target.value as ReportDateRange)
              }
              value={dateRange}
            >
              {reportDateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </span>
        </label>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
          onClick={onExport}
          type="button"
        >
          <Download aria-hidden="true" size={16} />
          Export Report
        </button>
      </div>
    </header>
  );
}
