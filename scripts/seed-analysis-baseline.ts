/**
 * analysis 테이블 baseline 데이터 생성 (12/1~30)
 *
 * 날짜별 카테고리별 상위 5건을 키워드 기반으로 분석하여
 * analysis 테이블에 INSERT 합니다.
 *
 * - 부정/긍정 키워드 매칭으로 risk_score 산출
 * - severity, key_factors, ai_summary 자동 생성
 * - analyzed_at = 'baseline' 으로 표식 (초기화 시 보존용)
 *
 * 실행: npx tsx scripts/seed-analysis-baseline.ts
 */

import Database from "better-sqlite3";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data/irmi.db");

type CategoryKey = "prices" | "employment" | "selfEmployed" | "finance" | "realEstate";
type Severity = "critical" | "warning" | "caution" | "safe";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "prices", label: "물가" },
  { key: "employment", label: "고용" },
  { key: "selfEmployed", label: "자영업" },
  { key: "finance", label: "금융" },
  { key: "realEstate", label: "부동산" },
];

// ── 키워드 사전 ──

const NEGATIVE_KEYWORDS: Record<CategoryKey, string[]> = {
  prices: [
    "인상", "급등", "폭등", "치솟", "비싸", "부담", "고물가",
    "인플레", "최고가", "사상최고", "역대최고", "오름세", "상승세",
    "식비 부담", "생활고", "장바구니 물가", "물가 상승", "가격 인상",
    "요금 인상", "전기료", "가스비", "난방비",
  ],
  employment: [
    "해고", "구조조정", "감원", "정리해고", "실업", "실직",
    "폐업", "퇴직", "비정규", "일자리 감소", "채용 축소",
    "고용 한파", "취업난", "실업률 상승", "고용 절벽", "임금 삭감",
    "무급휴직", "희망퇴직", "감축", "구인난",
  ],
  selfEmployed: [
    "폐업", "폐점", "영업중단", "매출 감소", "임대료 인상",
    "배달비 인상", "수수료 인상", "골목상권 위기", "자영업 위기",
    "소상공인 부담", "적자", "부도", "폐업률", "매출 부진",
    "상권 침체", "불황", "경영난",
  ],
  finance: [
    "금리 인상", "연체", "부채 증가", "가계부채", "파산",
    "채무불이행", "이자 부담", "대출 규제", "신용불량",
    "다중채무", "빚", "연체율", "부실", "하락", "폭락",
    "손실", "사기", "피싱", "불법", "환율 급등",
  ],
  realEstate: [
    "급등", "폭등", "전세 사기", "전세난", "월세 상승",
    "주거비 부담", "집값 상승", "매매가 상승", "전세가 상승",
    "청약 경쟁", "전세난민", "깡통전세", "역전세", "전세 폭등",
    "월세 부담", "임대료 인상", "주거 불안",
  ],
};

const POSITIVE_KEYWORDS: Record<CategoryKey, string[]> = {
  prices: ["인하", "내림", "동결", "안정", "하락", "할인", "지원금", "바우처"],
  employment: ["채용 확대", "일자리 창출", "고용률 상승", "신규 채용", "일자리 증가"],
  selfEmployed: ["매출 증가", "지원 확대", "임대료 인하", "소상공인 지원", "창업 지원"],
  finance: ["금리 인하", "대출 지원", "서민 금융", "채무 조정", "이자 인하"],
  realEstate: ["집값 안정", "전세 안정", "공급 확대", "분양가 인하", "주거 지원", "월세 지원"],
};

/** 비민생 패턴 (점수 대폭 하향) */
const NON_LIVELIHOOD_PATTERNS = [
  /연예|아이돌|배우|가수|시상식|콘서트/,
  /프로야구|프로축구|프로농구|e스포츠/,
  /마약|투약|필로폰|살인|폭행|성범죄/,
  /\[인사\]|\[조직\]|임원\s*인사|조직개편|승진/,
  /추천매물|MK추천|매물\]/,
];

// ── 분석 함수 ──

interface ArticleRow {
  id: string;
  title: string;
  summary: string | null;
  category: CategoryKey;
  published_at: string;
  region: string | null;
}

interface AnalysisResult {
  articleId: string;
  riskScore: number;
  severity: Severity;
  keyFactors: string[];
  impactRegion: string | null;
  aiSummary: string;
}

function analyzeArticle(article: ArticleRow): AnalysisResult {
  const cat = article.category;
  const text = `${article.title} ${article.summary || ""}`;

  // 비민생 패턴 체크
  for (const pattern of NON_LIVELIHOOD_PATTERNS) {
    if (pattern.test(text)) {
      return {
        articleId: article.id,
        riskScore: Math.floor(Math.random() * 10) + 3, // 3~12
        severity: "safe",
        keyFactors: [],
        impactRegion: null,
        aiSummary: `배정 카테고리와 직접 관련 낮음. ${article.title.slice(0, 40)}`,
      };
    }
  }

  // 부정/긍정 키워드 매칭
  let negScore = 0;
  let posScore = 0;
  const matchedFactors: string[] = [];

  for (const kw of NEGATIVE_KEYWORDS[cat]) {
    if (text.includes(kw)) {
      negScore += kw.length >= 4 ? 12 : 8; // 긴 키워드에 높은 가중치
      if (matchedFactors.length < 3) {
        // 키워드를 포함한 문맥 추출
        const idx = text.indexOf(kw);
        const start = Math.max(0, idx - 10);
        const end = Math.min(text.length, idx + kw.length + 20);
        const context = text.slice(start, end).trim();
        if (context.length > 5) matchedFactors.push(context);
      }
    }
  }

  for (const kw of POSITIVE_KEYWORDS[cat]) {
    if (text.includes(kw)) {
      posScore += kw.length >= 4 ? 10 : 6;
    }
  }

  // 점수 산출
  const netScore = negScore - posScore * 0.6;
  let riskScore = Math.round(25 + netScore * 1.5);

  // 긍정 우세면 safe 범위로 제한
  if (posScore > negScore) {
    riskScore = Math.min(riskScore, 36);
  }

  // 범위 제한 + 5의 배수 회피
  riskScore = Math.max(3, Math.min(96, riskScore));
  if (riskScore % 5 === 0) riskScore += (riskScore % 10 === 0 ? 1 : -1);

  // severity 결정
  let severity: Severity = "safe";
  if (riskScore >= 80) severity = "critical";
  else if (riskScore >= 60) severity = "warning";
  else if (riskScore >= 40) severity = "caution";

  // impact_region 추출
  const REGIONS = [
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
  ];
  let impactRegion: string | null = article.region || null;
  if (!impactRegion) {
    for (const r of REGIONS) {
      if (text.includes(r)) { impactRegion = r; break; }
    }
  }

  // ai_summary 생성 (제목 기반 + 명사형 종결)
  let summary = article.title.slice(0, 70);
  if (matchedFactors.length > 0) {
    summary = matchedFactors[0].slice(0, 70);
  }
  // 종결어미 정리
  summary = summary.replace(/[.…]+$/, "").trim();
  if (summary.length > 60) summary = summary.slice(0, 60) + "...";

  return {
    articleId: article.id,
    riskScore,
    severity,
    keyFactors: matchedFactors.slice(0, 3),
    impactRegion,
    aiSummary: summary,
  };
}

// ── 메인 ──

function main() {
  const db = new Database(DB_PATH);

  // analysis 테이블에 run_id 컬럼 추가 (없으면)
  try {
    db.prepare("ALTER TABLE analysis ADD COLUMN run_id TEXT").run();
    console.log("analysis 테이블에 run_id 컬럼 추가됨");
  } catch {
    // 이미 존재하면 무시
  }

  const dates: string[] = [];
  for (let d = 1; d <= 30; d++) {
    dates.push(`2025-12-${String(d).padStart(2, "0")}`);
  }

  // 기존 baseline 삭제 (재실행 대비)
  const deleted = db.prepare("DELETE FROM analysis WHERE run_id = 'baseline'").run();
  console.log(`기존 baseline 분석 삭제: ${deleted.changes}건`);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO analysis
      (article_id, risk_score, severity, key_factors, impact_region, ai_summary, analyzed_at, run_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'baseline')
  `);

  let totalInserted = 0;
  let totalHighRisk = 0;
  const PER_CATEGORY = 5;

  const insertAll = db.transaction(() => {
    for (const date of dates) {
      let dayInserted = 0;

      for (const cat of CATEGORIES) {
        // 해당 날짜/카테고리 기사 조회
        const articles = db.prepare(`
          SELECT id, title, summary, category, published_at, region
          FROM articles
          WHERE category = ? AND date(published_at) = ?
          ORDER BY relevance_score DESC, published_at DESC
        `).all(cat.key, date) as ArticleRow[];

        if (articles.length === 0) continue;

        // 전체 기사를 분석하여 점수 산출
        const analyzed = articles.map((a) => ({
          article: a,
          result: analyzeArticle(a),
        }));

        // risk_score 높은 순으로 상위 N건 선택
        analyzed.sort((a, b) => b.result.riskScore - a.result.riskScore);
        const topN = analyzed.slice(0, PER_CATEGORY);

        for (const { result } of topN) {
          insert.run(
            result.articleId,
            result.riskScore,
            result.severity,
            JSON.stringify(result.keyFactors),
            result.impactRegion,
            result.aiSummary,
            date, // analyzed_at = 날짜
          );
          dayInserted++;
          totalInserted++;
          if (result.severity === "critical" || result.severity === "warning") {
            totalHighRisk++;
          }
        }
      }

      if (dates.indexOf(date) % 5 === 0) {
        console.log(`${date}: ${dayInserted}건 INSERT`);
      }
    }
  });

  insertAll();

  console.log(`\n=== baseline 분석 생성 완료 ===`);
  console.log(`총 INSERT: ${totalInserted}건`);
  console.log(`고위험(critical/warning): ${totalHighRisk}건`);

  // 검증
  const stats = db.prepare(`
    SELECT severity, COUNT(*) as cnt
    FROM analysis WHERE run_id = 'baseline'
    GROUP BY severity ORDER BY cnt DESC
  `).all();
  console.log("\nseverity 분포:");
  console.table(stats);

  db.close();
}

main();
