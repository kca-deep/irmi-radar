"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "./chat-panel";
import { cn } from "@/lib/utils";

import type { ChatData } from "@/lib/types";

interface ChatFabProps {
  chatData: ChatData;
}

export function ChatFab({ chatData }: ChatFabProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => setIsOpen((prev) => !prev);
  const closeChat = () => setIsOpen(false);

  return (
    <>
      {/* 플로팅 버튼 */}
      <Button
        onClick={toggleChat}
        className={cn(
          "fixed bottom-4 right-4 z-50",
          "size-12 rounded-full shadow-lg",
          "transition-all duration-300 ease-out",
          isOpen && "rotate-90"
        )}
      >
        <HugeiconsIcon
          icon={isOpen ? Cancel01Icon : AiBrain01Icon}
          size={20}
          strokeWidth={2}
        />
        <span className="sr-only">
          {isOpen ? "채팅 닫기" : "이르미에게 물어보기"}
        </span>
      </Button>

      {/* 채팅 패널 */}
      <ChatPanel isOpen={isOpen} onClose={closeChat} chatData={chatData} />
    </>
  );
}
