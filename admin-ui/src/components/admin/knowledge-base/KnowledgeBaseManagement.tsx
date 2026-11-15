"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, House, Plus } from "lucide-react";
import { DeleteDocumentDialog } from "@/components/admin/knowledge-base/DeleteDocumentDialog";
import { DocumentCategories } from "@/components/admin/knowledge-base/DocumentCategories";
import { DocumentFilters } from "@/components/admin/knowledge-base/DocumentFilters";
import { DocumentFormDialog } from "@/components/admin/knowledge-base/DocumentFormDialog";
import { DocumentPreview } from "@/components/admin/knowledge-base/DocumentPreview";
import { DocumentTable } from "@/components/admin/knowledge-base/DocumentTable";
import { DocumentUpload } from "@/components/admin/knowledge-base/DocumentUpload";
import { KnowledgeBaseOverview } from "@/components/admin/knowledge-base/KnowledgeBaseOverview";
import { getKnowledgeBaseCounts, KnowledgeBaseStats } from "@/components/admin/knowledge-base/KnowledgeBaseStats";
import { initialDocuments } from "@/data/documents";
import type {
  DocumentCategory,
  DocumentFiltersState,
  DocumentFormValues,
  DocumentSortKey,
  DocumentStatus,
  KnowledgeDocument,
  SortOrder,
} from "@/types/document";

const pageSize = 8;

const defaultFilters: DocumentFiltersState = {
  search: "",
  category: "All",
  status: "All",
};

export function KnowledgeBaseManagement() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(initialDocuments);
  const [filters, setFilters] = useState<DocumentFiltersState>(defaultFilters);
  const [sortKey, setSortKey] = useState<DocumentSortKey>("lastUpdated");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>("General Documents");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [documentToPreview, setDocumentToPreview] = useState<KnowledgeDocument | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<KnowledgeDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<KnowledgeDocument | null>(null);
  const uploadTimerRef = useRef<number | null>(null);
  const objectUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      if (uploadTimerRef.current) {
        window.clearInterval(uploadTimerRef.current);
      }
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, []);

  const filteredDocuments = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return documents
      .filter((document) => {
        const matchesSearch =
          !query ||
          document.name.toLowerCase().includes(query) ||
          document.id.toLowerCase().includes(query);
        const matchesCategory =
          filters.category === "All" || document.category === filters.category;
        const matchesStatus =
          filters.status === "All" || document.status === filters.status;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((first, second) => {
        const comparison = first[sortKey].localeCompare(second[sortKey]);
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [documents, filters, sortKey, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const visiblePage = Math.min(currentPage, pageCount);
  const pageDocuments = filteredDocuments.slice(
    (visiblePage - 1) * pageSize,
    visiblePage * pageSize,
  );
  const counts = getKnowledgeBaseCounts(documents);
  const latestUpdated = documents.reduce(
    (latest, document) => (document.lastUpdated > latest ? document.lastUpdated : latest),
    "",
  );

  const updateFilters = (updates: Partial<DocumentFiltersState>) => {
    setFilters((current) => ({ ...current, ...updates }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const selectCategory = (category: DocumentCategory) => {
    updateFilters({
      category: filters.category === category ? "All" : category,
    });
  };

  const changeSort = (key: DocumentSortKey) => {
    if (key === sortKey) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const addSelectedFiles = (files: File[]) => {
    setUploadError("");
    setSelectedFiles((current) => [...current, ...files]);
  };

  const startUpload = () => {
    if (!selectedFiles.length || uploading) return;

    const filesToUpload = selectedFiles;
    const category = uploadCategory;
    setUploadError("");
    setUploading(true);
    setUploadProgress(0);

    let progress = 0;
    uploadTimerRef.current = window.setInterval(() => {
      progress = Math.min(progress + 10, 100);
      setUploadProgress(progress);

      if (progress < 100) return;
      if (uploadTimerRef.current) {
        window.clearInterval(uploadTimerRef.current);
        uploadTimerRef.current = null;
      }

      const createdUrls: string[] = [];
      try {
        const highestId = documents.reduce((highest, document) => {
          const number = Number(document.id.replace("DOC-", ""));
          return Number.isNaN(number) ? highest : Math.max(highest, number);
        }, 0);
        const uploadDate = getTodayDate();
        const uploadedDocuments = filesToUpload.map((file, index) => {
          const objectUrl = URL.createObjectURL(file);
          createdUrls.push(objectUrl);
          objectUrlsRef.current.add(objectUrl);
          return {
            id: `DOC-${String(highestId + index + 1).padStart(4, "0")}`,
            name: file.name,
            fileType: "PDF" as const,
            sizeBytes: file.size,
            category,
            uploadDate,
            lastUpdated: uploadDate,
            status: "Draft" as const,
            uploadedBy: "Admin User",
            description: "Added locally in this browser session; no server upload or AI indexing occurred.",
            objectUrl,
          };
        });

        setDocuments((current) => [...uploadedDocuments, ...current]);
        setSelectedFiles([]);
        setCurrentPage(1);
        setUploading(false);
        setAnnouncement(
          `${uploadedDocuments.length} PDF ${uploadedDocuments.length === 1 ? "document was" : "documents were"} added to the local library as Draft. No server upload or AI indexing occurred.`,
        );
      } catch (error) {
        for (const objectUrl of createdUrls) {
          URL.revokeObjectURL(objectUrl);
          objectUrlsRef.current.delete(objectUrl);
        }
        setUploading(false);
        setUploadProgress(0);
        setUploadError(
          error instanceof Error
            ? `The selected PDFs could not be prepared for local preview: ${error.message}`
            : "The selected PDFs could not be prepared for local preview.",
        );
      }
    }, 100);
  };

  const updateDocumentStatus = (
    document: KnowledgeDocument,
    status: DocumentStatus,
  ) => {
    setDocuments((current) =>
      current.map((item) =>
        item.id === document.id
          ? { ...item, status, lastUpdated: getTodayDate() }
          : item,
      ),
    );
    setAnnouncement(`${document.name} status changed to ${status}.`);
  };

  const saveDocument = (values: DocumentFormValues) => {
    if (!documentToEdit) return;
    setDocuments((current) =>
      current.map((document) =>
        document.id === documentToEdit.id
          ? { ...document, ...values, lastUpdated: getTodayDate() }
          : document,
      ),
    );
    setAnnouncement(`${values.name} details were updated.`);
    setDocumentToEdit(null);
  };

  const confirmDelete = () => {
    if (!documentToDelete) return;
    if (documentToDelete.objectUrl) {
      URL.revokeObjectURL(documentToDelete.objectUrl);
      objectUrlsRef.current.delete(documentToDelete.objectUrl);
    }
    setDocuments((current) =>
      current.filter((document) => document.id !== documentToDelete.id),
    );
    setAnnouncement(`${documentToDelete.name} was removed from the local library.`);
    setDocumentToDelete(null);
  };

  const downloadDocument = (document: KnowledgeDocument) => {
    if (!document.objectUrl) {
      setAnnouncement(
        `Download unavailable: ${document.name} is a sample record without an attached PDF file.`,
      );
      return;
    }

    const link = window.document.createElement("a");
    link.href = document.objectUrl;
    link.download = document.name;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    setAnnouncement(`Download started for ${document.name}.`);
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
              Knowledge Base
            </span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Knowledge Base
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage hospital documents and information used by the AI receptionist.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90 sm:self-auto"
          onClick={() => setUploadOpen(true)}
          type="button"
        >
          <Plus aria-hidden="true" size={17} />
          Add Document
        </button>
      </header>

      {announcement && (
        <p
          aria-atomic="true"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-40 max-w-[calc(100vw-2.5rem)] rounded-md border border-border bg-white px-4 py-3 text-sm font-medium text-text shadow-lg"
          role="status"
        >
          {announcement}
        </p>
      )}

      <KnowledgeBaseStats documents={documents} />
      <KnowledgeBaseOverview
        activeDocuments={counts.active}
        lastUpdated={latestUpdated ? formatDate(latestUpdated) : "No documents"}
      />

      {uploadOpen && (
        <DocumentUpload
          selectedFiles={selectedFiles}
          category={uploadCategory}
          uploading={uploading}
          progress={uploadProgress}
          errorMessage={uploadError}
          onAddFiles={addSelectedFiles}
          onRemoveFile={(index) =>
            setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
          }
          onCategoryChange={setUploadCategory}
          onStartUpload={startUpload}
          onClose={() => setUploadOpen(false)}
        />
      )}

      <DocumentCategories
        documents={documents}
        selectedCategory={filters.category}
        onSelect={selectCategory}
      />

      <section aria-label="Knowledge document management" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-primary">Document library</h2>
          <p className="mt-1 text-sm text-muted">
            Search, organize and review sample hospital knowledge documents.
          </p>
        </div>
        <DocumentFilters
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
        />
        <DocumentTable
          documents={pageDocuments}
          currentPage={visiblePage}
          pageCount={pageCount}
          pageSize={pageSize}
          sortKey={sortKey}
          sortOrder={sortOrder}
          totalDocuments={filteredDocuments.length}
          onPageChange={setCurrentPage}
          onSort={changeSort}
          onView={setDocumentToPreview}
          onEdit={setDocumentToEdit}
          onDelete={setDocumentToDelete}
          onDownload={downloadDocument}
          onStatusChange={updateDocumentStatus}
          onReset={resetFilters}
        />
      </section>

      {documentToPreview && (
        <DocumentPreview
          document={documentToPreview}
          onClose={() => setDocumentToPreview(null)}
        />
      )}
      {documentToEdit && (
        <DocumentFormDialog
          document={documentToEdit}
          onClose={() => setDocumentToEdit(null)}
          onSave={saveDocument}
        />
      )}
      {documentToDelete && (
        <DeleteDocumentDialog
          document={documentToDelete}
          onClose={() => setDocumentToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function getTodayDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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
