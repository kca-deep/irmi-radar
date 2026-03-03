import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardSpeed01Icon } from "@hugeicons/core-free-icons";
import { ReportDownloadButton } from "@/components/dashboard/report-download-button";

interface DashboardHeaderProps {
  lastUpdated: string;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${h}:${min} 기준`;
}

export function DashboardHeader({ lastUpdated }: DashboardHeaderProps) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <HugeiconsIcon
            icon={DashboardSpeed01Icon}
            size={20}
            strokeWidth={2}
            className="text-primary"
          />
          종합 민생 리스크 지수
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDateTime(lastUpdated)}
        </p>
      </div>
      <ReportDownloadButton />
    </div>
  );
}
