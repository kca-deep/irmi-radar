/**
 * 기자의 시선 -- RDB 테이블 기반 기자 분석 데이터 로더
 * 서버 컴포넌트 / API Route 전용
 *
 * reporter_profiles / reporter_beats / reporter_weekly_trend /
 * reporter_convergence / reporter_beat_summary / reporter_meta
 * 테이블에서 읽어 ReporterData를 조립한다.
 */
import { getDb } from "@/lib/db";
import type {
  ReporterData,
  Reporter,
  Convergence,
  BeatSummary,
  BeatItem,
} from "./types";

// ── 공개 API ──────────────────────────────────────────

export function loadReporterData(): ReporterData {
  const db = getDb(true);

  // RDB 테이블 존재 확인
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reporter_profiles'")
    .get();

  if (!tableExists) {
    return {
      referenceDate: new Date().toISOString().slice(0, 10),
      leaderboard: [],
      convergence: [],
      beatSummary: [],
    };
  }

  // meta
  const metaRows = db
    .prepare("SELECT key, value FROM reporter_meta")
    .all() as { key: string; value: string }[];
  const meta = new Map(metaRows.map((r) => [r.key, r.value]));

  const referenceDate = meta.get("reference_date") || new Date().toISOString().slice(0, 10);
  const weeklyRatio = meta.get("weekly_ratio") ? Number(meta.get("weekly_ratio")) : undefined;
  const aiSummary = meta.get("ai_summary") || undefined;
  const aiAnalyzedAt = meta.get("ai_analyzed_at") || undefined;

  // beatSummary
  const beatSummary = db
    .prepare("SELECT beat, writers, articles FROM reporter_beat_summary ORDER BY articles DESC")
    .all() as BeatSummary[];

  // leaderboard (Top 20)
  const profiles = db
    .prepare(
      `SELECT writer, total_articles, primary_beat, is_specialist, beat_count,
              recent_count, avg_weekly, surge_ratio, rank_4week, surge_reason, ai_profile
       FROM reporter_profiles
       WHERE rank_4week IS NOT NULL
       ORDER BY rank_4week ASC LIMIT 20`
    )
    .all() as {
    writer: string; total_articles: number; primary_beat: string;
    is_specialist: number; beat_count: number; recent_count: number;
    avg_weekly: number; surge_ratio: number; rank_4week: number;
    surge_reason: string | null; ai_profile: string | null;
  }[];

  // N+1 쿼리 배치화: 20명 x 2쿼리 = 40개 → 2개 배치 쿼리로 전환
  const writers = profiles.map((p) => p.writer);
  const placeholders = writers.map(() => "?").join(",");

  // beats 일괄 조회
  const allBeats = db
    .prepare(`SELECT writer, beat, count FROM reporter_beats WHERE writer IN (${placeholders}) ORDER BY writer, count DESC`)
    .all(...writers) as (BeatItem & { writer: string })[];
  const beatsMap = new Map<string, BeatItem[]>();
  for (const b of allBeats) {
    if (!beatsMap.has(b.writer)) beatsMap.set(b.writer, []);
    beatsMap.get(b.writer)!.push({ beat: b.beat, count: b.count });
  }

  // weekly trend 일괄 조회
  const allTrends = db
    .prepare(`SELECT writer, week_index, count FROM reporter_weekly_trend WHERE writer IN (${placeholders}) ORDER BY writer, week_index ASC`)
    .all(...writers) as { writer: string; week_index: number; count: number }[];
  const trendsMap = new Map<string, { week_index: number; count: number }[]>();
  for (const t of allTrends) {
    if (!trendsMap.has(t.writer)) trendsMap.set(t.writer, []);
    trendsMap.get(t.writer)!.push({ week_index: t.week_index, count: t.count });
  }

  const leaderboard: Reporter[] = profiles.map((p) => {
    const beats = beatsMap.get(p.writer) || [];

    const trends = trendsMap.get(p.writer) || [];
    const weeklyTrend = new Array(8).fill(0);
    for (const t of trends) {
      if (t.week_index >= 0 && t.week_index < 8) weeklyTrend[t.week_index] = t.count;
    }

    return {
      name: p.writer,
      total: p.total_articles,
      primaryBeat: p.primary_beat,
      isSpecialist: p.is_specialist === 1,
      beatCount: p.beat_count,
      recentCount: p.recent_count,
      avgWeekly: p.avg_weekly,
      surgeRatio: p.surge_ratio,
      weeklyTrend,
      beatBreakdown: beats,
      ...(p.surge_reason ? { surgeReason: p.surge_reason } : {}),
      ...(p.ai_profile ? { aiProfileSummary: p.ai_profile } : {}),
    };
  });

  // convergence
  const convRows = db
    .prepare(
      `SELECT topic, writer_count, beat_count, article_count,
              beat_distribution, top_reporters, ai_insight, top_article_title
       FROM reporter_convergence
       ORDER BY article_count DESC LIMIT 20`
    )
    .all() as {
    topic: string; writer_count: number; beat_count: number;
    article_count: number; beat_distribution: string;
    top_reporters: string; ai_insight: string | null;
    top_article_title: string | null;
  }[];

  const convergence: Convergence[] = convRows.map((c) => ({
    topic: c.topic,
    writer_count: c.writer_count,
    beat_count: c.beat_count,
    article_count: c.article_count,
    beatDistribution: JSON.parse(c.beat_distribution || "[]") as BeatItem[],
    topReporters: JSON.parse(c.top_reporters || "[]") as { name: string; beat: string; count: number }[],
    ...(c.ai_insight ? { aiInsight: c.ai_insight } : {}),
    ...(c.top_article_title ? { topArticleTitle: c.top_article_title } : {}),
  }));

  return {
    referenceDate,
    leaderboard,
    convergence,
    beatSummary,
    ...(weeklyRatio !== undefined ? { weeklyRatio } : {}),
    ...(aiSummary ? { aiSummary } : {}),
    ...(aiAnalyzedAt ? { aiAnalyzedAt } : {}),
  };
}
