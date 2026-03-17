/**
 * 기자의 시선 -- AI 인사이트 생성
 * 사전 계산된 통계 데이터를 Claude에 전달하여 자연어 인사이트를 생성한다.
 * 서버 전용 (API Route에서만 사용)
 */

import { callLLM } from "@/lib/api/ai-client";
import { getDb } from "@/lib/db";
import type { ReporterData, Reporter, Convergence } from "./types";

const SYSTEM_PROMPT =
  "당신은 민생 위기 분석 전문가입니다. 뉴스 기자들의 활동 패턴 데이터를 분석하여 민생 위기 신호를 해석합니다. 한국어로 답변하되, 구체적 수치를 포함하고 일반 시민이 이해할 수 있는 쉬운 표현을 사용하세요. 마크다운이나 특수문자 없이 평문으로만 답변하세요.";

// ── 1. 인사이트 배너 ──────────────────────────────────

export async function generateBannerInsight(data: ReporterData): Promise<string> {
  const surging = data.leaderboard.filter((r) => r.surgeRatio >= 2);
  const topBeat = data.beatSummary.reduce(
    (a, b) => (a.articles > b.articles ? a : b),
    data.beatSummary[0]
  );

  const user = `다음은 최근 뉴스 기자 활동 통계입니다:

분야별 기사량:
${data.beatSummary.map((b) => `- ${b.beat}: 기자 ${b.writers}명, 기사 ${b.articles}건`).join("\n")}

최다 활동 분야: ${topBeat.beat} (${topBeat.articles}건)
출고 급증 기자: ${surging.length}명 (주평균 대비 2배 이상)
교차취재 감지: ${data.convergence.length}건 (3개 이상 분야 기자가 동시 취재하는 키워드)
교차취재 주제: ${data.convergence.slice(0, 5).map((c) => c.topic).join(", ")}

위 통계를 바탕으로 현재 기자들의 활동 패턴이 시사하는 민생 위기 신호를 2-3문장으로 요약하세요.`;

  return callLLM({ system: SYSTEM_PROMPT, user, maxTokens: 300 });
}

// ── 2. 교차취재 해석 ──────────────────────────────────

export async function generateConvergenceInsights(
  convergence: Convergence[]
): Promise<{ topic: string; insight: string }[]> {
  if (convergence.length === 0) return [];

  const items = convergence.map((c) => ({
    topic: c.topic,
    beat_count: c.beat_count,
    writer_count: c.writer_count,
    article_count: c.article_count,
    beats: c.beatDistribution.map((b) => b.beat).join(", "),
  }));

  const user = `다음은 여러 분야 기자가 동시에 집중 취재하고 있는 교차취재 주제 목록입니다:

${items.map((it, i) => `${i + 1}. "${it.topic}" - ${it.beats} ${it.beat_count}개 분야, 기자 ${it.writer_count}명, 기사 ${it.article_count}건`).join("\n")}

각 교차취재 주제에 대해, 여러 분야 기자가 동시에 집중하는 것이 민생 위기 신호로서 어떤 의미인지 1문장으로 해석하세요.
반드시 아래 JSON 배열 형식으로만 답변하세요:
[{"topic": "주제명", "insight": "해석 1문장"}, ...]`;

  const raw = await callLLM({ system: SYSTEM_PROMPT, user, maxTokens: 800 });

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as { topic: string; insight: string }[];
    }
  } catch {
    // 파싱 실패 시 빈 배열
  }
  return [];
}

// ── 3. 급증 원인 분석 ─────────────────────────────────

export async function generateSurgeReasons(
  surging: Reporter[]
): Promise<{ name: string; reason: string }[]> {
  if (surging.length === 0) return [];

  const db = getDb(true);

  // 급증 기자별 최근 기사 제목 조회
  const reporterArticles = surging.map((r) => {
    const titles = db
      .prepare(
        `SELECT title FROM articles
         WHERE writer LIKE ? || '%'
         ORDER BY published_at DESC LIMIT 5`
      )
      .all(r.name) as { title: string }[];
    return {
      name: r.name,
      primaryBeat: r.primaryBeat,
      recentCount: r.recentCount,
      avgWeekly: r.avgWeekly,
      surgeRatio: r.surgeRatio,
      recentTitles: titles.map((t) => t.title),
    };
  });

  const user = `다음은 최근 기사 출고량이 급증한 기자들의 정보입니다:

${reporterArticles
  .map(
    (r, i) =>
      `${i + 1}. ${r.name} (${r.primaryBeat} 분야, 이번주 ${r.recentCount}건, 주평균 ${r.avgWeekly}건, 급증배수 x${r.surgeRatio})
   최근 기사: ${r.recentTitles.slice(0, 3).join(" / ")}`
  )
  .join("\n\n")}

각 기자의 출고 급증 원인을 1문장으로 분석하세요.
반드시 아래 JSON 배열 형식으로만 답변하세요:
[{"name": "기자명", "reason": "원인 1문장"}, ...]`;

  const raw = await callLLM({ system: SYSTEM_PROMPT, user, maxTokens: 600 });

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as { name: string; reason: string }[];
    }
  } catch {
    // 파싱 실패
  }
  return [];
}

// ── 4. 기자 프로파일 요약 ─────────────────────────────

export async function generateProfileSummaries(
  reporters: Reporter[]
): Promise<{ name: string; summary: string }[]> {
  if (reporters.length === 0) return [];

  const db = getDb(true);
  const top10 = reporters.slice(0, 10);

  const profiles = top10.map((r) => {
    const titles = db
      .prepare(
        `SELECT title FROM articles
         WHERE writer LIKE ? || '%'
         ORDER BY published_at DESC LIMIT 3`
      )
      .all(r.name) as { title: string }[];
    return {
      name: r.name,
      total: r.total,
      primaryBeat: r.primaryBeat,
      isSpecialist: r.isSpecialist,
      beatCount: r.beatCount,
      recentCount: r.recentCount,
      avgWeekly: r.avgWeekly,
      surgeRatio: r.surgeRatio,
      beats: r.beatBreakdown.map((b) => `${b.beat}(${b.count}건)`).join(", "),
      recentTitles: titles.map((t) => t.title),
    };
  });

  const user = `다음은 상위 10명 기자의 활동 프로파일입니다:

${profiles
  .map(
    (p, i) =>
      `${i + 1}. ${p.name} | 총 ${p.total}건 | ${p.isSpecialist ? p.primaryBeat + " 전문" : p.beatCount + "개 분야"} | 주평균 ${p.avgWeekly}건
   분야: ${p.beats}
   최근 기사: ${p.recentTitles.join(" / ")}`
  )
  .join("\n\n")}

각 기자의 취재 패턴과 최근 동향을 민생 위기 관점에서 1문장으로 요약하세요.
반드시 아래 JSON 배열 형식으로만 답변하세요:
[{"name": "기자명", "summary": "요약 1문장"}, ...]`;

  const raw = await callLLM({ system: SYSTEM_PROMPT, user, maxTokens: 1000 });

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as { name: string; summary: string }[];
    }
  } catch {
    // 파싱 실패
  }
  return [];
}
