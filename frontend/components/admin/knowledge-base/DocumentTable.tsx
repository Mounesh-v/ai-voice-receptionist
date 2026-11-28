"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { documentStatuses } from "@/data/documents";
import type {
  DocumentStatus,
  DocumentSortKey,
  KnowledgeDocument,
  SortOrder,
} from "@/types/document";

type DocumentTableProps = {
  documents: KnowledgeDocument[];
  currentPage: number;
  pageCount: number;
  pageSize: number;
  sortKey: DocumentSortKey;
  sortOrder: SortOrder;
  totalDocuments: number;
  onPageChange: (page: number) => void;
  onSort: (key: DocumentSortKey) => void;
  onView: (document: KnowledgeDocument) => void;
  onEdit: (document: KnowledgeDocument) => void;
  onDelete: (document: KnowledgeDocument) => void;
  onDownload: (document: KnowledgeDocument) => void;
  onStatusChange: (document: KnowledgeDocument, status: DocumentStatus) => void;
  onReset: () => void;
};

export function DocumentTable({
  documents,
  currentPage,
  pageCount,
  pageSize,
  sortKey,
  sortOrder,
  totalDocuments,
  onPageChange,
  onSort,
  onView,
  onEdit,
  onDelete,
  onDownload,
  onStatusChange,
  onReset,
}: DocumentTableProps) {
  const firstItem = totalDocuments === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalDocuments);

  return (
    <section
      aria-label="Document library"
      className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 md:px-5">
        <div>
          <h2 className="text-base font-semibold text-primary">Document library</h2>
          <p className="mt-1 text-xs text-muted">Fictional PDF records · demo data only</p>
        </div>
        <p aria-live="polite" className="text-xs text-muted">
          {totalDocuments} {totalDocuments === 1 ? "document" : "documents"} found
        </p>
      </div>

      {documents.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-slate-50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Document ID</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">File Size</th>
                  <th className="px-4 py-3 font-medium">
                    <SortButton
                      label="Upload date"
                      columnKey="uploadDate"
                      sortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <SortButton
                      label="Last updated"
                      columnKey="lastUpdated"
                      sortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Uploaded by</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((document) => (
                  <tr className="text-text transition-colors hover:bg-slate-50/70" key={document.id}>
                    <td className="min-w-52 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded bg-rose-50 text-rose-700">
                          <FileText aria-hidden="true" size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-56 truncate font-medium text-primary">{document.name}</span>
                          <span className="mt-0.5 block text-[10px] text-muted">{document.fileType} document</span>
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-secondary">{document.id}</td>
                    <td className="max-w-40 px-4 py-3">{document.category}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatFileSize(document.sizeBytes)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(document.uploadDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(document.lastUpdated)}</td>
                    <td className="px-4 py-3">
                      <StatusSelect document={document} onChange={onStatusChange} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{document.uploadedBy}</td>
                    <td className="px-4 py-3">
                      <ActionButtons
                        document={document}
                        onView={onView}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onDownload={onDownload}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul aria-label="Knowledge documents" className="divide-y divide-border md:hidden">
            {documents.map((document) => (
              <li className="space-y-3 p-4" key={document.id}>
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded bg-rose-50 text-rose-700">
                    <FileText aria-hidden="true" size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-xs font-semibold text-primary">{document.name}</p>
                    <p className="mt-1 text-[11px] text-muted">{document.id} · {formatFileSize(document.sizeBytes)}</p>
                  </div>
                  <StatusSelect document={document} onChange={onStatusChange} />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <MobileDetail label="Category" value={document.category} />
                  <MobileDetail label="Upload date" value={formatDate(document.uploadDate)} />
                  <MobileDetail label="Last updated" value={formatDate(document.lastUpdated)} />
                  <MobileDetail label="Uploaded by" value={document.uploadedBy} />
                </div>
                <ActionButtons
                  document={document}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDownload={onDownload}
                />
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted md:px-5">
            <p>Showing {firstItem}–{lastItem} of {totalDocuments} documents</p>
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
            <FileText aria-hidden="true" size={20} />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-primary">No documents found</h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
            No documents match the current search and filters. Try changing them or clear all filters.
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
  columnKey: DocumentSortKey;
  sortKey: DocumentSortKey;
  sortOrder: SortOrder;
  onSort: (key: DocumentSortKey) => void;
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

function StatusSelect({
  document,
  onChange,
}: {
  document: KnowledgeDocument;
  onChange: (document: KnowledgeDocument, status: DocumentStatus) => void;
}) {
  const statusStyles: Record<DocumentStatus, string> = {
    Active: "text-emerald-700",
    Processing: "text-amber-800",
    Failed: "text-rose-700",
    Draft: "text-slate-600",
  };

  return (
    <select
      aria-label={`Update status for ${document.name}`}
      className={`h-8 max-w-32 rounded-md border border-border bg-card px-2 text-[11px] font-medium outline-none focus:border-secondary ${statusStyles[document.status]}`}
      onChange={(event) => onChange(document, event.target.value as DocumentStatus)}
      value={document.status}
    >
      {documentStatuses.map((status) => (
        <option key={status} value={status}>{status}</option>
      ))}
    </select>
  );
}

function ActionButtons({
  document,
  onView,
  onEdit,
  onDelete,
  onDownload,
}: {
  document: KnowledgeDocument;
  onView: (document: KnowledgeDocument) => void;
  onEdit: (document: KnowledgeDocument) => void;
  onDelete: (document: KnowledgeDocument) => void;
  onDownload: (document: KnowledgeDocument) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <IconButton
        label={`View document ${document.name}`}
        icon={Eye}
        onClick={() => onView(document)}
      />
      <IconButton
        label={`Edit document ${document.name}`}
        icon={Pencil}
        onClick={() => onEdit(document)}
      />
      <IconButton
        label={`Download document ${document.name}`}
        icon={Download}
        onClick={() => onDownload(document)}
      />
      <IconButton
        label={`Delete document ${document.name}`}
        icon={Trash2}
        onClick={() => onDelete(document)}
        destructive
      />
    </div>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  destructive = false,
}: {
  label: string;
  icon: typeof Eye;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={`rounded-md border border-transparent p-1.5 transition-colors hover:border-border hover:bg-background ${
        destructive ? "text-muted hover:text-rose-700" : "text-muted hover:text-secondary"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" size={15} />
    </button>
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

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
