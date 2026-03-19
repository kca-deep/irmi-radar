/**
 * 통합 점수 계산 프레임워크
 *
 * 세 가지 요인을 통합하여 일관된 카테고리/종합 점수를 산출:
 *   1. raw_score   : AI(LLM) 분석 기반 위험 점수 (analysis 테이블)
 *   2. volume_factor: 기사량 변화율 (최근 vs 이전 기간 비교)
 *   3. engagement_factor: 독자 참여도 (댓글 수, 좋아요/싫어요 비율)
 *
 * 가중치 기본값:
 *   raw=0.60, volume=0.25, engagement=0.15
 */

import { getDb } from "@/lib/db/index";
import type { CategoryKey } from "@/lib/types";

// ── 설정 ──

export interface ScoreWeights {
  raw: number;
  volume: number;
  engagement: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  raw: 0.60,
  volume: 0.25,
  engagement: 0.15,
};

// ── 요인 계산 ──

export interface CategoryFactors {
  category: CategoryKey;
  rawScore: number;         // 0-100: analysis 테이블 평균
  volumeFactor: number;     // 0-100: 기사량 이상치 → 점수 환산
  engagementFactor: number; // 0-100: 댓글 참여도 → 점수 환산
  combinedScore: number;    // 0-100: 가중 통합 점수
  articleCount: number;
}

/**
 * 기사량 변화율을 0-100 점수로 환산
 * - 변화 없음(0%) → 50
 * - 기사량 2배(+100%) → 80
 * - 기사량 절반(-50%) → 30
 */
function volumeToScore(changeRate: number): number {
  // changeRate: -1.0 ~ +inf (예: +0.5 = 50% 증가)
  // sigmoid 유사 변환으로 0-100 범위 매핑
  const scaled = 50 + changeRate * 30;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

/**
 * 댓글 참여도를 0-100 점수로 환산
 * - avgReplies가 baseline 이하 → 낮은 점수
 * - avgReplies가 baseline 대비 2배 → 높은 점수
 */
function engagementToScore(avgReplies: number, baselineReplies: number): number {
  if (baselineReplies <= 0) return 50; // 기준 없으면 중립
  const ratio = avgReplies / baselineReplies;
  const scaled = 50 + (ratio - 1) * 25;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

// ── 메인 함수 ──

/**
 * 카테고리별 통합 점수 계산
 * @param categories 대상 카테고리 목록 (미지정 시 전체)
 * @param windowDays 최근 기간 (기본 7일)
 * @param weights 요인별 가중치
 */
export function calculateCategoryScores(
  categories?: CategoryKey[],
  windowDays = 7,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  asOfDate?: string,
): CategoryFactors[] {
  const db = getDb(true);

  // 기준일: 지정된 날짜 또는 기사 데이터 최신일
  let baseDate: string;
  if (asOfDate) {
    baseDate = asOfDate;
  } else {
    const latestRow = db
      .prepare(
        `SELECT MAX(a.published_at) as latest
         FROM articles a INNER JOIN analysis an ON a.id = an.article_id`
      )
      .get() as { latest: string | null };
    baseDate = latestRow?.latest || new Date().toISOString();
  }

  // 1. rawScore: 카테고리별 최근 windowDays 평균 risk_score
  //    카테고리 불일치 기사(risk_score <= 15)는 평균 계산에서 제외
  const rawRows = db
    .prepare(
      `SELECT a.category,
              ROUND(AVG(an.risk_score), 1) as avg_score,
              COUNT(*) as article_count
       FROM articles a
       INNER JOIN analysis an ON a.id = an.article_id
       WHERE a.published_at >= date(?, '-' || ? || ' days')
         AND a.published_at <= date(?)
         AND an.risk_score > 15
       GROUP BY a.category`
    )
    .all(baseDate, windowDays, baseDate) as { category: string; avg_score: number; article_count: number }[];
  const rawMap = new Map(rawRows.map((r) => [r.category, r]));

  // 2. volumeFactor: 최근 windowDays vs 이전 windowDays 기사 수 변화율
  const volumeRows = db
    .prepare(
      `SELECT a.category,
              COUNT(CASE WHEN a.published_at >= date(?, '-' || ? || ' days')
                          AND a.published_at <= date(?) THEN 1 END) as recent_count,
              COUNT(CASE WHEN a.published_at >= date(?, '-' || (? * 2) || ' days')
                          AND a.published_at < date(?, '-' || ? || ' days') THEN 1 END) as prev_count
       FROM articles a
       WHERE a.published_at >= date(?, '-' || (? * 2) || ' days')
         AND a.published_at <= date(?)
       GROUP BY a.category`
    )
    .all(baseDate, windowDays, baseDate, baseDate, windowDays, baseDate, windowDays, baseDate, windowDays, baseDate) as {
    category: string; recent_count: number; prev_count: number;
  }[];
  const volumeMap = new Map(volumeRows.map((r) => [r.category, r]));

  // 3. engagementFactor: 카테고리별 평균 댓글 수 (최근 vs 전체 비교)
  const engageRows = db
    .prepare(
      `SELECT a.category,
              AVG(CASE WHEN a.published_at >= date(?, '-' || ? || ' days')
                       AND a.published_at <= date(?)
                  THEN a.reply_count END) as recent_avg_replies,
              AVG(CASE WHEN a.published_at <= date(?)
                  THEN a.reply_count END) as overall_avg_replies
       FROM articles a
       WHERE a.reply_count IS NOT NULL
         AND a.published_at <= date(?)
       GROUP BY a.category`
    )
    .all(baseDate, windowDays, baseDate, baseDate, baseDate) as {
    category: string; recent_avg_replies: number | null; overall_avg_replies: number | null;
  }[];
  const engageMap = new Map(engageRows.map((r) => [r.category, r]));

  // 4. 통합 점수 계산
  const targetCategories = categories ?? ["prices", "employment", "selfEmployed", "finance", "realEstate"] as CategoryKey[];

  return targetCategories.map((cat) => {
    const raw = rawMap.get(cat);
    const vol = volumeMap.get(cat);
    const eng = engageMap.get(cat);

    const rawScore = raw?.avg_score ?? 0;
    const articleCount = raw?.article_count ?? 0;

    // 기사량 변화율
    const prevCount = vol?.prev_count ?? 0;
    const recentCount = vol?.recent_count ?? 0;
    const changeRate = prevCount > 0 ? (recentCount - prevCount) / prevCount : 0;
    const vFactor = volumeToScore(changeRate);

    // 참여도
    const recentReplies = eng?.recent_avg_replies ?? 0;
    const overallReplies = eng?.overall_avg_replies ?? 0;
    const eFactor = engagementToScore(recentReplies, overallReplies);

    // 가중 통합
    const combined = Math.round(
      rawScore * weights.raw +
      vFactor * weights.volume +
      eFactor * weights.engagement
    );

    return {
      category: cat,
      rawScore,
      volumeFactor: vFactor,
      engagementFactor: eFactor,
      combinedScore: Math.max(0, Math.min(100, combined)),
      articleCount,
    };
  });
}

/**
 * 종합 점수 계산 (카테고리 통합 점수 기반)
 * 공식: 최고 35% + 상위2 평균 35% + 전체 평균 30%
 */
export function calculateOverallScore(categoryScores: number[]): number {
  if (categoryScores.length === 0) return 0;
  const sorted = [...categoryScores].sort((a, b) => b - a);
  const max = sorted[0];
  const top2Avg = sorted.length >= 2 ? (sorted[0] + sorted[1]) / 2 : sorted[0];
  const avg = categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;
  return Math.round(max * 0.35 + top2Avg * 0.35 + avg * 0.30);
}

/**
 * score_history 백필: 분석된 기사 날짜 범위를 기반으로
 * 각 날짜별 종합/카테고리 점수를 소급 계산하여 저장.
 * 종합지수 추이 차트 전용 - 다른 지표에는 영향 없음.
 */
export function backfillScoreHistory(runId?: string): number {
  const db = getDb();

  // 분석 완료된 기사의 날짜 범위 조회
  const range = db
    .prepare(
      `SELECT MIN(date(a.published_at)) as min_date, MAX(date(a.published_at)) as max_date
       FROM articles a INNER JOIN analysis an ON a.id = an.article_id`
    )
    .get() as { min_date: string | null; max_date: string | null };

  if (!range.min_date || !range.max_date) return 0;

  // 시작일: 첫 기사 + 7일 (윈도우 확보) ~ 최신일
  const allDates = db
    .prepare(
      `SELECT DISTINCT date(a.published_at) as d
       FROM articles a INNER JOIN analysis an ON a.id = an.article_id
       WHERE date(a.published_at) >= date(?, '+7 days')
       ORDER BY d ASC`
    )
    .all(range.min_date) as { d: string }[];

  if (allDates.length === 0) return 0;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO score_history
       (date, overall_score, prices, employment, self_employed, finance, real_estate, run_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let inserted = 0;
  const insertMany = db.transaction(() => {
    for (const { d } of allDates) {
      // 이미 있는 날짜는 건너뜀 (INSERT OR IGNORE)
      const factors = calculateCategoryScores(undefined, 7, DEFAULT_WEIGHTS, d);
      const catMap = new Map(factors.map((f) => [f.category, f.combinedScore]));
      const overall = calculateOverallScore(factors.map((f) => f.combinedScore));

      const result = insert.run(
        d,
        overall,
        catMap.get("prices") ?? 0,
        catMap.get("employment") ?? 0,
        catMap.get("selfEmployed") ?? 0,
        catMap.get("finance") ?? 0,
        catMap.get("realEstate") ?? 0,
        runId ?? null,
      );
      if (result.changes > 0) inserted++;
    }
  });

  insertMany();
  console.log(`[ScoreHistory] 백필 완료: ${inserted}/${allDates.length}일 추가`);
  return inserted;
}
