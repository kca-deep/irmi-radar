"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onClose: () => void;
}

export function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border/50">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <HugeiconsIcon
            icon={AiBrain01Icon}
            size={16}
            strokeWidth={2}
            className="text-primary-foreground"
          />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            이르미에게 물어보기
          </h2>
          <p className="text-[10px] text-muted-foreground">
            민생 위기 AI 어시스턴트
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="size-8"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
        <span className="sr-only">닫기</span>
      </Button>
    </div>
  );
}
