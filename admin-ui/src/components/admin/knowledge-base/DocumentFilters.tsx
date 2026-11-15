"use client";

import { Search, X } from "lucide-react";
import { documentCategories, documentStatuses } from "@/data/documents";
import type { DocumentFiltersState, DocumentStatus } from "@/types/document";

export function DocumentFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: DocumentFiltersState;
  onChange: (updates: Partial<DocumentFiltersState>) => void;
  onReset: () => void;
}) {
  return (
    <section
      aria-label="Document filters"
      className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_1.3fr_1fr_auto]">
        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted">Search documents</span>
          <span className="flex h-10 items-center gap-2 rounded-md border border-border px-3 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/15">
            <Search aria-hidden="true" className="shrink-0 text-muted" size={16} />
            <input
              aria-label="Search documents by name or ID"
              className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
              onChange={(event) => onChange({ search: event.target.value })}
              placeholder="Document name or ID"
              type="search"
              value={filters.search}
            />
          </span>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted">Category</span>
          <select
            aria-label="Filter by document category"
            className="h-10 w-full rounded-md border border-border bg-card px-2.5 text-sm text-text outline-none focus:border-secondary"
            onChange={(event) =>
              onChange({ category: event.target.value as DocumentFiltersState["category"] })
            }
            value={filters.category}
          >
            <option value="All">All categories</option>
            {documentCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted">Status</span>
          <select
            aria-label="Filter by document status"
            className="h-10 w-full rounded-md border border-border bg-card px-2.5 text-sm text-text outline-none focus:border-secondary"
            onChange={(event) =>
              onChange({ status: event.target.value as DocumentFiltersState["status"] })
            }
            value={filters.status}
          >
            <option value="All">All statuses</option>
            {documentStatuses.map((status: DocumentStatus) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <button
          className="inline-flex h-10 items-center justify-center gap-1.5 self-end rounded-md border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-secondary hover:text-secondary"
          onClick={onReset}
          type="button"
        >
          <X aria-hidden="true" size={15} />
          Clear filters
        </button>
      </div>
    </section>
  );
}
