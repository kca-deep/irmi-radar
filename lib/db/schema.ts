/**
 * SQLite DB 스키마 정의
 * 전처리된 뉴스 기사 + AI 분석 결과 + 위기 신호 저장
 */

export const SCHEMA_SQL = `
-- 정제된 뉴스 기사 (IRMI 5대 카테고리 해당 기사만)
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
  relevance_score        REAL DEFAULT 0,
  thumbnail_url          TEXT,
  thumbnail_caption      TEXT,
  like_count             INTEGER DEFAULT 0,
  reply_count            INTEGER DEFAULT 0
);

-- AI 분석 결과 (기사 1:1)
CREATE TABLE IF NOT EXISTS analysis (
  article_id    TEXT PRIMARY KEY REFERENCES articles(id),
  risk_score    REAL,
  severity      TEXT,
  key_factors   TEXT,
  impact_region TEXT,
  ai_summary    TEXT,
  analyzed_at   TEXT
);

-- 분석 회차 마스터 (모든 분석 결과의 앵커)
CREATE TABLE IF NOT EXISTS analysis_runs (
  id                TEXT PRIMARY KEY,
  run_date          TEXT NOT NULL,
  started_at        TEXT NOT NULL,
  completed_at      TEXT,
  status            TEXT DEFAULT 'running',
  overall_score     REAL,
  overall_severity  TEXT,
  summary           TEXT,
  prices            REAL DEFAULT 0,
  employment        REAL DEFAULT 0,
  self_employed     REAL DEFAULT 0,
  finance           REAL DEFAULT 0,
  real_estate       REAL DEFAULT 0,
  articles_total    INTEGER DEFAULT 0,
  articles_analyzed INTEGER DEFAULT 0,
  token_usage       TEXT,
  config            TEXT
);

-- 위기 신호 (run_id별 이력 보존)
CREATE TABLE IF NOT EXISTS signals (
  id             TEXT NOT NULL,
  run_id         TEXT NOT NULL DEFAULT '__legacy__',
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
  action_points  TEXT,
  PRIMARY KEY (id, run_id)
);

-- 신호-기사 관계 (N:M, run_id 포함)
CREATE TABLE IF NOT EXISTS signal_articles (
  signal_id  TEXT NOT NULL,
  run_id     TEXT NOT NULL DEFAULT '__legacy__',
  article_id TEXT NOT NULL REFERENCES articles(id),
  PRIMARY KEY (signal_id, run_id, article_id)
);

-- 보조금24 공공서비스
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

-- 국회 청원 계류현황
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

-- 국회 진행중 입법예고
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

-- 국회 의안 접수목록
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

-- 지원 정책
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

-- 지역별 위기 현황 (run_id별 이력 보존)
CREATE TABLE IF NOT EXISTS regions (
  run_id                  TEXT NOT NULL DEFAULT '__legacy__',
  id                      TEXT NOT NULL,
  name                    TEXT NOT NULL,
  score                   REAL DEFAULT 0,
  trend                   TEXT,
  category_prices         REAL DEFAULT 0,
  category_employment     REAL DEFAULT 0,
  category_self_employed  REAL DEFAULT 0,
  category_finance        REAL DEFAULT 0,
  category_real_estate    REAL DEFAULT 0,
  top_issue               TEXT,
  updated_at              TEXT,
  PRIMARY KEY (run_id, id)
);

-- 대시보드 집계 캐시 (레거시 호환용 유지)
CREATE TABLE IF NOT EXISTS dashboard_cache (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT
);

-- 대시보드 스냅샷 (run_id별 이력 보존)
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  run_id    TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  data      TEXT NOT NULL,
  PRIMARY KEY (run_id, cache_key)
);

-- 카테고리별 상세 이력 (run_id별)
CREATE TABLE IF NOT EXISTS category_details (
  run_id        TEXT NOT NULL,
  category      TEXT NOT NULL,
  score         REAL NOT NULL DEFAULT 0,
  trend         TEXT DEFAULT 'stable',
  article_count INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  warning_count  INTEGER DEFAULT 0,
  key_issues    TEXT,
  top_keywords  TEXT,
  PRIMARY KEY (run_id, category)
);

-- 점수 히스토리 (일별 종합/카테고리 점수 시계열)
CREATE TABLE IF NOT EXISTS score_history (
  date           TEXT PRIMARY KEY,
  overall_score  REAL NOT NULL,
  prices         REAL DEFAULT 0,
  employment     REAL DEFAULT 0,
  self_employed  REAL DEFAULT 0,
  finance        REAL DEFAULT 0,
  real_estate    REAL DEFAULT 0,
  run_id         TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- 기자 통계 캐시 (레거시 호환용 유지)
CREATE TABLE IF NOT EXISTS reporter_cache (
  cache_key   TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  computed_at TEXT NOT NULL
);

-- 기자 프로파일 (middle_category_name 기준 분류)
CREATE TABLE IF NOT EXISTS reporter_profiles (
  writer         TEXT PRIMARY KEY,
  total_articles INTEGER DEFAULT 0,
  primary_beat   TEXT,
  is_specialist  INTEGER DEFAULT 0,
  beat_count     INTEGER DEFAULT 1,
  recent_count   INTEGER DEFAULT 0,
  avg_weekly     REAL DEFAULT 0,
  surge_ratio    REAL DEFAULT 0,
  rank_4week     INTEGER,
  surge_reason   TEXT,
  ai_profile     TEXT,
  computed_at    TEXT NOT NULL
);

-- 기자별 분야 비중 (middle_category_name 기준)
CREATE TABLE IF NOT EXISTS reporter_beats (
  writer TEXT NOT NULL,
  beat   TEXT NOT NULL,
  count  INTEGER DEFAULT 0,
  PRIMARY KEY (writer, beat)
);

-- 기자별 8주 출고 추이
CREATE TABLE IF NOT EXISTS reporter_weekly_trend (
  writer     TEXT NOT NULL,
  week_index INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  count      INTEGER DEFAULT 0,
  PRIMARY KEY (writer, week_index)
);

-- 교차취재 감지 (middle_category_name 기준)
CREATE TABLE IF NOT EXISTS reporter_convergence (
  topic             TEXT PRIMARY KEY,
  writer_count      INTEGER DEFAULT 0,
  beat_count        INTEGER DEFAULT 0,
  article_count     INTEGER DEFAULT 0,
  beat_distribution TEXT,
  top_reporters     TEXT,
  ai_insight        TEXT,
  top_article_title TEXT
);

-- 분야별 요약 (middle_category_name 기준)
CREATE TABLE IF NOT EXISTS reporter_beat_summary (
  beat     TEXT PRIMARY KEY,
  writers  INTEGER DEFAULT 0,
  articles INTEGER DEFAULT 0
);

-- 기자 분석 메타 정보
CREATE TABLE IF NOT EXISTS reporter_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 기사 댓글 (원본 매경 댓글 데이터)
CREATE TABLE IF NOT EXISTS article_comments (
  comment_id  INTEGER PRIMARY KEY,
  article_id  TEXT NOT NULL REFERENCES articles(id),
  parent_id   INTEGER DEFAULT 0,
  author      TEXT,
  content     TEXT,
  like_count  INTEGER DEFAULT 0,
  hate_count  INTEGER DEFAULT 0,
  created_at  TEXT
);
`;

export const INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_articles_category    ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published   ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_region      ON articles(region);
CREATE INDEX IF NOT EXISTS idx_articles_relevance   ON articles(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_severity    ON analysis(severity);
CREATE INDEX IF NOT EXISTS idx_analysis_risk_score  ON analysis(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_signals_run_id       ON signals(run_id);
CREATE INDEX IF NOT EXISTS idx_signals_severity     ON signals(severity);
CREATE INDEX IF NOT EXISTS idx_signals_category     ON signals(category);
CREATE INDEX IF NOT EXISTS idx_signals_detected     ON signals(detected_at);
CREATE INDEX IF NOT EXISTS idx_policies_categories  ON policies(target_categories);
CREATE INDEX IF NOT EXISTS idx_regions_run_id       ON regions(run_id);
CREATE INDEX IF NOT EXISTS idx_regions_score        ON regions(score DESC);
CREATE INDEX IF NOT EXISTS idx_gov_services_field   ON gov_services(service_field);
CREATE INDEX IF NOT EXISTS idx_assembly_bills_dt    ON assembly_bills(propose_dt);
CREATE INDEX IF NOT EXISTS idx_score_history_date   ON score_history(date);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_date   ON analysis_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_status ON analysis_runs(status);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_run ON dashboard_snapshots(run_id);
CREATE INDEX IF NOT EXISTS idx_category_details_run ON category_details(run_id);
CREATE INDEX IF NOT EXISTS idx_comments_article     ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent      ON article_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created     ON article_comments(created_at);

-- 복합 인덱스: 대시보드 쿼리 최적화 (emerging issues, daily stats)
CREATE INDEX IF NOT EXISTS idx_articles_pubdate_cat       ON articles(published_at, category);
CREATE INDEX IF NOT EXISTS idx_articles_cat_pubdate       ON articles(category, published_at);
CREATE INDEX IF NOT EXISTS idx_articles_catcode_cat_pub   ON articles(original_category_code, category, published_at);
CREATE INDEX IF NOT EXISTS idx_analysis_article_id        ON analysis(article_id);
`;

export const FTS_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title,
  summary,
  keywords,
  content='articles',
  content_rowid='rowid',
  tokenize='unicode61'
);
`;

/** FTS 트리거: articles INSERT 시 자동 인덱싱 */
export const FTS_TRIGGERS_SQL = `
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
`;
