/**
 * SQLite DB 스키마 정의
 * 전처리된 뉴스 기사 + AI 분석 결과 + 위기 신호 저장
 */

export const SCHEMA_SQL = `
-- 정제된 뉴스 기사
CREATE TABLE IF NOT EXISTS articles (
  id                     TEXT PRIMARY KEY,
  title                  TEXT NOT NULL,
  subtitle               TEXT,
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
  image_url              TEXT,
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

-- 대시보드 집계 캐시
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
