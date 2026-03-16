/**
 * 기자의 시선 -- SQLite 기반 실시간 쿼리
 * 서버 컴포넌트 / API Route 전용
 */
import { getDb } from "@/lib/db";
import type {
  ReporterData,
  Reporter,
  Convergence,
  BeatSummary,
  BeatItem,
} from "./types";

// ── 헬퍼 ──────────────────────────────────────────────

/** writer 컬럼에서 한글 이름만 추출 */
function extractName(writer: string): string {
  const match = writer.match(/^([가-힣]+)/);
  return match ? match[1] : writer.split("(")[0].trim();
}

/** 날짜를 YYYY-MM-DD로 변환 */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 날짜가 어느 주차 버킷에 속하는지 인덱스 반환 */
function getWeekIndex(dateStr: string, weekStarts: string[]): number {
  const d = dateStr.slice(0, 10);
  for (let i = weekStarts.length - 1; i >= 0; i--) {
    if (d >= weekStarts[i]) return i;
  }
  return -1;
}

// ── beatSummary ───────────────────────────────────────

function queryBeatSummary(): BeatSummary[] {
  const db = getDb(true);
  const rows = db
    .prepare(
      `SELECT category_label AS beat,
              COUNT(DISTINCT writer) AS writers,
              COUNT(*) AS articles
       FROM articles
       WHERE writer IS NOT NULL AND writer != ''
       GROUP BY category_label`
    )
    .all() as BeatSummary[];
  return rows;
}

// ── referenceDate ─────────────────────────────────────

function queryMaxDate(): string {
  const db = getDb(true);
  const row = db
    .prepare("SELECT MAX(published_at) AS maxDate FROM articles")
    .get() as { maxDate: string };
  return row.maxDate;
}

// ── leaderboard ───────────────────────────────────────

function queryLeaderboard(maxDate: string): Reporter[] {
  const db = getDb(true);

  // 8주 윈도우 계산
  const refDate = new Date(maxDate);
  const eightWeeksAgo = new Date(refDate);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const eightWeeksAgoStr = toDateStr(eightWeeksAgo);

  const fourWeeksAgo = new Date(refDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksAgoStr = toDateStr(fourWeeksAgo);

  const oneWeekAgo = new Date(refDate);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = toDateStr(oneWeekAgo);

  // 8주 버킷 시작 날짜 (월요일 기준이 아닌 단순 7일 간격)
  const weekStarts: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i * 7);
    weekStarts.push(toDateStr(d));
  }

  // 전체 기간 기자별 주 분야 (DB에서 직접 가져옴)
  const primaryBeatRows = db
    .prepare(
      `SELECT writer, category_label, COUNT(*) as cnt
       FROM articles
       WHERE writer IS NOT NULL AND writer != ''
       GROUP BY writer, category_label
       ORDER BY writer, cnt DESC`
    )
    .all() as { writer: string; category_label: string; cnt: number }[];

  // 기자별 주 분야 맵 (전체 기간 기준)
  const writerPrimaryBeat = new Map<string, { beat: string; total: number; beatCount: number; breakdown: BeatItem[] }>();
  let currentWriter = "";
  let currentBeats: BeatItem[] = [];
  let currentTotal = 0;

  for (const row of primaryBeatRows) {
    const name = extractName(row.writer);
    if (name !== currentWriter) {
      if (currentWriter && currentBeats.length > 0) {
        writerPrimaryBeat.set(currentWriter, {
          beat: currentBeats[0].beat,
          total: currentTotal,
          beatCount: currentBeats.length,
          breakdown: [...currentBeats],
        });
      }
      currentWriter = name;
      currentBeats = [];
      currentTotal = 0;
    }
    currentBeats.push({ beat: row.category_label, count: row.cnt });
    currentTotal += row.cnt;
  }
  if (currentWriter && currentBeats.length > 0) {
    writerPrimaryBeat.set(currentWriter, {
      beat: currentBeats[0].beat,
      total: currentTotal,
      beatCount: currentBeats.length,
      breakdown: [...currentBeats],
    });
  }

  // 최근 8주 기사 가져오기
  const recentRows = db
    .prepare(
      `SELECT writer, category_label, published_at
       FROM articles
       WHERE writer IS NOT NULL AND writer != ''
         AND published_at >= ?
       ORDER BY published_at`
    )
    .all(eightWeeksAgoStr) as { writer: string; category_label: string; published_at: string }[];

  // 기자별 최근 기사 집계
  const writerRecent = new Map<string, { published_at: string }[]>();
  for (const r of recentRows) {
    const name = extractName(r.writer);
    if (!name) continue;
    let list = writerRecent.get(name);
    if (!list) {
      list = [];
      writerRecent.set(name, list);
    }
    list.push({ published_at: r.published_at });
  }

  // 4주 출고량 기준 순위
  const ranked: { name: string; fourWeekCount: number }[] = [];
  for (const [name, articles] of writerRecent) {
    const fourWeekCount = articles.filter(a => a.published_at >= fourWeeksAgoStr).length;
    ranked.push({ name, fourWeekCount });
  }
  ranked.sort((a, b) => b.fourWeekCount - a.fourWeekCount);

  const top20 = ranked.slice(0, 20);

  // Reporter 객체 생성
  const reporters: Reporter[] = [];
  for (const { name } of top20) {
    const articles = writerRecent.get(name) || [];
    const info = writerPrimaryBeat.get(name);

    // 주 분야: 전체 기간 DB 기준
    const primaryBeat = info?.beat || "기타";
    const totalAll = info?.total || articles.length;
    const beatCount = info?.beatCount || 1;
    const beatBreakdown = info?.breakdown || [{ beat: primaryBeat, count: totalAll }];
    const isSpecialist = totalAll > 0 && beatBreakdown[0].count / totalAll > 0.5;

    // 이번주 출고량
    const recentCount = articles.filter(a => a.published_at >= oneWeekAgoStr).length;

    // 8주 추이
    const weeklyTrend: number[] = new Array(8).fill(0);
    for (const a of articles) {
      const idx = getWeekIndex(a.published_at, weekStarts);
      if (idx >= 0 && idx < 8) {
        weeklyTrend[idx]++;
      }
    }

    // 주평균 (8주)
    const totalInWindow = weeklyTrend.reduce((s, v) => s + v, 0);
    const avgWeekly = totalInWindow / 8;

    // 급증 배수
    const surgeRatio = avgWeekly > 0
      ? Math.round((recentCount / avgWeekly) * 10) / 10
      : 0;

    reporters.push({
      name,
      total: totalAll,
      primaryBeat,
      isSpecialist,
      beatCount,
      recentCount,
      avgWeekly: Math.round(avgWeekly * 10) / 10,
      surgeRatio,
      weeklyTrend,
      beatBreakdown,
    });
  }

  return reporters;
}

// ── convergence ───────────────────────────────────────

function queryConvergence(maxDate: string): Convergence[] {
  const db = getDb(true);

  const twoWeeksAgo = new Date(maxDate);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = toDateStr(twoWeeksAgo);

  const rows = db
    .prepare(
      `SELECT writer, category_label, keywords
       FROM articles
       WHERE writer IS NOT NULL AND writer != ''
         AND keywords IS NOT NULL AND keywords != '' AND keywords != '[]'
         AND published_at >= ?`
    )
    .all(twoWeeksAgoStr) as {
    writer: string;
    category_label: string;
    keywords: string;
  }[];

  // keyword -> 집계
  const keywordMap = new Map<
    string,
    {
      categories: Set<string>;
      writers: Map<string, { beat: string; count: number }>;
      totalArticles: number;
      beatCounts: Map<string, number>;
    }
  >();

  for (const r of rows) {
    let keywords: string[];
    try {
      keywords = JSON.parse(r.keywords);
    } catch {
      continue;
    }
    if (!Array.isArray(keywords)) continue;

    const writerName = extractName(r.writer);

    for (const kw of keywords) {
      if (!kw || typeof kw !== "string") continue;
      const trimmed = kw.trim();
      if (!trimmed || trimmed.length < 2) continue;

      let entry = keywordMap.get(trimmed);
      if (!entry) {
        entry = {
          categories: new Set(),
          writers: new Map(),
          totalArticles: 0,
          beatCounts: new Map(),
        };
        keywordMap.set(trimmed, entry);
      }
      entry.categories.add(r.category_label);
      entry.totalArticles++;
      entry.beatCounts.set(
        r.category_label,
        (entry.beatCounts.get(r.category_label) || 0) + 1
      );

      const existing = entry.writers.get(writerName);
      if (existing) {
        existing.count++;
      } else {
        entry.writers.set(writerName, { beat: r.category_label, count: 1 });
      }
    }
  }

  // 3개 이상 카테고리에 걸친 키워드만
  const results: Convergence[] = [];
  for (const [topic, entry] of keywordMap) {
    if (entry.categories.size < 3) continue;

    const beatDistribution: BeatItem[] = [];
    for (const [beat, count] of entry.beatCounts) {
      beatDistribution.push({ beat, count });
    }
    beatDistribution.sort((a, b) => b.count - a.count);

    const writerList = Array.from(entry.writers.entries()).map(([name, info]) => ({
      name,
      beat: info.beat,
      count: info.count,
    }));
    writerList.sort((a, b) => b.count - a.count);

    results.push({
      topic,
      writer_count: entry.writers.size,
      beat_count: entry.categories.size,
      article_count: entry.totalArticles,
      beatDistribution,
      topReporters: writerList.slice(0, 3),
    });
  }

  results.sort((a, b) => b.article_count - a.article_count || b.beat_count - a.beat_count);
  return results.slice(0, 20);
}

// ── 공개 API ──────────────────────────────────────────

export function loadReporterData(): ReporterData {
  const maxDate = queryMaxDate();
  const referenceDate = maxDate ? maxDate.slice(0, 10) : new Date().toISOString().slice(0, 10);

  return {
    referenceDate,
    beatSummary: queryBeatSummary(),
    leaderboard: queryLeaderboard(referenceDate),
    convergence: queryConvergence(referenceDate),
  };
}
