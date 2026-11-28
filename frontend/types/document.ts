export type DocumentCategory =
  | "Hospital Information"
  | "Doctor Information"
  | "Departments"
  | "Appointment Policies"
  | "Medical Services"
  | "FAQs"
  | "Emergency Information"
  | "General Documents";

export type DocumentStatus = "Active" | "Processing" | "Failed" | "Draft";

export type KnowledgeDocument = {
  id: string;
  name: string;
  fileType: "PDF";
  sizeBytes: number;
  category: DocumentCategory;
  uploadDate: string;
  lastUpdated: string;
  status: DocumentStatus;
  uploadedBy: string;
  description: string;
  objectUrl: string | null;
};

export type DocumentFiltersState = {
  search: string;
  category: "All" | DocumentCategory;
  status: "All" | DocumentStatus;
};

export type DocumentSortKey = "uploadDate" | "lastUpdated";
export type SortOrder = "asc" | "desc";

export type DocumentFormValues = {
  name: string;
  category: DocumentCategory;
  description: string;
};
