import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardSpeed01Icon } from "@hugeicons/core-free-icons";
import { ReportDownloadButton } from "@/components/dashboard/report-download-button";

export function DashboardHeader() {
  return (
    <div className="flex items-end justify-between">
      <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
        <HugeiconsIcon
          icon={DashboardSpeed01Icon}
          size={20}
          strokeWidth={2}
          className="text-brand"
        />
        대시보드
      </h1>
      <ReportDownloadButton />
    </div>
  );
}
