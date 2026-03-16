import { NewsPage } from "@/components/news/news-page";
import { loadNews, loadNewsCount, loadAnalysisSeverityStats } from "@/lib/api/data-source";
import { NEWS_PAGE_SIZE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function NewsRoute() {
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
  const severityStats = loadAnalysisSeverityStats();

  return (
    <NewsPage
      initialArticles={articles}
      totalCount={totalCount}
      pageSize={NEWS_PAGE_SIZE}
      initialAnalyzedOnly={hasAnalyzed}
      severityStats={severityStats}
    />
  );
}
