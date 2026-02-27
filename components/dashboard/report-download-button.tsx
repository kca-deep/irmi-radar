"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileDownloadIcon } from "@hugeicons/core-free-icons";

export function ReportDownloadButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="gap-1.5"
    >
      <HugeiconsIcon icon={FileDownloadIcon} size={14} strokeWidth={2} />
      <span>리포트 다운로드</span>
    </Button>
  );
}
