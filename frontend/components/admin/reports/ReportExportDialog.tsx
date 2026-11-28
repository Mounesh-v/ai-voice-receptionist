"use client";

import { useMemo, useState } from "react";
import { Download, FileText, X } from "lucide-react";
import {
  doctorPerformance,
  reportAnalytics,
  reportDateRanges,
} from "@/data/reports";
import type {
  ReportDateRange,
  ReportFormat,
  ReportType,
} from "@/types/reports";

const reportOptions: { value: ReportType; label: string }[] = [
  { value: "appointments", label: "Appointment Report" },
  { value: "patients", label: "Patient Report" },
  { value: "doctors", label: "Doctor Performance Report" },
  { value: "departments", label: "Department Report" },
  { value: "ai", label: "AI Receptionist Report" },
];

type ExportDataset = {
  headers: (string | number)[];
  rows: (string | number)[][];
};

export function ReportExportDialog({
  initialRange,
  onClose,
}: {
  initialRange: ReportDateRange;
  onClose: () => void;
}) {
  const [reportType, setReportType] = useState<ReportType>("appointments");
  const [dateRange, setDateRange] = useState(initialRange);
  const [format, setFormat] = useState<ReportFormat>("csv");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const rangeLabel =
    reportDateRanges.find((range) => range.value === dateRange)?.label ?? "";
  const dataset = useMemo(
    () => getExportDataset(reportType, dateRange, rangeLabel),
    [dateRange, rangeLabel, reportType],
  );
  const preview = useMemo(
    () =>
      [dataset.headers, ...dataset.rows.slice(0, 2)]
        .map((row) => row.map(escapeCsvCell).join(","))
        .join("\n"),
    [dataset],
  );
  const selectedReport =
    reportOptions.find((option) => option.value === reportType)?.label ?? "Report";

  const exportCsv = () => {
    setStatusMessage("");
    setErrorMessage("");
    if (format !== "csv") return;

    const csv = [
      dataset.headers.map(escapeCsvCell).join(","),
      ...dataset.rows.map((row) => row.map(escapeCsvCell).join(",")),
    ].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    let objectUrl: string | null = null;

    try {
      objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = `${reportType}-report-${dateRange}.csv`;
      document.body.appendChild(link);
      link.click();
      setStatusMessage(
        `${selectedReport} CSV generated and the browser download was requested.`,
      );
      window.setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (error) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setErrorMessage(
        error instanceof Error
          ? `The CSV could not be generated: ${error.message}`
          : "The CSV could not be generated.",
      );
    } finally {
      link.remove();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button
        aria-label="Close report export dialog"
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="report-export-title"
        aria-modal="true"
        className="relative z-10 my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="flex size-10 items-center justify-center rounded-md bg-teal-50 text-secondary">
              <FileText aria-hidden="true" size={19} />
            </span>
            <h2
              className="mt-3 text-lg font-semibold text-primary"
              id="report-export-title"
            >
              Export report
            </h2>
            <p className="mt-1 text-xs text-muted">
              Choose a report and period. CSV files are generated from local demo data.
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text">
            Report type
            <select
              aria-label="Report type"
              className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-secondary"
              onChange={(event) =>
                setReportType(event.target.value as ReportType)
              }
              value={reportType}
            >
              {reportOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text">
            Date range
            <select
              aria-label="Export date range"
              className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-secondary"
              onChange={(event) =>
                setDateRange(event.target.value as ReportDateRange)
              }
              value={dateRange}
            >
              {reportDateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text sm:col-span-2">
            Report format
            <select
              aria-label="Report format"
              className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-secondary"
              onChange={(event) =>
                setFormat(event.target.value as ReportFormat)
              }
              value={format}
            >
              <option value="csv">CSV spreadsheet</option>
              <option value="pdf">PDF document</option>
            </select>
          </label>
        </div>

        {format === "csv" ? (
          <div className="mt-4 rounded-md border border-border bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-primary">CSV preview</p>
              <p className="text-[11px] text-muted">
                {dataset.rows.length} data rows
              </p>
            </div>
            <pre className="mt-2 max-h-24 overflow-auto whitespace-pre text-[10px] leading-5 text-muted">
              {preview}
            </pre>
          </div>
        ) : (
          <div
            className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3"
            role="status"
          >
            <p className="text-xs font-semibold text-amber-900">
              PDF export is a placeholder
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              PDF generation is not configured in this frontend-only project. Select CSV to download a report.
            </p>
          </div>
        )}

        {(statusMessage || errorMessage) && (
          <p
            aria-live={errorMessage ? "assertive" : "polite"}
            className={`mt-4 rounded-md px-3 py-2.5 text-xs ${
              errorMessage
                ? "border border-rose-200 bg-rose-50 text-rose-800"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
            role={errorMessage ? "alert" : "status"}
          >
            {errorMessage || statusMessage}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <button
            className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={format === "pdf"}
            onClick={exportCsv}
            type="button"
          >
            <Download aria-hidden="true" size={15} />
            {format === "csv" ? "Download CSV" : "PDF unavailable"}
          </button>
        </div>
      </section>
    </div>
  );
}

function getExportDataset(
  reportType: ReportType,
  dateRange: ReportDateRange,
  rangeLabel: string,
): ExportDataset {
  const period = reportAnalytics[dateRange];

  switch (reportType) {
    case "appointments":
      return {
        headers: ["Period", "Total appointments", "Completed", "Pending", "Cancelled"],
        rows: period.appointments.map((item) => [
          item.label,
          item.total,
          item.completed,
          item.pending,
          item.cancelled,
        ]),
      };
    case "patients":
      return {
        headers: ["Period", "New patients", "Existing patients"],
        rows: period.patientTrends.map((item) => [
          item.label,
          item.newPatients,
          item.existingPatients,
        ]),
      };
    case "doctors":
      return {
        headers: [
          "Report period",
          "Doctor ID",
          "Doctor name",
          "Department",
          "Appointments",
          "Completed",
          "Cancelled",
          "Completion rate",
        ],
        rows: doctorPerformance.map((doctor) => [
          rangeLabel,
          doctor.id,
          doctor.name,
          doctor.department,
          doctor.totalAppointments,
          doctor.completed,
          doctor.cancelled,
          `${doctor.completionRate}%`,
        ]),
      };
    case "departments":
      return {
        headers: ["Report period", "Department", "Appointments", "Share"],
        rows: period.departments.map((item) => [
          rangeLabel,
          item.department,
          item.appointments,
          `${item.percentage}%`,
        ]),
      };
    case "ai":
      return {
        headers: ["Period", "Calls", "Successful", "Missed", "Appointments booked"],
        rows: period.aiCalls.map((item) => [
          item.label,
          item.calls,
          item.successful,
          item.missed,
          item.bookings,
        ]),
      };
  }
}

function escapeCsvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}
