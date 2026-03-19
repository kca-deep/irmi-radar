/**
 * 카테고리별 리스크 집계 모듈
 * analysis 테이블 데이터를 기반으로 카테고리별 점수/트렌드 산출
 */

import { getDb } from "@/lib/db/index";
import { CATEGORIES } from "@/lib/constants";
import type { CategoryKey, Trend } from "@/lib/types";

export interface CategoryRiskResult {
  category: CategoryKey;
  label: string;
  score: number;
  trend: Trend;
  articleCount: number;
  criticalCount: number;
  warningCount: number;
  keyIssues: string[];
  /** 고위험 기사(critical/warning)의 AI 요약 상위 3건 */
  topSummaries: string[];
}

/**
 * 카테고리별 리스크 점수 집계
 * - 평균 risk_score 산출
 * - severity 분포 (critical/warning 건수)
 * - 최근 7일 vs 이전 7일 비교 → 트렌드
 * - 상위 key_factors 추출
 */
export function aggregateCategories(categories?: CategoryKey[]): CategoryRiskResult[] {
  const db = getDb(true);

  // 카테고리별 기본 통계 (카테고리 불일치 기사 제외)
  const stats = db
    .prepare(
      `SELECT
        a.category,
        ROUND(AVG(an.risk_score), 1) as avg_score,
        COUNT(*) as article_count,
        COUNT(CASE WHEN an.severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN an.severity = 'warning' THEN 1 END) as warning_count
      FROM articles a
      INNER JOIN analysis an ON a.id = an.article_id
      WHERE an.risk_score > 15
      GROUP BY a.category`
    )
    .all() as {
    category: string;
    avg_score: number;
    article_count: number;
    critical_count: number;
    warning_count: number;
  }[];

  const statsMap = new Map(stats.map((s) => [s.category, s]));

  // 기사 데이터의 최신 날짜 기준 (DB 데이터가 과거일 수 있음)
  const latestRow = db
    .prepare(
      `SELECT MAX(a.published_at) as latest
       FROM articles a INNER JOIN analysis an ON a.id = an.article_id`
    )
    .get() as { latest: string | null };
  const baseDate = latestRow?.latest || new Date().toISOString();

  // 트렌드 계산: 최근 7일 평균 vs 이전 7일 평균 (카테고리 불일치 기사 제외)
  const trends = db
    .prepare(
      `SELECT
        a.category,
        ROUND(AVG(CASE WHEN a.published_at >= date(?, '-7 days') THEN an.risk_score END), 1) as recent_avg,
        ROUND(AVG(CASE WHEN a.published_at >= date(?, '-14 days') AND a.published_at < date(?, '-7 days') THEN an.risk_score END), 1) as prev_avg
      FROM articles a
      INNER JOIN analysis an ON a.id = an.article_id
      WHERE a.published_at >= date(?, '-14 days')
        AND an.risk_score > 15
      GROUP BY a.category`
    )
    .all(baseDate, baseDate, baseDate, baseDate) as {
    category: string;
    recent_avg: number | null;
    prev_avg: number | null;
  }[];

  const trendMap = new Map(trends.map((t) => [t.category, t]));

  // 카테고리별 상위 key_factors 추출
  const factorRows = db
    .prepare(
      `SELECT a.category, an.key_factors
      FROM articles a
      INNER JOIN analysis an ON a.id = an.article_id
      WHERE an.key_factors IS NOT NULL AND an.key_factors != '[]'
      ORDER BY an.risk_score DESC`
    )
    .all() as { category: string; key_factors: string }[];

  const factorsMap = new Map<string, Map<string, number>>();
  for (const row of factorRows) {
    try {
      const factors = JSON.parse(row.key_factors) as string[];
      if (!factorsMap.has(row.category)) {
        factorsMap.set(row.category, new Map());
      }
      const catFactors = factorsMap.get(row.category)!;
      for (const f of factors) {
        catFactors.set(f, (catFactors.get(f) || 0) + 1);
      }
    } catch {
      /* skip */
    }
  }

  // 카테고리별 고위험 기사 AI 요약 (critical/warning 상위 3건)
  const summaryRows = db
    .prepare(
      `SELECT a.category, an.ai_summary, an.risk_score
      FROM articles a
      INNER JOIN analysis an ON a.id = an.article_id
      WHERE an.severity IN ('critical', 'warning')
        AND an.ai_summary IS NOT NULL AND an.ai_summary != ''
      ORDER BY an.risk_score DESC`
    )
    .all() as { category: string; ai_summary: string; risk_score: number }[];

  const summariesMap = new Map<string, string[]>();
  for (const row of summaryRows) {
    if (!summariesMap.has(row.category)) {
      summariesMap.set(row.category, []);
    }
    const arr = summariesMap.get(row.category)!;
    if (arr.length < 3) {
      arr.push(row.ai_summary);
    }
  }

  // 결과 조합 (선택된 카테고리만)
  const targetCategories = categories?.length
    ? CATEGORIES.filter((c) => categories.includes(c.key))
    : CATEGORIES;

  return targetCategories.map((cat) => {
    const stat = statsMap.get(cat.key);
    const trend = trendMap.get(cat.key);

    // 트렌드 결정
    let trendValue: Trend = "stable";
    if (trend?.recent_avg != null && trend?.prev_avg != null) {
      const diff = trend.recent_avg - trend.prev_avg;
      if (diff > 3) trendValue = "rising";
      else if (diff < -3) trendValue = "falling";
    }

    // 상위 이슈 (빈도 순 상위 3개, 수치 위주로 축약)
    const catFactors = factorsMap.get(cat.key);
    const keyIssues: string[] = [];
    if (catFactors) {
      const sorted = [...catFactors.entries()].sort((a, b) => b[1] - a[1]);
      for (const [f] of sorted.slice(0, 3)) {
        // 50자 이내로 축약, 수치가 포함된 부분 우선
        const trimmed = f.length > 50 ? f.slice(0, 50) + "..." : f;
        keyIssues.push(trimmed);
      }
    }

    return {
      category: cat.key,
      label: cat.label,
      score: stat?.avg_score ?? 0,
      trend: trendValue,
      articleCount: stat?.article_count ?? 0,
      criticalCount: stat?.critical_count ?? 0,
      warningCount: stat?.warning_count ?? 0,
      keyIssues,
      topSummaries: summariesMap.get(cat.key) || [],
    };
  });
}
