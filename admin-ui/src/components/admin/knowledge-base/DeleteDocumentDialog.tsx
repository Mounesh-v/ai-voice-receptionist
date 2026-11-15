"use client";

import { useEffect } from "react";
import { Trash2, X } from "lucide-react";
import type { KnowledgeDocument } from "@/types/document";

export function DeleteDocumentDialog({
  document: documentRecord,
  onClose,
  onConfirm,
}: {
  document: KnowledgeDocument;
  onClose: () => void;
  onConfirm: () => void;
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
        aria-label="Close delete confirmation"
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="delete-document-title"
        aria-modal="true"
        className="relative z-10 my-auto w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-primary" id="delete-document-title">
            Delete document
          </h2>
          <button
            aria-label="Close delete confirmation"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <span className="flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-700">
          <Trash2 aria-hidden="true" size={20} />
        </span>
        <p className="mt-4 text-sm leading-6 text-text">
          Remove <strong>{documentRecord.name}</strong> ({documentRecord.id}) from this local demo library?
          This action cannot be undone in the current session.
        </p>
        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <button
            className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
            onClick={onClose}
            type="button"
          >
            Keep document
          </button>
          <button
            className="h-9 rounded-md bg-rose-700 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-800"
            onClick={onConfirm}
            type="button"
          >
            Delete document
          </button>
        </div>
      </section>
    </div>
  );
}
