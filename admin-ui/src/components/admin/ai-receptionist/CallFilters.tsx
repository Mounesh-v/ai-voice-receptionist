"use client";

import { Search, X } from "lucide-react";
import { callPurposes, callStatuses } from "@/data/calls";
import type { CallFiltersState } from "@/types/call";

type CallFiltersProps = {
  filters: CallFiltersState;
  onChange: (updates: Partial<CallFiltersState>) => void;
  onReset: () => void;
};

export function CallFilters({ filters, onChange, onReset }: CallFiltersProps) {
  return (
    <section
      aria-label="Call filters"
      className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(210px,2fr)_1fr_1fr_1fr_1.4fr_auto]">
        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted">Search calls</span>
          <span className="flex h-10 items-center gap-2 rounded-md border border-border px-3 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/15">
            <Search aria-hidden="true" className="shrink-0 text-muted" size={16} />
            <input
              aria-label="Search calls by patient or call ID"
              className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
              onChange={(event) => onChange({ search: event.target.value })}
              placeholder="Patient or call ID"
              type="search"
              value={filters.search}
            />
          </span>
        </label>
        <DateFilter
          label="Call date from"
          value={filters.dateFrom}
          onChange={(dateFrom) => onChange({ dateFrom })}
        />
        <DateFilter
          label="Call date to"
          value={filters.dateTo}
          onChange={(dateTo) => onChange({ dateTo })}
        />
        <SelectFilter
          label="Call status"
          value={filters.status}
          options={callStatuses}
          onChange={(status) => onChange({ status: status as CallFiltersState["status"] })}
        />
        <SelectFilter
          label="Call purpose"
          value={filters.purpose}
          options={callPurposes}
          onChange={(purpose) => onChange({ purpose: purpose as CallFiltersState["purpose"] })}
        />
        <button
          className="inline-flex h-10 items-center justify-center gap-1.5 self-end rounded-md border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-secondary hover:text-secondary"
          onClick={onReset}
          type="button"
        >
          <X aria-hidden="true" size={15} />
          Clear
        </button>
      </div>
    </section>
  );
}

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input
        aria-label={label}
        className="h-10 w-full min-w-0 rounded-md border border-border bg-card px-2 text-sm text-text outline-none focus:border-secondary"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <select
        aria-label={`Filter by ${label.toLowerCase()}`}
        className="h-10 w-full rounded-md border border-border bg-card px-2.5 text-sm text-text outline-none focus:border-secondary"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="All">
          {label === "Call status" ? "All statuses" : "All purposes"}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
