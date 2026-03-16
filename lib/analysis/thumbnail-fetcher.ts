/**
 * og:image 기반 썸네일 URL 추출기
 *
 * 분석된 기사의 원본 URL에서 og:image 메타태그를 추출하여
 * articles.thumbnail_url에 저장한다.
 */

import { getDb } from "@/lib/db/index";

/** og:image 메타태그에서 URL 추출 */
function extractOgImage(html: string): string | null {
  // property="og:image" content="..." 또는 content="..." property="og:image"
  const pattern =
    /<meta[^>]*(?:property=["']og:image["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*property=["']og:image["'])[^>]*>/i;
  const match = html.match(pattern);
  if (!match) return null;
  const url = match[1] || match[2];
  if (!url || url.length < 10) return null;
  return url;
}

/** 단일 URL에서 og:image 추출 (타임아웃 3초) */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IRMI-Radar/1.0; +https://irmi.kr)",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    // <head> 영역만 읽어서 파싱 (전체 HTML 불필요)
    const text = await res.text();
    const headEnd = text.indexOf("</head>");
    const head = headEnd > 0 ? text.slice(0, headEnd) : text.slice(0, 8000);

    return extractOgImage(head);
  } catch {
    return null;
  }
}

interface ArticleForThumbnail {
  id: string;
  url: string;
}

/**
 * 썸네일 미보유 기사 목록 조회
 * (url이 있고 thumbnail_url이 NULL인 기사)
 */
export function getArticlesWithoutThumbnail(limit = 200): ArticleForThumbnail[] {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT id, url FROM articles
       WHERE url IS NOT NULL AND url != ''
         AND thumbnail_url IS NULL
       LIMIT ?`
    )
    .all(limit) as ArticleForThumbnail[];
}

/**
 * 배치 썸네일 추출 + DB 저장
 * @param concurrency 동시 요청 수 (기본: 5)
 * @returns 성공 건수
 */
export async function fetchAndSaveThumbnails(
  articles: ArticleForThumbnail[],
  concurrency = 5,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  if (articles.length === 0) return 0;

  const db = getDb();
  const updateStmt = db.prepare(
    "UPDATE articles SET thumbnail_url = ? WHERE id = ?"
  );

  let successCount = 0;
  let doneCount = 0;

  // 청크 단위로 병렬 처리
  for (let i = 0; i < articles.length; i += concurrency) {
    const chunk = articles.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      chunk.map(async (article) => {
        const ogImage = await fetchOgImage(article.url);
        return { id: article.id, ogImage };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.ogImage) {
        updateStmt.run(result.value.ogImage, result.value.id);
        successCount++;
      }
      doneCount++;
    }

    onProgress?.(doneCount, articles.length);
  }

  return successCount;
}
