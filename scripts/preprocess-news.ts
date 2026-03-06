/**
 * 뉴스 전처리 스크립트
 *
 * data/2025/{MM}/*.json → SQLite DB (data/irmi.db)
 *
 * 처리 과정:
 * 1. 카테고리 코드 기반 1차 필터 (민생 관련만)
 * 2. 키워드 기반 2차 보완 필터 (1차에서 빠진 민생 기사)
 * 3. HTML 태그 제거 + 불필요 필드 제거
 * 4. IRMI 카테고리 매핑 + 관련성 스코어링
 * 5. SQLite DB INSERT
 *
 * 실행: npx tsx scripts/preprocess-news.ts [--months 06,07,08]
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// ── 직접 import 대신 인라인 참조 (tsx 실행 시 @/ alias 미지원 대비) ──

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(PROJECT_ROOT, "data", "irmi.db");

// --data-dir 인자 또는 기본 경로
function resolveDataDir(): string {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--data-dir");
  if (idx !== -1 && args[idx + 1]) {
    return path.resolve(args[idx + 1]);
  }
  return path.join(PROJECT_ROOT, "data", "2025");
}
const DATA_DIR = resolveDataDir();

// ── 카테고리 매핑 (lib/db/category-map.ts와 동일) ──

type CategoryKey =
  | "prices"
  | "employment"
  | "selfEmployed"
  | "finance"
  | "realEstate";

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  prices: "물가",
  employment: "고용",
  selfEmployed: "자영업",
  finance: "금융",
  realEstate: "부동산",
};

const SMALL_CODE_TO_IRMI: Record<string, CategoryKey> = {
  MK100103: "prices",
  MK100106: "prices",
  MK100208: "prices",
  MK101604: "prices",
  MK101606: "prices",
  MK101601: "prices",
  MK100802: "employment",
  MK100803: "employment",
  MK700106: "employment",
  MK100401: "selfEmployed",
  MK100402: "selfEmployed",
  MK100403: "selfEmployed",
  MK100408: "selfEmployed",
  MK100105: "finance",
  MK100201: "finance",
  MK100202: "finance",
  MK100203: "finance",
  MK100204: "finance",
  MK100205: "finance",
  MK100206: "finance",
  MK100209: "finance",
  MK100501: "finance",
  MK100502: "finance",
  MK100503: "finance",
  MK100504: "finance",
  MK100505: "finance",
  MK100506: "finance",
  MK100507: "finance",
  MK100508: "finance",
  MK100509: "finance",
  MK100510: "finance",
  MK100511: "finance",
  MK100512: "finance",
  MK100513: "finance",
  MK100514: "finance",
  MK100515: "finance",
  MK100601: "realEstate",
  MK100602: "realEstate",
  MK100603: "realEstate",
  MK100604: "realEstate",
  MK100605: "realEstate",
  MK100606: "realEstate",
  MK100607: "realEstate",
  MK100609: "realEstate",
  MK100610: "realEstate",
};

const MIXED_CODES = new Set([
  "MK100101",
  "MK100102",
  "MK100807",
  "MK100809",
]);

const EXCLUDED_MIDDLE_CODES = new Set([
  "00308", "00506", "00505", "00888", "00999",
  "30001", "30002", "30003", "30004", "30005", "30006",
  "60001", "60002", "60003", "60004", "60005", "60006",
  "60007", "60008", "60009", "60010", "60011", "60012", "60013",
]);

const IRMI_KEYWORDS: Record<CategoryKey, string[]> = {
  prices: [
    "물가", "소비자물가", "식료품", "공공요금", "생활비",
    "장바구니", "인플레이션", "전기료", "가스비", "수도요금",
    "식비", "교통비", "통신비", "난방비", "유류비",
  ],
  employment: [
    "실업", "고용", "해고", "구조조정", "채용", "취업",
    "청년실업", "일자리", "퇴직", "정리해고", "실업급여",
    "고용률", "실업률", "비정규직", "최저임금",
  ],
  selfEmployed: [
    "자영업", "소상공인", "폐업", "창업", "배달앱",
    "임대료", "프랜차이즈", "소규모사업", "폐업률",
    "골목상권", "상가임대", "영세사업", "1인사업",
  ],
  finance: [
    "금리", "가계부채", "연체율", "서민금융", "대출",
    "이자", "신용", "카드빚", "연체", "파산", "채무",
    "가계대출", "신용대출", "주담대", "다중채무",
  ],
  realEstate: [
    "집값", "전세", "월세", "주거비", "아파트",
    "분양", "재건축", "전월세", "매매가", "전세사기",
    "주택가격", "부동산", "청약", "임대차", "전세보증",
  ],
};

const ALL_KEYWORDS = new Set(Object.values(IRMI_KEYWORDS).flat());

// ── 유틸리티 함수 ──

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<iframe[^>]*>/gi, "")
    .replace(/<[^>]*'>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#\d+;/g, "")
    .replace(/&\w+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategory(
  title: string,
  summary: string,
  keywords: string[]
): CategoryKey | null {
  const scores: Record<CategoryKey, number> = {
    prices: 0, employment: 0, selfEmployed: 0, finance: 0, realEstate: 0,
  };

  for (const [cat, kws] of Object.entries(IRMI_KEYWORDS)) {
    for (const kw of kws) {
      if (title.includes(kw)) scores[cat as CategoryKey] += 3;
      if (summary.includes(kw)) scores[cat as CategoryKey] += 2;
      if (keywords.some((k) => k.includes(kw)))
        scores[cat as CategoryKey] += 1;
    }
  }

  const best = Object.entries(scores).sort(
    ([, a], [, b]) => b - a
  )[0] as [CategoryKey, number];
  return best[1] > 0 ? best[0] : null;
}

function calcRelevanceScore(
  title: string,
  summary: string,
  keywords: string[]
): number {
  let score = 0;
  for (const kw of ALL_KEYWORDS) {
    if (title.includes(kw)) score += 6;
    if (summary.includes(kw)) score += 3;
    if (keywords.some((k) => k.includes(kw))) score += 2;
  }
  return Math.min(score, 100);
}

// ── 원본 JSON 파싱 ──

interface RawArticle {
  article: {
    article_id: number;
    title: string;
    sub_title: string;
    keywords: string;
    writers: string;
    lang: string;
    service_daytime: string;
    main_category: string;
    reg_dt: string;
  };
  article_body: { body: string };
  article_summary: { summary: string };
  article_url: string;
  categories: {
    code_id: string;
    code_nm: string;
    small_code_id: string;
    small_code_nm: string;
    middle_code_id: string;
    middle_code_nm: string;
    large_code_id: string;
  }[];
  keyword_list: string[];
  images: { image_url: string; image_caption: string }[];
  share: { like_count: number; reply_count: number };
}

interface ProcessedArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: CategoryKey;
  categoryLabel: string;
  originalCategoryCode: string;
  originalCategoryName: string;
  middleCategoryCode: string;
  middleCategoryName: string;
  keywords: string;
  publishedAt: string;
  region: string | null;
  url: string;
  writer: string;
  relevanceScore: number;
}

function processArticle(raw: RawArticle): ProcessedArticle | null {
  // 영문 기사 제외
  if (raw.article.lang !== "KR") return null;

  const mainCat = raw.article.main_category || "";
  const cats = raw.categories || [];
  const allSmallCodes = [
    mainCat,
    ...cats.map((c) => c.small_code_id || c.code_id),
  ].filter(Boolean);
  const middleCodes = cats.map((c) => c.middle_code_id).filter(Boolean);

  // 확실히 제외할 중분류
  const isExcluded = middleCodes.some((mc) => EXCLUDED_MIDDLE_CODES.has(mc));
  // 대분류 "6" (스타투데이) 제외
  const isStar = cats.some((c) => c.large_code_id === "6");

  // 1차: 카테고리 코드 기반 매핑
  let irmiCategory: CategoryKey | null = null;
  for (const code of allSmallCodes) {
    if (SMALL_CODE_TO_IRMI[code]) {
      irmiCategory = SMALL_CODE_TO_IRMI[code];
      break;
    }
  }

  // 복합 코드 (경제일반/정책 등) → 키워드로 카테고리 추론
  if (!irmiCategory && allSmallCodes.some((c) => MIXED_CODES.has(c))) {
    irmiCategory = inferCategory(
      raw.article.title,
      raw.article_summary?.summary || "",
      raw.keyword_list || []
    );
  }

  // 1차에서 매핑 안됨 + 확실 제외 대상 → 2차 키워드 필터
  if (!irmiCategory) {
    if (isExcluded || isStar) return null;
    // 2차: 키워드 기반 보완 필터
    irmiCategory = inferCategory(
      raw.article.title,
      raw.article_summary?.summary || "",
      raw.keyword_list || []
    );
    if (!irmiCategory) return null;
  }

  const title = raw.article.title || "";
  const summary = stripHtml(raw.article_summary?.summary || "");
  const keywordList = raw.keyword_list || [];
  const content = stripHtml(raw.article_body?.body || "");

  return {
    id: String(raw.article.article_id),
    title,
    summary,
    content,
    category: irmiCategory,
    categoryLabel: CATEGORY_LABELS[irmiCategory],
    originalCategoryCode: mainCat,
    originalCategoryName: cats[0]?.code_nm || "",
    middleCategoryCode: cats[0]?.middle_code_id || "",
    middleCategoryName: cats[0]?.middle_code_nm || "",
    keywords: JSON.stringify(keywordList),
    publishedAt: raw.article.service_daytime || raw.article.reg_dt || "",
    region: null,
    url: raw.article_url || "",
    writer: raw.article.writers || "",
    relevanceScore: calcRelevanceScore(title, summary, keywordList),
  };
}

// ── 메인 실행 ──

function main() {
  const args = process.argv.slice(2);
  let months: string[] = [];

  // --months 06,07,08 파싱
  const monthsIdx = args.indexOf("--months");
  if (monthsIdx !== -1 && args[monthsIdx + 1]) {
    months = args[monthsIdx + 1].split(",").map((m) => m.trim());
  }

  // 월 지정 없으면 존재하는 모든 월
  if (months.length === 0) {
    if (fs.existsSync(DATA_DIR)) {
      months = fs
        .readdirSync(DATA_DIR)
        .filter((d) =>
          fs.statSync(path.join(DATA_DIR, d)).isDirectory()
        )
        .sort();
    }
  }

  if (months.length === 0) {
    console.error("No data directories found in", DATA_DIR);
    process.exit(1);
  }

  console.log(`Processing months: ${months.join(", ")}`);
  console.log(`DB path: ${DB_PATH}`);

  // 기존 DB 삭제 후 새로 생성
  let dbDeleted = false;
  if (fs.existsSync(DB_PATH)) {
    try {
      fs.unlinkSync(DB_PATH);
      if (fs.existsSync(DB_PATH + "-wal")) fs.unlinkSync(DB_PATH + "-wal");
      if (fs.existsSync(DB_PATH + "-shm")) fs.unlinkSync(DB_PATH + "-shm");
      console.log("Removed existing DB");
      dbDeleted = true;
    } catch {
      console.warn("Cannot delete existing DB (locked). Will drop and recreate tables.");
    }
  } else {
    dbDeleted = true;
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  // DB가 잠겨서 삭제 못한 경우: 기존 테이블 드롭
  if (!dbDeleted) {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
    for (const { name } of tables) {
      db.exec(`DROP TABLE IF EXISTS "${name}"`);
    }
    // FTS, 트리거도 정리
    try { db.exec("DROP TABLE IF EXISTS articles_fts"); } catch {}
    console.log("Dropped all existing tables");
  }

  // 스키마 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id                     TEXT PRIMARY KEY,
      title                  TEXT NOT NULL,
      summary                TEXT,
      content                TEXT,
      category               TEXT NOT NULL,
      category_label         TEXT,
      original_category_code TEXT,
      original_category_name TEXT,
      middle_category_code   TEXT,
      middle_category_name   TEXT,
      keywords               TEXT,
      published_at           TEXT NOT NULL,
      region                 TEXT,
      url                    TEXT,
      writer                 TEXT,
      relevance_score        REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analysis (
      article_id    TEXT PRIMARY KEY REFERENCES articles(id),
      risk_score    REAL,
      severity      TEXT,
      key_factors   TEXT,
      impact_region TEXT,
      ai_summary    TEXT,
      analyzed_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS signals (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      description    TEXT,
      severity       TEXT NOT NULL,
      score          REAL,
      category       TEXT NOT NULL,
      category_label TEXT,
      region         TEXT,
      detected_at    TEXT,
      evidence       TEXT,
      cause          TEXT,
      impact         TEXT,
      action_points  TEXT
    );

    CREATE TABLE IF NOT EXISTS signal_articles (
      signal_id  TEXT NOT NULL REFERENCES signals(id),
      article_id TEXT NOT NULL REFERENCES articles(id),
      PRIMARY KEY (signal_id, article_id)
    );

    CREATE TABLE IF NOT EXISTS gov_services (
      service_id         TEXT PRIMARY KEY,
      service_name       TEXT NOT NULL,
      service_purpose    TEXT,
      support_type       TEXT,
      target_audience    TEXT,
      selection_criteria TEXT,
      support_content    TEXT,
      apply_method       TEXT,
      apply_deadline     TEXT,
      detail_url         TEXT,
      org_name           TEXT,
      dept_name          TEXT,
      contact            TEXT,
      service_field      TEXT,
      org_type           TEXT,
      reception_org      TEXT,
      view_count         INTEGER DEFAULT 0,
      registered_at      TEXT,
      modified_at        TEXT,
      synced_at          TEXT
    );

    CREATE TABLE IF NOT EXISTS assembly_petitions (
      bill_id    TEXT PRIMARY KEY,
      bill_no    TEXT,
      name       TEXT NOT NULL,
      proposer   TEXT,
      approver   TEXT,
      propose_dt TEXT,
      committee  TEXT,
      link_url   TEXT,
      synced_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS assembly_legislations (
      bill_id       TEXT PRIMARY KEY,
      bill_no       TEXT,
      name          TEXT NOT NULL,
      proposer      TEXT,
      proposer_kind TEXT,
      committee     TEXT,
      deadline_dt   TEXT,
      link_url      TEXT,
      synced_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS assembly_bills (
      bill_id       TEXT PRIMARY KEY,
      bill_no       TEXT,
      name          TEXT NOT NULL,
      kind          TEXT,
      proposer_kind TEXT,
      propose_dt    TEXT,
      result        TEXT,
      link_url      TEXT,
      synced_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS policies (
      id                TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      description       TEXT,
      provider          TEXT,
      contact           TEXT,
      url               TEXT,
      target_categories TEXT,
      target_regions    TEXT,
      related_signals   TEXT,
      eligibility       TEXT,
      benefit           TEXT
    );

    CREATE TABLE IF NOT EXISTS regions (
      id                      TEXT PRIMARY KEY,
      name                    TEXT NOT NULL,
      score                   REAL DEFAULT 0,
      trend                   TEXT,
      category_prices         REAL DEFAULT 0,
      category_employment     REAL DEFAULT 0,
      category_self_employed  REAL DEFAULT 0,
      category_finance        REAL DEFAULT 0,
      category_real_estate    REAL DEFAULT 0,
      top_issue               TEXT,
      updated_at              TEXT
    );

    CREATE TABLE IF NOT EXISTS dashboard_cache (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_articles_category    ON articles(category);
    CREATE INDEX IF NOT EXISTS idx_articles_published   ON articles(published_at);
    CREATE INDEX IF NOT EXISTS idx_articles_region      ON articles(region);
    CREATE INDEX IF NOT EXISTS idx_articles_relevance   ON articles(relevance_score DESC);
    CREATE INDEX IF NOT EXISTS idx_analysis_severity    ON analysis(severity);
    CREATE INDEX IF NOT EXISTS idx_analysis_risk_score  ON analysis(risk_score DESC);
    CREATE INDEX IF NOT EXISTS idx_signals_severity     ON signals(severity);
    CREATE INDEX IF NOT EXISTS idx_signals_category     ON signals(category);
    CREATE INDEX IF NOT EXISTS idx_signals_detected     ON signals(detected_at);
    CREATE INDEX IF NOT EXISTS idx_policies_categories  ON policies(target_categories);
    CREATE INDEX IF NOT EXISTS idx_regions_score        ON regions(score DESC);
    CREATE INDEX IF NOT EXISTS idx_gov_services_field   ON gov_services(service_field);
    CREATE INDEX IF NOT EXISTS idx_assembly_bills_dt    ON assembly_bills(propose_dt);

    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
      title, summary, keywords,
      content='articles', content_rowid='rowid',
      tokenize='unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS articles_fts_insert AFTER INSERT ON articles BEGIN
      INSERT INTO articles_fts(rowid, title, summary, keywords)
      VALUES (new.rowid, new.title, new.summary, new.keywords);
    END;

    CREATE TRIGGER IF NOT EXISTS articles_fts_delete BEFORE DELETE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, summary, keywords)
      VALUES ('delete', old.rowid, old.title, old.summary, old.keywords);
    END;

    CREATE TRIGGER IF NOT EXISTS articles_fts_update AFTER UPDATE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, summary, keywords)
      VALUES ('delete', old.rowid, old.title, old.summary, old.keywords);
      INSERT INTO articles_fts(rowid, title, summary, keywords)
      VALUES (new.rowid, new.title, new.summary, new.keywords);
    END;
  `);

  // INSERT prepared statement
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO articles
    (id, title, summary, content, category, category_label,
     original_category_code, original_category_name, middle_category_code,
     middle_category_name, keywords, published_at, region, url, writer, relevance_score)
    VALUES
    (@id, @title, @summary, @content, @category, @categoryLabel,
     @originalCategoryCode, @originalCategoryName, @middleCategoryCode,
     @middleCategoryName, @keywords, @publishedAt, @region, @url, @writer, @relevanceScore)
  `);

  // 트랜잭션 배치 INSERT
  const BATCH_SIZE = 500;

  let totalFiles = 0;
  let totalPassed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const categoryStats: Record<string, number> = {};

  const startTime = Date.now();

  for (const month of months) {
    const monthDir = path.join(DATA_DIR, month);
    if (!fs.existsSync(monthDir)) {
      console.warn(`Directory not found: ${monthDir}, skipping`);
      continue;
    }

    const files = fs.readdirSync(monthDir).filter((f) => f.endsWith(".json"));
    console.log(`\n[Month ${month}] ${files.length} files`);

    let monthPassed = 0;
    let monthSkipped = 0;
    let monthErrors = 0;
    let batch: ProcessedArticle[] = [];

    const flushBatch = () => {
      if (batch.length === 0) return;
      const tx = db.transaction(() => {
        for (const a of batch) {
          insertStmt.run(a);
        }
      });
      tx();
      batch = [];
    };

    for (let i = 0; i < files.length; i++) {
      totalFiles++;
      try {
        const filePath = path.join(monthDir, files[i]);
        const raw: RawArticle = JSON.parse(
          fs.readFileSync(filePath, "utf8")
        );
        const processed = processArticle(raw);

        if (processed) {
          batch.push(processed);
          monthPassed++;
          categoryStats[processed.category] =
            (categoryStats[processed.category] || 0) + 1;

          if (batch.length >= BATCH_SIZE) {
            flushBatch();
          }
        } else {
          monthSkipped++;
        }
      } catch {
        monthErrors++;
      }

      // 진행률 표시 (10% 단위)
      if ((i + 1) % Math.ceil(files.length / 10) === 0) {
        const pct = Math.round(((i + 1) / files.length) * 100);
        process.stdout.write(`  ${pct}%`);
      }
    }

    // 남은 배치 flush
    flushBatch();

    totalPassed += monthPassed;
    totalSkipped += monthSkipped;
    totalErrors += monthErrors;

    console.log(
      `\n  -> Passed: ${monthPassed}, Skipped: ${monthSkipped}, Errors: ${monthErrors}`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n========================================");
  console.log("Preprocessing complete!");
  console.log(`Total files:   ${totalFiles}`);
  console.log(`Passed:        ${totalPassed}`);
  console.log(`Skipped:       ${totalSkipped}`);
  console.log(`Errors:        ${totalErrors}`);
  console.log(`Pass rate:     ${((totalPassed / totalFiles) * 100).toFixed(1)}%`);
  console.log(`Time:          ${elapsed}s`);
  console.log(`DB size:       ${(fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(1)} MB`);
  console.log("\nCategory distribution:");
  for (const [cat, count] of Object.entries(categoryStats).sort(
    ([, a], [, b]) => b - a
  )) {
    console.log(`  ${CATEGORY_LABELS[cat as CategoryKey] || cat}: ${count}`);
  }
  console.log("========================================");

  db.close();
}

main();
