/**
 * score_history 사전 데이터 생성 스크립트 (12/1~30)
 *
 * 기사 제목/요약의 키워드 분석을 통해 날짜별 카테고리 점수를 산출하고
 * score_history 테이블에 직접 INSERT 합니다.
 *
 * - 부정 키워드 비율 기반 점수 산출
 * - 기사량 변동 가산
 * - 기존 종합점수 공식(max*0.35 + top2*0.35 + avg*0.30) 적용
 * - 12/31은 제외 (라이브 분석 대상)
 *
 * 실행: npx tsx scripts/seed-score-history.ts
 */

import Database from "better-sqlite3";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data/irmi.db");

// ── 카테고리 설정 ──

type CategoryKey = "prices" | "employment" | "selfEmployed" | "finance" | "realEstate";

const CATEGORIES: CategoryKey[] = [
  "prices", "employment", "selfEmployed", "finance", "realEstate",
];

// ── 키워드 사전 ──

/** 부정 키워드: 민생 위기/부담 증가 시그널 */
const NEGATIVE_KEYWORDS: Record<CategoryKey, string[]> = {
  prices: [
    "인상", "급등", "폭등", "치솟", "비싸", "부담", "고물가",
    "인플레", "최고가", "사상최고", "역대최고", "오름세", "상승세",
    "식비 부담", "생활고", "장바구니 물가",
  ],
  employment: [
    "해고", "구조조정", "감원", "정리해고", "실업", "폐업",
    "실직", "퇴직", "비정규", "일자리 감소", "채용 축소",
    "고용 한파", "취업난", "실업률 상승", "고용 절벽",
  ],
  selfEmployed: [
    "폐업", "폐점", "영업중단", "매출 감소", "임대료 인상",
    "배달비 인상", "수수료 인상", "골목상권 위기", "자영업 위기",
    "소상공인 부담", "적자", "부도", "폐업률",
  ],
  finance: [
    "금리 인상", "연체", "부채 증가", "가계부채", "파산",
    "채무불이행", "이자 부담", "대출 규제", "신용불량",
    "다중채무", "빚", "연체율", "부실", "하락",
  ],
  realEstate: [
    "급등", "폭등", "전세 사기", "전세난", "월세 상승",
    "주거비 부담", "집값 상승", "매매가 상승", "전세가 상승",
    "청약 경쟁", "전세난민", "깡통전세", "역전세",
  ],
};

/** 긍정 키워드: 민생 안정/개선 시그널 */
const POSITIVE_KEYWORDS: Record<CategoryKey, string[]> = {
  prices: [
    "인하", "내림", "동결", "안정", "하락", "할인",
    "지원금", "바우처", "보조금",
  ],
  employment: [
    "채용 확대", "일자리 창출", "고용률 상승", "취업률",
    "신규 채용", "일자리 증가", "고용 안정",
  ],
  selfEmployed: [
    "매출 증가", "지원 확대", "임대료 인하", "수수료 인하",
    "소상공인 지원", "자영업 지원", "창업 지원",
  ],
  finance: [
    "금리 인하", "대출 지원", "서민 금융", "채무 조정",
    "이자 인하", "연체율 하락", "부채 감소",
  ],
  realEstate: [
    "집값 안정", "전세 안정", "공급 확대", "분양가 인하",
    "주거 지원", "월세 지원", "임대주택",
  ],
};

// ── 점수 산출 함수 ──

interface DayArticles {
  category: CategoryKey;
  titles: string[];
  summaries: string[];
}

/**
 * 카테고리별 일별 점수 산출
 * - 부정 키워드 매칭 비율 → 기본 점수
 * - 긍정 키워드 매칭 → 감점
 * - 기사량 대비 보정
 */
function calculateCategoryScore(
  articles: DayArticles,
  avgArticleCount: number,
): number {
  const { titles, summaries } = articles;
  const cat = articles.category;
  if (titles.length === 0) return 20; // 기사 없으면 기본 안전

  const negKeywords = NEGATIVE_KEYWORDS[cat];
  const posKeywords = POSITIVE_KEYWORDS[cat];

  let negHits = 0;
  let posHits = 0;

  for (let i = 0; i < titles.length; i++) {
    const text = `${titles[i]} ${summaries[i] || ""}`;
    for (const kw of negKeywords) {
      if (text.includes(kw)) { negHits++; break; } // 기사당 1회만
    }
    for (const kw of posKeywords) {
      if (text.includes(kw)) { posHits++; break; }
    }
  }

  const total = titles.length;
  const negRatio = negHits / total;  // 0~1
  const posRatio = posHits / total;  // 0~1
  const netRatio = negRatio - posRatio * 0.5; // 긍정은 절반 가중

  // 기본 점수: netRatio 기반 (0~100 매핑)
  // netRatio 0 → 25, 0.3 → 45, 0.5 → 60, 0.7 → 75, 1.0 → 85
  let score = 25 + netRatio * 60;

  // 기사량 보정: 평균 대비 1.5배 이상이면 가산 (관심 급증)
  const volumeRatio = total / Math.max(avgArticleCount, 1);
  if (volumeRatio > 1.5) {
    score += (volumeRatio - 1.5) * 8;
  } else if (volumeRatio < 0.5) {
    score -= 3; // 기사량 매우 적으면 소폭 감점
  }

  // 범위 제한 (15~85) - 극단값 방지
  return Math.max(15, Math.min(85, Math.round(score)));
}

/**
 * 종합점수 산출 (기존 score-calculator.ts와 동일 공식)
 * 최고 35% + 상위2 평균 35% + 전체 평균 30%
 */
function calculateOverallScore(categoryScores: number[]): number {
  if (categoryScores.length === 0) return 0;
  const sorted = [...categoryScores].sort((a, b) => b - a);
  const max = sorted[0];
  const top2Avg = sorted.length >= 2 ? (sorted[0] + sorted[1]) / 2 : sorted[0];
  const avg = categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;
  return Math.round(max * 0.35 + top2Avg * 0.35 + avg * 0.30);
}

// ── 메인 ──

function main() {
  const db = new Database(DB_PATH);

  // 대상 날짜: 12/1~12/30 (12/31 제외)
  const dates: string[] = [];
  for (let d = 1; d <= 30; d++) {
    dates.push(`2025-12-${String(d).padStart(2, "0")}`);
  }

  // 카테고리별 전체 기간 일평균 기사 수 (기준값)
  const avgCounts: Record<CategoryKey, number> = {} as Record<CategoryKey, number>;
  for (const cat of CATEGORIES) {
    const row = db.prepare(`
      SELECT COUNT(*) * 1.0 / COUNT(DISTINCT date(published_at)) as avg_cnt
      FROM articles
      WHERE category = ? AND date(published_at) BETWEEN '2025-12-01' AND '2025-12-30'
    `).get(cat) as { avg_cnt: number };
    avgCounts[cat] = row.avg_cnt || 1;
  }

  console.log("카테고리별 일평균 기사 수:", avgCounts);

  // 기존 12/1~30 score_history 삭제 (재실행 대비)
  const deleted = db.prepare(`
    DELETE FROM score_history
    WHERE date BETWEEN '2025-12-01' AND '2025-12-30'
  `).run();
  console.log(`기존 score_history 삭제: ${deleted.changes}건`);

  // 날짜별 점수 산출 + INSERT
  const insert = db.prepare(`
    INSERT INTO score_history
      (date, overall_score, prices, employment, self_employed, finance, real_estate, run_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'baseline')
  `);

  const results: { date: string; overall: number; [k: string]: number | string }[] = [];

  const insertAll = db.transaction(() => {
    for (const date of dates) {
      const catScores: Record<CategoryKey, number> = {} as Record<CategoryKey, number>;

      for (const cat of CATEGORIES) {
        // 해당 날짜/카테고리 기사 조회
        const rows = db.prepare(`
          SELECT title, summary
          FROM articles
          WHERE category = ? AND date(published_at) = ?
        `).all(cat, date) as { title: string; summary: string | null }[];

        catScores[cat] = calculateCategoryScore(
          {
            category: cat,
            titles: rows.map((r) => r.title),
            summaries: rows.map((r) => r.summary || ""),
          },
          avgCounts[cat],
        );
      }

      const overall = calculateOverallScore(CATEGORIES.map((c) => catScores[c]));

      insert.run(
        date,
        overall,
        catScores.prices,
        catScores.employment,
        catScores.selfEmployed,
        catScores.finance,
        catScores.realEstate,
      );

      results.push({
        date,
        overall,
        prices: catScores.prices,
        employment: catScores.employment,
        selfEmployed: catScores.selfEmployed,
        finance: catScores.finance,
        realEstate: catScores.realEstate,
      });
    }
  });

  insertAll();

  // 결과 출력
  console.log("\n=== score_history 생성 완료 (12/1~30) ===\n");
  console.table(results);

  // 검증
  const count = db.prepare(
    "SELECT COUNT(*) as cnt FROM score_history WHERE date BETWEEN '2025-12-01' AND '2025-12-30'"
  ).get() as { cnt: number };
  console.log(`\n총 ${count.cnt}행 INSERT 완료`);

  db.close();
}

main();
