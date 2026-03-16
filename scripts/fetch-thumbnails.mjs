/**
 * 기사 썸네일(og:image) 배치 추출 스크립트
 *
 * Usage: node scripts/fetch-thumbnails.mjs [limit] [concurrency]
 * Example: node scripts/fetch-thumbnails.mjs 200 10
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "irmi.db");

function extractOgImage(html) {
  const pattern =
    /<meta[^>]*(?:property=["']og:image["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*property=["']og:image["'])[^>]*>/i;
  const match = html.match(pattern);
  if (!match) return null;
  const url = match[1] || match[2];
  if (!url || url.length < 10) return null;
  return url;
}

async function fetchOgImage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IRMI-Radar/1.0)",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    const headEnd = text.indexOf("</head>");
    const head = headEnd > 0 ? text.slice(0, headEnd) : text.slice(0, 8000);
    return extractOgImage(head);
  } catch {
    return null;
  }
}

async function main() {
  const limit = parseInt(process.argv[2] || "200", 10);
  const concurrency = parseInt(process.argv[3] || "10", 10);

  const db = new Database(DB_PATH);

  const articles = db
    .prepare(
      `SELECT id, url FROM articles
       WHERE url IS NOT NULL AND url != ''
         AND (thumbnail_url IS NULL OR thumbnail_url = '')
       ORDER BY published_at DESC
       LIMIT ?`
    )
    .all(limit);

  console.log(`Found ${articles.length} articles without thumbnails (limit: ${limit})`);
  if (articles.length === 0) {
    console.log("Nothing to do.");
    db.close();
    return;
  }

  const updateStmt = db.prepare("UPDATE articles SET thumbnail_url = ? WHERE id = ?");
  let success = 0;
  let failed = 0;
  let done = 0;

  for (let i = 0; i < articles.length; i += concurrency) {
    const chunk = articles.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      chunk.map(async (article) => {
        const ogImage = await fetchOgImage(article.url);
        return { id: article.id, ogImage };
      })
    );

    for (const result of results) {
      done++;
      if (result.status === "fulfilled" && result.value.ogImage) {
        updateStmt.run(result.value.ogImage, result.value.id);
        success++;
      } else {
        failed++;
      }
    }

    const pct = Math.round((done / articles.length) * 100);
    process.stdout.write(`\r[${pct}%] ${done}/${articles.length} done (${success} ok, ${failed} failed)`);
  }

  console.log(`\nComplete! ${success} thumbnails saved, ${failed} failed.`);

  const check = db.prepare("SELECT COUNT(*) as cnt FROM articles WHERE thumbnail_url IS NOT NULL AND thumbnail_url != ''").get();
  console.log(`Total articles with thumbnails: ${check.cnt}`);

  db.close();
}

main().catch(console.error);
