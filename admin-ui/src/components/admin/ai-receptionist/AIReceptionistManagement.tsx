"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, House } from "lucide-react";
import { AppointmentConversion } from "@/components/admin/ai-receptionist/AppointmentConversion";
import { AIReceptionistStats } from "@/components/admin/ai-receptionist/AIReceptionistStats";
import { CallAnalytics } from "@/components/admin/ai-receptionist/CallAnalytics";
import { CallDetailsPanel } from "@/components/admin/ai-receptionist/CallDetailsPanel";
import { CallFilters } from "@/components/admin/ai-receptionist/CallFilters";
import { CallHistoryTable } from "@/components/admin/ai-receptionist/CallHistoryTable";
import { ReceptionistStatus } from "@/components/admin/ai-receptionist/ReceptionistStatus";
import { initialCalls } from "@/data/calls";
import type {
  CallDateRange,
  CallFiltersState,
  CallRecord,
  CallSortKey,
  SortOrder,
} from "@/types/call";

const pageSize = 8;

const defaultFilters: CallFiltersState = {
  search: "",
  dateFrom: "",
  dateTo: "",
  status: "All",
  purpose: "All",
};

export function AIReceptionistManagement() {
  const [range, setRange] = useState<CallDateRange>("7d");
  const [filters, setFilters] = useState<CallFiltersState>(defaultFilters);
  const [sortKey, setSortKey] = useState<CallSortKey>("dateTime");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const filteredCalls = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return initialCalls
      .filter((call) => {
        const matchesSearch =
          !query ||
          call.patientName.toLowerCase().includes(query) ||
          call.id.toLowerCase().includes(query);
        const matchesDate =
          (!filters.dateFrom || call.date >= filters.dateFrom) &&
          (!filters.dateTo || call.date <= filters.dateTo);
        const matchesStatus = filters.status === "All" || call.status === filters.status;
        const matchesPurpose = filters.purpose === "All" || call.purpose === filters.purpose;
        return matchesSearch && matchesDate && matchesStatus && matchesPurpose;
      })
      .sort((first, second) => {
        let comparison = 0;
        if (sortKey === "dateTime") {
          comparison = `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`);
        } else if (sortKey === "durationSeconds") {
          comparison = first.durationSeconds - second.durationSeconds;
        } else {
          comparison = first.patientName.localeCompare(second.patientName);
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [filters, sortKey, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filteredCalls.length / pageSize));
  const visiblePage = Math.min(currentPage, pageCount);
  const pageCalls = filteredCalls.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  const updateFilters = (updates: Partial<CallFiltersState>) => {
    setFilters((current) => ({ ...current, ...updates }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const changeSort = (key: CallSortKey) => {
    if (key === sortKey) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
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
              AI Receptionist
            </span>
          </nav>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-primary">
              AI Receptionist
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-600" />
              Online · Demo
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Monitor AI voice interactions and automated appointment activities.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 self-start text-xs font-medium text-muted sm:self-auto">
          Analytics date range
          <select
            aria-label="Analytics date range"
            className="h-10 min-w-36 rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
            onChange={(event) => setRange(event.target.value as CallDateRange)}
            value={range}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </label>
      </header>

      <AIReceptionistStats />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(290px,1fr)]">
        <CallAnalytics range={range} />
        <div className="space-y-5">
          <AppointmentConversion range={range} />
          <ReceptionistStatus />
        </div>
      </div>

      <section aria-label="Call history management" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-primary">Call history</h2>
          <p className="mt-1 text-sm text-muted">
            Search call records, review conversation transcripts and inspect outcomes.
          </p>
        </div>
        <CallFilters filters={filters} onChange={updateFilters} onReset={resetFilters} />
        <CallHistoryTable
          calls={pageCalls}
          currentPage={visiblePage}
          pageCount={pageCount}
          pageSize={pageSize}
          sortKey={sortKey}
          sortOrder={sortOrder}
          totalCalls={filteredCalls.length}
          onPageChange={setCurrentPage}
          onSort={changeSort}
          onView={setSelectedCall}
          onReset={resetFilters}
        />
      </section>

      {selectedCall && (
        <CallDetailsPanel call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}
