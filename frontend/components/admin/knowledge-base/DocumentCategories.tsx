"use client";

import {
  ArrowUpRight,
  BookOpenText,
  Building2,
  CalendarDays,
  CircleHelp,
  FolderOpen,
  HeartPulse,
  Siren,
  Stethoscope,
} from "lucide-react";
import { documentCategories } from "@/data/documents";
import type { DocumentCategory, KnowledgeDocument } from "@/types/document";

const categoryIcons = {
  "Hospital Information": Building2,
  "Doctor Information": Stethoscope,
  Departments: FolderOpen,
  "Appointment Policies": CalendarDays,
  "Medical Services": HeartPulse,
  FAQs: CircleHelp,
  "Emergency Information": Siren,
  "General Documents": BookOpenText,
} satisfies Record<DocumentCategory, typeof Building2>;

export function DocumentCategories({
  documents,
  selectedCategory,
  onSelect,
}: {
  documents: KnowledgeDocument[];
  selectedCategory: "All" | DocumentCategory;
  onSelect: (category: DocumentCategory) => void;
}) {
  return (
    <section aria-label="Knowledge categories">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-primary">Knowledge categories</h2>
          <p className="mt-1 text-sm text-muted">
            Select a category to filter the document library.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {documentCategories.map((category) => {
          const Icon = categoryIcons[category];
          const count = documents.filter((document) => document.category === category).length;
          const selected = selectedCategory === category;

          return (
            <button
              aria-label={`View category ${category}, ${count} documents`}
              aria-pressed={selected}
              className={`flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3.5 text-left shadow-sm transition-colors ${
                selected
                  ? "border-secondary ring-2 ring-secondary/10"
                  : "border-border hover:border-secondary/60"
              }`}
              key={category}
              onClick={() => onSelect(category)}
              type="button"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-secondary">
                <Icon aria-hidden="true" size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-primary">{category}</span>
                <span className="mt-1 block text-[11px] text-muted">
                  {count} {count === 1 ? "document" : "documents"}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-secondary">
                View
                <ArrowUpRight aria-hidden="true" size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
