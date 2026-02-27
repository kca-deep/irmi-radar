"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { SuggestedQuestions } from "./suggested-questions";
import { cn } from "@/lib/utils";

import type { ChatMessage, ChatData } from "@/lib/types";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chatData: ChatData;
}

// 기본 응답 (매칭 실패 시)
const DEFAULT_RESPONSE = `해당 질문에 대한 구체적인 분석을 준비 중입니다.

현재 종합 민생 리스크 지수는 67점으로 '주의' 단계입니다. 자영업(81점)과 물가(72점) 부문이 특히 높은 위험도를 보이고 있습니다.

더 구체적인 질문을 해주시면 맞춤형 분석을 제공해드릴 수 있습니다.`;

// 고유 ID 생성
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 키워드 매칭 함수
function findMatchingExample(query: string, chatData: ChatData) {
  const queryLower = query.toLowerCase();

  // 각 예시와 키워드 매칭 점수 계산
  for (const example of chatData.examples) {
    const questionLower = example.question.toLowerCase();

    // 질문에 포함된 주요 키워드 추출
    const keywords = ["카페", "서울", "물가", "자영업", "경기도", "제조업", "위험", "정책", "지원"];

    // 매칭 점수 계산
    let matchScore = 0;
    for (const keyword of keywords) {
      if (queryLower.includes(keyword) && questionLower.includes(keyword)) {
        matchScore += 1;
      }
    }

    // 직접적인 단어 매칭 확인
    const queryWords = queryLower.split(/\s+/);
    for (const word of queryWords) {
      if (word.length > 1 && questionLower.includes(word)) {
        matchScore += 0.5;
      }
    }

    if (matchScore >= 1) {
      return example;
    }
  }

  return null;
}

export function ChatPanel({ isOpen, onClose, chatData }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 클린업
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // 타이핑 효과로 메시지 출력
  const typeMessage = useCallback((
    fullContent: string,
    relatedSignals: string[] | undefined,
    onComplete: () => void
  ) => {
    const messageId = generateId();
    let currentIndex = 0;

    // 빈 assistant 메시지 추가
    const newMessage: ChatMessage = {
      id: messageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      relatedSignals,
    };

    setMessages((prev) => [...prev, newMessage]);
    setTypingMessageId(messageId);

    // 타이핑 효과
    typingIntervalRef.current = setInterval(() => {
      currentIndex += 1;
      const partialContent = fullContent.slice(0, currentIndex);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content: partialContent } : msg
        )
      );

      if (currentIndex >= fullContent.length) {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
        setTypingMessageId(null);
        onComplete();
      }
    }, 20); // 20ms 간격
  }, []);

  // 메시지 전송 처리
  const handleSend = useCallback((content: string) => {
    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Mock 응답 생성 (약간의 딜레이 후)
    setTimeout(() => {
      const matchedExample = findMatchingExample(content, chatData);

      const responseContent = matchedExample?.answer || DEFAULT_RESPONSE;
      const relatedSignals = matchedExample?.relatedSignals;

      typeMessage(responseContent, relatedSignals, () => {
        setIsLoading(false);
      });
    }, 500);
  }, [chatData, typeMessage]);

  // 추천 질문 선택
  const handleSuggestedQuestion = useCallback((question: string) => {
    handleSend(question);
  }, [handleSend]);

  // 메시지가 없을 때만 추천 질문 표시
  const showSuggestions = messages.length === 0;

  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 z-50 flex flex-col",
        "w-[360px] h-[500px] max-h-[70vh]",
        "rounded-xl border border-border/50 bg-card shadow-xl",
        "transition-all duration-300 ease-out",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      {/* 헤더 */}
      <ChatHeader onClose={onClose} />

      {/* 메시지 영역 또는 추천 질문 */}
      {showSuggestions ? (
        <div className="flex-1 flex flex-col justify-center">
          <SuggestedQuestions
            questions={chatData.suggestedQuestions}
            onSelect={handleSuggestedQuestion}
          />
        </div>
      ) : (
        <ChatMessages messages={messages} typingMessageId={typingMessageId ?? undefined} />
      )}

      {/* 입력 영역 */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
