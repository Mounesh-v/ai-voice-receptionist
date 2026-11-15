"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  CheckCircle2,
  FileUp,
  FileWarning,
  LoaderCircle,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { documentCategories } from "@/data/documents";
import type { DocumentCategory } from "@/types/document";

const maxFileSize = 20 * 1024 * 1024;

type DocumentUploadProps = {
  selectedFiles: File[];
  category: DocumentCategory;
  uploading: boolean;
  progress: number;
  errorMessage: string;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onCategoryChange: (category: DocumentCategory) => void;
  onStartUpload: () => void;
  onClose: () => void;
};

export function DocumentUpload({
  selectedFiles,
  category,
  uploading,
  progress,
  errorMessage,
  onAddFiles,
  onRemoveFile,
  onCategoryChange,
  onStartUpload,
  onClose,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const receiveFiles = (files: File[]) => {
    const accepted: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const isPdfName = file.name.toLowerCase().endsWith(".pdf");
      const hasPdfMime = file.type === "" || file.type.toLowerCase() === "application/pdf";
      if (!isPdfName || !hasPdfMime) {
        errors.push(`${file.name}: select a PDF file.`);
      } else if (file.size === 0) {
        errors.push(`${file.name}: the file is empty.`);
      } else if (file.size > maxFileSize) {
        errors.push(`${file.name}: files must be 20 MB or smaller.`);
      } else {
        accepted.push(file);
      }
    }

    setValidationMessage(errors.join(" "));
    if (accepted.length) onAddFiles(accepted);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!uploading) receiveFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <section
      aria-label="Upload PDF documents"
      className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-primary">Add documents</h2>
          <p className="mt-1 text-xs text-muted">
            Select one or more PDF files. Files stay in this browser session.
          </p>
        </div>
        <button
          aria-label="Close document upload"
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
          disabled={uploading}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <div
        className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors sm:px-6 ${
          isDragging
            ? "border-secondary bg-teal-50/60"
            : "border-border bg-slate-50/70"
        } ${uploading ? "pointer-events-none opacity-70" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-teal-50 text-secondary">
          <FileUp aria-hidden="true" size={21} />
        </span>
        <p className="mt-3 text-sm font-medium text-text">
          Drag and drop PDF files here
        </p>
        <p className="mt-1 text-xs text-muted">PDF only · Up to 20 MB per file</p>
        <input
          ref={inputRef}
          accept="application/pdf,.pdf"
          aria-label="Choose PDF documents"
          className="sr-only"
          disabled={uploading}
          multiple
          onChange={(event) => {
            receiveFiles(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }}
          type="file"
        />
        <button
          className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3.5 text-xs font-medium text-text transition-colors hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Upload aria-hidden="true" size={15} />
          Choose PDF files
        </button>
      </div>

      {(validationMessage || errorMessage) && (
        <p
          className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-800"
          role="alert"
        >
          <FileWarning aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
          <span>{errorMessage || validationMessage}</span>
        </p>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-primary">
              Selected files ({selectedFiles.length})
            </h3>
            <label className="flex items-center gap-2 text-xs text-muted">
              Category
              <select
                aria-label="Category for uploaded documents"
                className="h-8 rounded-md border border-border bg-card px-2 text-xs text-text outline-none focus:border-secondary"
                disabled={uploading}
                onChange={(event) => onCategoryChange(event.target.value as DocumentCategory)}
                value={category}
              >
                {documentCategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <ul className="divide-y divide-border rounded-md border border-border">
            {selectedFiles.map((file, index) => (
              <li
                className="flex items-center gap-3 px-3 py-2.5"
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded bg-rose-50 text-rose-700">
                  <FileUp aria-hidden="true" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-text">{file.name}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{formatFileSize(file.size)}</span>
                </span>
                <button
                  aria-label={`Remove ${file.name} from upload`}
                  className="rounded p-1.5 text-muted transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={uploading}
                  onClick={() => onRemoveFile(index)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploading && (
        <div className="mt-4" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
              Simulating local upload
            </span>
            <span>{progress}%</span>
          </div>
          <div
            aria-label={`Upload simulation progress: ${progress}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-secondary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[11px] leading-5 text-muted">
          Upload is simulated locally. No files are sent to a server, processed or indexed by AI.
        </p>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-secondary px-4 text-xs font-medium text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!selectedFiles.length || uploading}
          onClick={onStartUpload}
          type="button"
        >
          {uploading ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
          ) : (
            <CheckCircle2 aria-hidden="true" size={15} />
          )}
          {uploading ? "Adding files..." : "Add to library"}
        </button>
      </div>
    </section>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
