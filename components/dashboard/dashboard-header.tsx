import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardSquare01Icon } from "@hugeicons/core-free-icons";
import { ReportDownloadButton } from "@/components/dashboard/report-download-button";

export function DashboardHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <HugeiconsIcon
            icon={DashboardSquare01Icon}
            size={20}
            strokeWidth={2}
            className="text-brand"
          />
          대시보드
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          민생 위기 종합 현황을 한눈에 파악하세요.
        </p>
      </div>
      <ReportDownloadButton />
    </div>
  );
}
