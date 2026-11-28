"use client";

import { useState } from "react";
import { AIReceptionistAnalytics } from "@/components/admin/reports/AIReceptionistAnalytics";
import { AppointmentAnalyticsChart } from "@/components/admin/reports/AppointmentAnalyticsChart";
import { DepartmentAnalyticsChart } from "@/components/admin/reports/DepartmentAnalyticsChart";
import { DoctorPerformanceTable } from "@/components/admin/reports/DoctorPerformanceTable";
import { PatientAnalytics } from "@/components/admin/reports/PatientAnalytics";
import { ReportExportDialog } from "@/components/admin/reports/ReportExportDialog";
import { ReportHeader } from "@/components/admin/reports/ReportHeader";
import { ReportStats } from "@/components/admin/reports/ReportStats";
import type { ReportDateRange } from "@/types/reports";

export function ReportsManagement() {
  const [dateRange, setDateRange] = useState<ReportDateRange>("30d");
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="space-y-6">
      <ReportHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => setExportOpen(true)}
      />
      <ReportStats />
      <AppointmentAnalyticsChart dateRange={dateRange} />
      <div className="grid gap-6 xl:grid-cols-2">
        <PatientAnalytics dateRange={dateRange} />
        <DepartmentAnalyticsChart dateRange={dateRange} />
      </div>
      <DoctorPerformanceTable />
      <AIReceptionistAnalytics dateRange={dateRange} />
      {exportOpen && (
        <ReportExportDialog
          initialRange={dateRange}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
