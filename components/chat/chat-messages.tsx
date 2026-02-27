"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./chat-message";

import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  typingMessageId?: string;
}

export function ChatMessages({ messages, typingMessageId }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          isTyping={message.id === typingMessageId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
