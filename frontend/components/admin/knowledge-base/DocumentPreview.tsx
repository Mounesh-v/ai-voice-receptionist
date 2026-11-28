"use client";

import { useEffect } from "react";
import { FileWarning, X } from "lucide-react";
import type { KnowledgeDocument } from "@/types/document";

export function DocumentPreview({
  document: documentRecord,
  onClose,
}: {
  document: KnowledgeDocument;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.document.addEventListener("keydown", handleKeyDown);
    return () => window.document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button
        aria-label="Close document preview"
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="document-preview-title"
        aria-modal="true"
        className="relative z-10 my-auto max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl sm:p-6"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-secondary">{documentRecord.id} · {documentRecord.fileType}</p>
            <h2 className="mt-1 break-words text-lg font-semibold text-primary" id="document-preview-title">
              {documentRecord.name}
            </h2>
          </div>
          <button
            aria-label="Close document preview"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-h-72 overflow-hidden rounded-md border border-border bg-slate-100">
            {documentRecord.objectUrl ? (
              <iframe
                className="h-[65vh] min-h-72 w-full bg-white"
                src={documentRecord.objectUrl}
                title={`PDF preview: ${documentRecord.name}`}
              />
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-slate-200 text-muted">
                  <FileWarning aria-hidden="true" size={22} />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-primary">Preview unavailable</h3>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
                  This is a sample library record with no PDF file attached. Select a PDF in this browser session to preview its actual content.
                </p>
              </div>
            )}
          </div>
          <aside aria-label="Document metadata" className="rounded-md border border-border bg-slate-50 p-4">
            <h3 className="text-xs font-semibold text-primary">Document details</h3>
            <dl className="mt-3 space-y-3">
              <Metadata label="Category" value={documentRecord.category} />
              <Metadata label="File size" value={formatFileSize(documentRecord.sizeBytes)} />
              <Metadata label="Upload date" value={formatDate(documentRecord.uploadDate)} />
              <Metadata label="Last updated" value={formatDate(documentRecord.lastUpdated)} />
              <Metadata label="Status" value={documentRecord.status} />
              <Metadata label="Uploaded by" value={documentRecord.uploadedBy} />
              {documentRecord.description && (
                <Metadata label="Description" value={documentRecord.description} />
              )}
            </dl>
          </aside>
        </div>

        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <button
            className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-xs font-medium leading-5 text-text">{value}</dd>
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
