import type { NewsArticle, ChatMessage } from "@/lib/types";
import { findChatResponse } from "./mock-data";

// -- 분석 결과 타입 --
export interface AnalysisResult {
  summary: string;
  riskScore: number;
  categories: {
    category: string;
    score: number;
    issues: string[];
  }[];
  signals: {
    title: string;
    severity: "critical" | "warning" | "caution" | "safe";
    description: string;
  }[];
  recommendation: string;
}

// -- Claude API 클라이언트 --
// 해커톤 당일 실제 API 호출로 교체 예정

/**
 * 뉴스 기사 분석 (Mock)
 * TODO: 해커톤 당일 실제 Claude API 호출로 교체
 */
export async function analyzeNews(
  _articles: NewsArticle[],
  _prompt?: string
): Promise<AnalysisResult> {
  // Mock 응답 (실제 API 연결 전)
  await simulateDelay(500);

  return {
    summary:
      "분석된 뉴스 기사들을 종합한 결과, 자영업 부문과 물가 부문에서 위험 신호가 감지되었습니다.",
    riskScore: 67,
    categories: [
      {
        category: "자영업",
        score: 81,
        issues: ["배달앱 수수료 인상", "프랜차이즈 폐업률 상승"],
      },
      {
        category: "물가",
        score: 72,
        issues: ["농축산물 가격 급등", "공공요금 인상 예정"],
      },
    ],
    signals: [
      {
        title: "소상공인 부담 급증",
        severity: "critical",
        description: "배달앱 수수료 인상으로 인한 자영업자 부담이 증가하고 있습니다.",
      },
    ],
    recommendation:
      "자영업 부문에 대한 긴급 지원 정책 검토가 필요합니다.",
  };
}

/**
 * AI 채팅 응답 생성 (Mock)
 * TODO: 해커톤 당일 실제 Claude API 호출로 교체
 */
export async function generateChatResponse(
  message: string,
  _history?: ChatMessage[]
): Promise<{
  content: string;
  relatedSignals: string[];
}> {
  await simulateDelay(300);

  const response = findChatResponse(message);

  return {
    content: response.answer,
    relatedSignals: response.relatedSignals,
  };
}

/**
 * AI 브리핑 생성 (Mock)
 * TODO: 해커톤 당일 실제 Claude API 호출로 교체
 */
export async function generateBriefing(
  _period: string
): Promise<{
  summary: string;
  highlights: { category: string; message: string }[];
  recommendation: string;
}> {
  await simulateDelay(400);

  return {
    summary:
      "현재 자영업 부문의 위험도가 81점으로 5대 카테고리 중 가장 높습니다.",
    highlights: [
      { category: "자영업", message: "배달앱 수수료 인상으로 위험도 최고 수준" },
      { category: "물가", message: "설 명절 농축산물 가격 20% 급등" },
      { category: "금융", message: "신용카드 연체율 3개월 연속 상승" },
    ],
    recommendation:
      "자영업 부문과 물가 부문에 대한 선제적 대응이 시급합니다.",
  };
}

// -- 헬퍼 --
function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -- 실제 Claude API 호출 (해커톤 당일 활성화) --
/*
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaudeAPI(prompt: string, systemPrompt?: string) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text"
    ? response.content[0].text
    : "";
}
*/
