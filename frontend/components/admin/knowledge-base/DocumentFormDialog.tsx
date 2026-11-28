"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { documentCategories } from "@/data/documents";
import type {
  DocumentFormValues,
  KnowledgeDocument,
} from "@/types/document";

export function DocumentFormDialog({
  document: documentRecord,
  onClose,
  onSave,
}: {
  document: KnowledgeDocument;
  onClose: () => void;
  onSave: (values: DocumentFormValues) => void;
}) {
  const [values, setValues] = useState<DocumentFormValues>({
    name: documentRecord.name,
    category: documentRecord.category,
    description: documentRecord.description,
  });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.document.addEventListener("keydown", handleKeyDown);
    return () => window.document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = values.name.trim();
    if (!name) {
      setErrorMessage("Enter a document name.");
      return;
    }

    onSave({ ...values, name, description: values.description.trim() });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button
        aria-label="Close document editor"
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="document-editor-title"
        aria-modal="true"
        className="relative z-10 my-auto w-full max-w-xl rounded-lg border border-border bg-card p-5 shadow-xl sm:p-6"
        role="dialog"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-secondary">{documentRecord.id}</p>
            <h2 className="mt-1 text-lg font-semibold text-primary" id="document-editor-title">
              Edit document
            </h2>
          </div>
          <button
            aria-label="Close document editor"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text">
              Document name <span className="text-rose-700">*</span>
            </span>
            <input
              aria-label="Document name"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
              onChange={(event) => {
                setErrorMessage("");
                setValues((current) => ({ ...current, name: event.target.value }));
              }}
              required
              value={values.name}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text">Category</span>
            <select
              aria-label="Document category"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  category: event.target.value as DocumentFormValues["category"],
                }))
              }
              value={values.category}
            >
              {documentCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text">Description</span>
            <textarea
              aria-label="Document description"
              className="min-h-24 w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-sm text-text outline-none focus:border-secondary"
              onChange={(event) =>
                setValues((current) => ({ ...current, description: event.target.value }))
              }
              value={values.description}
            />
          </label>
          {errorMessage && (
            <p className="text-xs text-rose-700" role="alert">{errorMessage}</p>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
              type="submit"
            >
              Save changes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
