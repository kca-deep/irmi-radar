import { ReportDownloadButton } from "@/components/dashboard/report-download-button";

export function DashboardHeader() {
  return (
    <div className="flex items-end justify-between">
      <h1 className="text-lg font-bold tracking-tight text-foreground">
        Dashboard
      </h1>
      <ReportDownloadButton />
    </div>
  );
}
