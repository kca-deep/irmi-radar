/**
 * app/irumi/news/page.tsx -- 뉴스 분석 (Server Component)
 *
 * 기존 데이터 소스(loadNews, loadNewsCount)에서 데이터를 가져와
 * irumi NewsAnalysisData 형태로 변환하여 전달합니다.
 */

import { NewsAnalysisPage } from "@/components/irumi/pages/news-analysis-page";
import { loadNews, loadNewsCount } from "@/lib/api/data-source";
import { NEWS_PAGE_SIZE } from "@/lib/constants";
import { transformNews } from "@/lib/irumi/transform";
import type { NewsAnalysisData } from "@/lib/irumi/types";

export const dynamic = "force-dynamic";

const FALLBACK_DATA: NewsAnalysisData = {
  stats: { total: 0, urgent: 0, caution: 0, watch: 0, remaining: 0 },
  articles: [],
};

export default function NewsRoute() {
  let data: NewsAnalysisData;

  try {
    // 분석 완료 기사가 있으면 분석 완료만, 없으면 전체
    const analyzedCount = loadNewsCount({ analyzedOnly: true });
    const hasAnalyzed = analyzedCount > 0;

    const articles = loadNews({
      limit: NEWS_PAGE_SIZE,
      offset: 0,
      analyzedOnly: hasAnalyzed || undefined,
      sort: hasAnalyzed ? "riskScore" : undefined,
    });
    const totalCount = hasAnalyzed ? analyzedCount : loadNewsCount();

    data = transformNews(articles, totalCount);
  } catch {
    data = FALLBACK_DATA;
  }

  // 전체 기사 수 (분석 대상 카운트용)
  let totalDbArticleCount = 0;
  try {
    totalDbArticleCount = loadNewsCount();
  } catch { /* skip */ }

  return (
    <NewsAnalysisPage
      data={data}
      totalDbArticleCount={totalDbArticleCount}
    />
  );
}
