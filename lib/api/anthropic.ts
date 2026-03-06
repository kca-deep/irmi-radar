/**
 * AI 분석 함수 모음
 * 내부적으로 ai-client.ts의 callLLM을 사용하여 프로바이더 분기
 *
 * API 키 미설정 시 Mock 데이터 폴백
 */

import type { NewsArticle, ChatMessage } from "@/lib/types";
import { callLLM, getProvider } from "./ai-client";
import { findChatResponse } from "./data-source";

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

// -- API 키 존재 여부 확인 --
function hasApiKey(): boolean {
  const provider = getProvider();
  if (provider === "openai") {
    return !!process.env.OPENAI_API_KEY;
  }
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * 뉴스 기사 분석
 * API 키 설정 시 실제 LLM 호출, 미설정 시 Mock 반환
 */
export async function analyzeNews(
  articles: NewsArticle[],
  prompt?: string
): Promise<AnalysisResult> {
  if (!hasApiKey()) {
    return analyzeNewsMock();
  }

  const articlesSummary = articles
    .slice(0, 20)
    .map((a, i) => `[${i + 1}] ${a.title}\n${a.summary || ""}`)
    .join("\n\n");

  const system = `당신은 민생 위기 분석 전문가입니다. 뉴스 기사를 분석하여 민생 위기 신호를 감지합니다.
5대 카테고리: 물가, 고용, 자영업, 금융, 부동산
4단계 위기 등급: critical(긴급), warning(주의), caution(관찰), safe(안전)

반드시 아래 JSON 형식으로만 응답하세요:
{
  "summary": "종합 분석 요약 (1~2문장)",
  "riskScore": 0~100,
  "categories": [{ "category": "카테고리명", "score": 0~100, "issues": ["주요 이슈"] }],
  "signals": [{ "title": "신호 제목", "severity": "등급", "description": "설명" }],
  "recommendation": "대응 권고 (1~2문장)"
}`;

  const user = prompt
    ? `${prompt}\n\n--- 분석 대상 기사 ---\n${articlesSummary}`
    : `다음 뉴스 기사들을 분석하여 민생 위기 신호를 감지하세요.\n\n${articlesSummary}`;

  const raw = await callLLM({ system, user, maxTokens: 2048 });

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]) as AnalysisResult;
  } catch {
    return analyzeNewsMock();
  }
}

/**
 * AI 채팅 응답 생성
 * API 키 설정 시 실제 LLM 호출, 미설정 시 Mock 반환
 */
export async function generateChatResponse(
  message: string,
  history?: ChatMessage[]
): Promise<{
  content: string;
  relatedSignals: string[];
}> {
  if (!hasApiKey()) {
    const response = findChatResponse(message);
    return { content: response.answer, relatedSignals: response.relatedSignals };
  }

  const system = `당신은 이르미(IRMI) 민생위기 조기경보 시스템의 AI 어시스턴트입니다.
사용자의 질문에 민생 위기 관련 분석과 정보를 제공합니다.
5대 카테고리: 물가, 고용, 자영업, 금융, 부동산

반드시 아래 JSON 형식으로만 응답하세요:
{ "content": "응답 내용", "relatedSignals": ["관련 신호 ID"] }`;

  const historyText = history
    ?.slice(-5)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n") || "";

  const user = historyText
    ? `대화 기록:\n${historyText}\n\n사용자: ${message}`
    : message;

  const raw = await callLLM({ system, user, maxTokens: 1024 });

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { content: raw || "응답을 생성할 수 없습니다.", relatedSignals: [] };
  }
}

/**
 * AI 브리핑 생성
 * API 키 설정 시 실제 LLM 호출, 미설정 시 Mock 반환
 */
export async function generateBriefing(
  period: string
): Promise<{
  summary: string;
  highlights: { category: string; message: string }[];
  recommendation: string;
}> {
  if (!hasApiKey()) {
    return generateBriefingMock();
  }

  const system = `당신은 민생 위기 브리핑 전문가입니다. 주어진 기간의 민생 동향을 요약합니다.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "summary": "종합 요약 (1~2문장)",
  "highlights": [{ "category": "카테고리명", "message": "핵심 메시지" }],
  "recommendation": "대응 권고 (1~2문장)"
}`;

  const user = `${period} 기간의 민생 위기 동향 브리핑을 생성하세요.`;

  const raw = await callLLM({ system, user, maxTokens: 1024 });

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return generateBriefingMock();
  }
}

// -- Mock 폴백 --

function analyzeNewsMock(): AnalysisResult {
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
        description:
          "배달앱 수수료 인상으로 인한 자영업자 부담이 증가하고 있습니다.",
      },
    ],
    recommendation:
      "자영업 부문에 대한 긴급 지원 정책 검토가 필요합니다.",
  };
}

function generateBriefingMock() {
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
