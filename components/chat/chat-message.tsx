"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, UserCircleIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* 아바타 */}
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-secondary"
        )}
      >
        <HugeiconsIcon
          icon={isUser ? UserCircleIcon : AiBrain01Icon}
          size={14}
          strokeWidth={2}
          className={isUser ? "text-primary-foreground" : "text-secondary-foreground"}
        />
      </div>

      {/* 메시지 버블 */}
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        <p className="text-xs leading-relaxed whitespace-pre-wrap">
          {message.content}
          {isTyping && (
            <span className="inline-block w-1.5 h-3 ml-0.5 bg-current animate-pulse" />
          )}
        </p>

        {/* 관련 신호 (assistant만) */}
        {!isUser && message.relatedSignals && message.relatedSignals.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground">
              관련 신호: {message.relatedSignals.length}건
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
