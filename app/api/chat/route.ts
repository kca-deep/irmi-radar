import { successResponse, errorResponse } from "@/lib/api/response";
import { generateChatResponse } from "@/lib/api/anthropic";

import type { ChatMessage } from "@/lib/types";

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

interface ChatResponse {
  message: ChatMessage;
}

/**
 * POST /api/chat
 * AI 채팅 응답 생성
 *
 * Body:
 * - message: string (필수) - 사용자 질문
 * - history: ChatMessage[] (선택) - 대화 기록
 */
export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();

    const { message, history } = body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return errorResponse("Message is required", 400);
    }

    // AI 응답 생성 (현재 Mock)
    const response = await generateChatResponse(message.trim(), history);

    const chatMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content: response.content,
      timestamp: new Date().toISOString(),
      relatedSignals: response.relatedSignals,
    };

    const data: ChatResponse = {
      message: chatMessage,
    };

    return successResponse(data);
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }

    return errorResponse("Failed to generate chat response", 500);
  }
}
