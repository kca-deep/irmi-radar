"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Share01Icon } from "@hugeicons/core-free-icons";

interface ChainMapHeaderProps {
  activeChainCount: number;
}

export function ChainMapHeader({ activeChainCount }: ChainMapHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={Share01Icon}
          size={18}
          strokeWidth={2}
          className="text-primary"
        />
        <h3 className="text-sm font-semibold text-foreground">
          위기 전파 구조
        </h3>
      </div>
      {activeChainCount > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/10 text-danger font-medium">
          {activeChainCount}개 연쇄 반응 감지
        </span>
      )}
    </div>
  );
}
