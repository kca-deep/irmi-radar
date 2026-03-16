/**
 * SQLite DB 싱글턴 + 초기화
 * better-sqlite3 기반, 서버 컴포넌트 / API Route 전용
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { SCHEMA_SQL, INDEX_SQL, FTS_SQL, FTS_TRIGGERS_SQL } from "./schema";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "irmi.db");

let _db: Database.Database | null = null;
let _dbReadonly = false;

/** DB 싱글턴 반환 (읽기 전용 모드 가능) */
export function getDb(readonly = false): Database.Database {
  // readwrite 요청인데 현재 readonly로 열려있으면 재연결
  if (_db && _dbReadonly && !readonly) {
    _db.close();
    _db = null;
  }

  if (_db) return _db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH, {
    readonly,
    fileMustExist: readonly,
  });
  _dbReadonly = readonly;

  // WAL 모드: 읽기 성능 향상
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  return _db;
}

/** articles 테이블에 thumbnail_url 컬럼 추가 (없으면) */
function migrateThumbnailColumn(db: Database.Database): void {
  const cols = db.pragma("table_info(articles)") as { name: string }[];
  const hasCol = cols.some((c) => c.name === "thumbnail_url");
  if (!hasCol) {
    db.exec("ALTER TABLE articles ADD COLUMN thumbnail_url TEXT");
    console.log("[DB] articles.thumbnail_url 컬럼 추가");
  }
}

/** articles 테이블에 댓글/썸네일 관련 컬럼 추가 (없으면) */
function migrateCommentsColumns(db: Database.Database): void {
  const cols = db.pragma("table_info(articles)") as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has("thumbnail_caption")) {
    db.exec("ALTER TABLE articles ADD COLUMN thumbnail_caption TEXT");
    console.log("[DB] articles.thumbnail_caption 컬럼 추가");
  }
  if (!colNames.has("like_count")) {
    db.exec("ALTER TABLE articles ADD COLUMN like_count INTEGER DEFAULT 0");
    console.log("[DB] articles.like_count 컬럼 추가");
  }
  if (!colNames.has("reply_count")) {
    db.exec("ALTER TABLE articles ADD COLUMN reply_count INTEGER DEFAULT 0");
    console.log("[DB] articles.reply_count 컬럼 추가");
  }
}

/**
 * 분석 결과 테이블을 run_id 기반 새 스키마로 재생성
 *
 * 보존 대상 (스키마 변경 없음):
 *   articles, analysis, gov_services, assembly_*, policies, articles_fts
 *
 * 재생성 대상 (PK/스키마 변경됨):
 *   signals, signal_articles, regions,
 *   dashboard_cache, score_history
 *
 * 신규 생성:
 *   analysis_runs, dashboard_snapshots, category_details
 */
function migrateToRunIdSchema(db: Database.Database): void {
  const hasRunsTable = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='analysis_runs'"
  ).get();

  if (hasRunsTable) return; // 이미 마이그레이션됨

  console.log("[DB] run_id 기반 스키마로 마이그레이션 시작...");
  console.log("[DB] articles, analysis 테이블은 보존됩니다.");

  // 분석 결과 테이블 DROP (articles, analysis 제외)
  const tablesToDrop = [
    "signal_articles",
    "signals",
    "regions",
    "dashboard_cache",
    "score_history",
  ];

  for (const table of tablesToDrop) {
    const exists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(table);
    if (exists) {
      db.exec(`DROP TABLE IF EXISTS ${table};`);
      console.log(`[DB] DROP TABLE ${table}`);
    }
  }

  // 관련 인덱스도 정리 (테이블 DROP 시 자동 삭제되지만 명시적 정리)
  const indexesToDrop = [
    "idx_signals_severity",
    "idx_signals_category",
    "idx_signals_detected",
    "idx_regions_score",
    "idx_score_history_date",
  ];

  for (const idx of indexesToDrop) {
    db.exec(`DROP INDEX IF EXISTS ${idx};`);
  }

  console.log("[DB] 기존 분석 결과 테이블 삭제 완료. 새 스키마를 적용합니다.");
}

/** 스키마 초기화 (전처리 스크립트에서 호출) */
export function initializeSchema(db: Database.Database): void {
  // 1. 기존 분석 결과 테이블 DROP (articles/analysis 보존)
  migrateToRunIdSchema(db);

  // 2. 새 스키마 적용 (CREATE IF NOT EXISTS)
  db.exec(SCHEMA_SQL);
  db.exec(INDEX_SQL);
  db.exec(FTS_SQL);
  db.exec(FTS_TRIGGERS_SQL);

  // 3. thumbnail_url 컬럼 마이그레이션
  migrateThumbnailColumn(db);

  // 4. 댓글/썸네일 캡션/반응 통계 컬럼 마이그레이션
  migrateCommentsColumns(db);
}

/** DB 연결 해제 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
    _dbReadonly = false;
  }
}

/** DB 파일 존재 여부 */
export function dbExists(): boolean {
  return fs.existsSync(DB_PATH);
}

export { DB_PATH };
