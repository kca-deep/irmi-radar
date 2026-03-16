/**
 * app/irumi/news/page.tsx — 뉴스 분석 (Server Component)
 *
 * GET /api/news 로 초기 뉴스 목록 로드
 * AI 분석 실행: POST /api/analyze (SSE 스트리밍)
 *   → onAnalyze 콜백을 NewsAnalysisPage에 전달하여 클라이언트에서 처리합니다.
 */

import { NewsAnalysisPage } from "@/components/irumi/pages/news-analysis-page";
import type { NewsAnalysisData } from "@/lib/irumi/types";

async function getNewsData(): Promise<NewsAnalysisData> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/news`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("뉴스 데이터를 불러올 수 없습니다.");
  return res.json();
}

/**
 * SSE 스트리밍 분석은 클라이언트에서 처리해야 합니다.
 * NewsAnalysisPage의 onAnalyze prop에서 아래 패턴을 사용하세요:
 *
 *   const response = await fetch('/api/analyze', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ category, keyword }),
 *   });
 *   const reader = response.body!.getReader();
 *   const decoder = new TextDecoder();
 *   while (true) {
 *     const { done, value } = await reader.read();
 *     if (done) break;
 *     const text = decoder.decode(value);
 *     // SSE 파싱 처리
 *   }
 */

export default async function NewsRoute() {
  const data = await getNewsData();

  return (
    <NewsAnalysisPage
      data={data}
      onAnalyze={undefined}  // 클라이언트 래퍼를 만들어 SSE 로직을 주입하세요
      onReset={undefined}
    />
  );
}
