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
  relevance_score        REAL DEFAULT 0
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

-- 위기 신호
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

-- 신호-기사 관계 (N:M)
CREATE TABLE IF NOT EXISTS signal_articles (
  signal_id  TEXT NOT NULL REFERENCES signals(id),
  article_id TEXT NOT NULL REFERENCES articles(id),
  PRIMARY KEY (signal_id, article_id)
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

-- 지역별 위기 현황 (17개 시도)
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

-- 대시보드 집계 캐시 (dashboard, briefing, crisis_chain, chat 등 싱글턴 데이터 저장)
CREATE TABLE IF NOT EXISTS dashboard_cache (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT
);
`;

export const INDEX_SQL = `
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
