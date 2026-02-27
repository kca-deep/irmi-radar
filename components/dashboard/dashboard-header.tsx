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
        <h1 className="text-lg font-bold tracking-tight text-foreground">
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
