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

/** DB 싱글턴 반환 (읽기 전용 모드 가능) */
export function getDb(readonly = false): Database.Database {
  if (_db) return _db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH, {
    readonly,
    fileMustExist: readonly,
  });

  // WAL 모드: 읽기 성능 향상
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  return _db;
}

/** 스키마 초기화 (전처리 스크립트에서 호출) */
export function initializeSchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
  db.exec(INDEX_SQL);
  db.exec(FTS_SQL);
  db.exec(FTS_TRIGGERS_SQL);
}

/** DB 연결 해제 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** DB 파일 존재 여부 */
export function dbExists(): boolean {
  return fs.existsSync(DB_PATH);
}

export { DB_PATH };
