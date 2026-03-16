/**
 * 댓글/썸네일/반응 통계 마이그레이션 스크립트
 *
 * 기존 irmi.db를 보존하면서 원본 JSON에서 누락된 데이터를 적재:
 *   - images[0] -> articles.thumbnail_url, articles.thumbnail_caption
 *   - share -> articles.like_count, articles.reply_count
 *   - comments[] -> article_comments 테이블
 *
 * 실행:
 *   npx tsx scripts/migrate-comments-thumbnails.ts --data-dir "C:/path/to/2025"
 *
 * 옵션:
 *   --data-dir <path>   원본 JSON 디렉토리 (기본: data/2025)
 *   --dry-run           실제 DB 변경 없이 통계만 출력
 *   --skip-backup       DB 백업 건너뛰기
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(PROJECT_ROOT, "data", "irmi.db");

// ── CLI 인자 파싱 ──

function parseArgs() {
  const args = process.argv.slice(2);
  let dataDir = path.join(PROJECT_ROOT, "data", "2025");
  let dryRun = false;
  let skipBackup = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data-dir" && args[i + 1]) {
      dataDir = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--skip-backup") {
      skipBackup = true;
    }
  }

  return { dataDir, dryRun, skipBackup };
}

// ── 스키마 마이그레이션 ──

function migrateSchema(db: Database.Database): void {
  const cols = db.pragma("table_info(articles)") as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has("thumbnail_caption")) {
    db.exec("ALTER TABLE articles ADD COLUMN thumbnail_caption TEXT");
    console.log("  [SCHEMA] articles.thumbnail_caption 추가");
  }
  if (!colNames.has("like_count")) {
    db.exec("ALTER TABLE articles ADD COLUMN like_count INTEGER DEFAULT 0");
    console.log("  [SCHEMA] articles.like_count 추가");
  }
  if (!colNames.has("reply_count")) {
    db.exec("ALTER TABLE articles ADD COLUMN reply_count INTEGER DEFAULT 0");
    console.log("  [SCHEMA] articles.reply_count 추가");
  }

  // article_comments 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS article_comments (
      comment_id  INTEGER PRIMARY KEY,
      article_id  TEXT NOT NULL REFERENCES articles(id),
      parent_id   INTEGER DEFAULT 0,
      author      TEXT,
      content     TEXT,
      like_count  INTEGER DEFAULT 0,
      hate_count  INTEGER DEFAULT 0,
      created_at  TEXT
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_comments_article ON article_comments(article_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_comments_parent  ON article_comments(parent_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_comments_created ON article_comments(created_at)");
  console.log("  [SCHEMA] article_comments 테이블 준비 완료");
}

// ── 원본 JSON 인터페이스 ──

interface RawJson {
  article: {
    article_id: number;
  };
  images?: { image_url: string; image_caption: string }[];
  share?: { like_count: number; reply_count: number };
  comments?: {
    comment_id: number;
    parent_id: number;
    author: string;
    content: string;
    like_count: number;
    hate_count: number;
    created_at: string;
  }[];
}

// ── 메인 ──

function main() {
  const { dataDir, dryRun, skipBackup } = parseArgs();

  console.log("========================================");
  console.log("댓글/썸네일/반응 통계 마이그레이션");
  console.log("========================================");
  console.log(`DB 경로: ${DB_PATH}`);
  console.log(`원본 데이터: ${dataDir}`);
  console.log(`모드: ${dryRun ? "DRY RUN (DB 변경 없음)" : "실행"}`);
  console.log();

  if (!fs.existsSync(DB_PATH)) {
    console.error("DB 파일이 존재하지 않습니다:", DB_PATH);
    process.exit(1);
  }

  if (!fs.existsSync(dataDir)) {
    console.error("원본 데이터 디렉토리가 존재하지 않습니다:", dataDir);
    process.exit(1);
  }

  // DB 백업
  if (!dryRun && !skipBackup) {
    const backupPath = DB_PATH + ".bak";
    console.log(`[BACKUP] ${backupPath}`);
    fs.copyFileSync(DB_PATH, backupPath);
    // WAL/SHM 파일도 백업
    if (fs.existsSync(DB_PATH + "-wal")) {
      fs.copyFileSync(DB_PATH + "-wal", backupPath + "-wal");
    }
    if (fs.existsSync(DB_PATH + "-shm")) {
      fs.copyFileSync(DB_PATH + "-shm", backupPath + "-shm");
    }
    console.log("  백업 완료\n");
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  // 1. 스키마 마이그레이션
  console.log("[1/4] 스키마 마이그레이션");
  if (!dryRun) {
    migrateSchema(db);
  } else {
    console.log("  (dry-run: 건너뜀)");
  }
  console.log();

  // 2. 기존 articles ID 로드 (매칭용)
  console.log("[2/4] 기존 articles ID 로드");
  const articleIds = new Set<string>();
  const rows = db.prepare("SELECT id FROM articles").all() as { id: string }[];
  for (const r of rows) articleIds.add(r.id);
  console.log(`  ${articleIds.size}건 로드 완료\n`);

  // 3. 원본 JSON 스캔 + 데이터 적재
  console.log("[3/4] 원본 JSON 스캔 및 데이터 적재");

  const months = fs
    .readdirSync(dataDir)
    .filter((d) => fs.statSync(path.join(dataDir, d)).isDirectory())
    .sort();

  // prepared statements
  const updateArticle = dryRun
    ? null
    : db.prepare(`
        UPDATE articles
        SET thumbnail_url = COALESCE(?, thumbnail_url),
            thumbnail_caption = ?,
            like_count = ?,
            reply_count = ?
        WHERE id = ?
      `);

  const insertComment = dryRun
    ? null
    : db.prepare(`
        INSERT OR IGNORE INTO article_comments
          (comment_id, article_id, parent_id, author, content, like_count, hate_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

  let totalScanned = 0;
  let totalMatched = 0;
  let totalThumbnails = 0;
  let totalComments = 0;
  let totalWithLikes = 0;
  let totalErrors = 0;

  const BATCH_SIZE = 500;
  const startTime = Date.now();

  for (const month of months) {
    const monthDir = path.join(dataDir, month);
    const files = fs.readdirSync(monthDir).filter((f) => f.endsWith(".json"));

    let monthMatched = 0;
    let monthComments = 0;
    let batchOps: (() => void)[] = [];

    const flushBatch = () => {
      if (batchOps.length === 0) return;
      if (!dryRun) {
        const tx = db.transaction(() => {
          for (const op of batchOps) op();
        });
        tx();
      }
      batchOps = [];
    };

    for (let i = 0; i < files.length; i++) {
      totalScanned++;
      try {
        const filePath = path.join(monthDir, files[i]);
        const raw: RawJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const articleId = String(raw.article.article_id);

        if (!articleIds.has(articleId)) continue;

        monthMatched++;
        totalMatched++;

        const images = raw.images || [];
        const share = raw.share || { like_count: 0, reply_count: 0 };
        const comments = raw.comments || [];

        // 썸네일
        const thumbUrl = images.length > 0 ? images[0].image_url : null;
        const thumbCaption = images.length > 0 ? images[0].image_caption : null;
        if (thumbUrl) totalThumbnails++;
        if (share.like_count > 0) totalWithLikes++;

        // articles UPDATE
        batchOps.push(() => {
          updateArticle!.run(
            thumbUrl,
            thumbCaption,
            share.like_count,
            share.reply_count,
            articleId,
          );
        });

        // comments INSERT
        for (const c of comments) {
          monthComments++;
          totalComments++;
          batchOps.push(() => {
            insertComment!.run(
              c.comment_id,
              articleId,
              c.parent_id,
              c.author,
              c.content,
              c.like_count,
              c.hate_count,
              c.created_at,
            );
          });
        }

        if (batchOps.length >= BATCH_SIZE) {
          flushBatch();
        }
      } catch {
        totalErrors++;
      }

      // 진행률 (10% 단위)
      if ((i + 1) % Math.ceil(files.length / 10) === 0) {
        const pct = Math.round(((i + 1) / files.length) * 100);
        process.stdout.write(`  [${month}] ${pct}%`);
      }
    }

    // 남은 배치 flush
    flushBatch();

    console.log(
      `\n  [${month}] 매칭: ${monthMatched}건, 댓글: ${monthComments}건`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // 4. 검증
  console.log("\n[4/4] 검증");

  if (!dryRun) {
    const thumbCount = (
      db.prepare("SELECT COUNT(*) as c FROM articles WHERE thumbnail_url IS NOT NULL").get() as { c: number }
    ).c;
    const likeCount = (
      db.prepare("SELECT COUNT(*) as c FROM articles WHERE like_count > 0").get() as { c: number }
    ).c;
    const commentCount = (
      db.prepare("SELECT COUNT(*) as c FROM article_comments").get() as { c: number }
    ).c;
    const commentArticles = (
      db.prepare("SELECT COUNT(DISTINCT article_id) as c FROM article_comments").get() as { c: number }
    ).c;
    const replyComments = (
      db.prepare("SELECT COUNT(*) as c FROM article_comments WHERE parent_id != comment_id").get() as { c: number }
    ).c;
    const orphanComments = (
      db.prepare(
        "SELECT COUNT(*) as c FROM article_comments WHERE article_id NOT IN (SELECT id FROM articles)"
      ).get() as { c: number }
    ).c;

    console.log(`  thumbnail_url NOT NULL: ${thumbCount}건`);
    console.log(`  like_count > 0: ${likeCount}건`);
    console.log(`  article_comments: ${commentCount}건`);
    console.log(`  댓글 있는 기사: ${commentArticles}건`);
    console.log(`  대댓글: ${replyComments}건`);
    console.log(`  FK 무결성 위반: ${orphanComments}건`);
  }

  // DB 크기
  const dbSize = (fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(1);

  console.log("\n========================================");
  console.log("마이그레이션 완료!");
  console.log(`스캔 파일:       ${totalScanned}건`);
  console.log(`매칭된 기사:     ${totalMatched}건`);
  console.log(`썸네일 적재:     ${totalThumbnails}건`);
  console.log(`좋아요 있는 기사: ${totalWithLikes}건`);
  console.log(`댓글 적재:       ${totalComments}건`);
  console.log(`에러:            ${totalErrors}건`);
  console.log(`소요 시간:       ${elapsed}초`);
  console.log(`DB 크기:         ${dbSize} MB`);
  if (dryRun) {
    console.log("\n(DRY RUN - 실제 DB 변경 없음)");
  }
  console.log("========================================");

  db.close();
}

main();
